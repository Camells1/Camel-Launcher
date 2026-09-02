'use strict';

// Auto-update wiring for Camel Launcher.
//
// Flow: a few seconds after the window has loaded we quietly ask the update
// feed whether a newer build exists. If one does, electron-updater downloads it
// while we forward progress to the renderer (which draws a loading bar), then we
// relaunch into the freshly installed version.
//
// Everything here is best-effort. There is no real update server yet (see the
// placeholder feed URL in package.json -> build.publish), so the normal case
// today is "check fails, log it, carry on". Nothing in this file may ever throw
// into the app's startup path or show error UI to the user.

const { ipcMain } = require('electron');

// Wait a bit after the UI is up so an update check never competes with startup.
const STARTUP_CHECK_DELAY_MS = 5000;
// How long "Update ready - restarting..." stays on screen before we relaunch.
const RESTART_DELAY_MS = 1500;

let updater = null;
let targetWindow = null;
let eventsWired = false;
let restarting = false;

function log(...args) {
  console.log('[updater]', ...args);
}

function logError(...args) {
  console.error('[updater]', ...args);
}

function getUpdater() {
  if (updater) return updater;
  try {
    updater = require('electron-updater').autoUpdater;
  } catch (err) {
    logError('electron-updater is unavailable, auto-updates are disabled:', err && err.message);
    return null;
  }

  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.logger = { info: log, warn: log, error: logError, debug: () => {} };

  // Escape hatch for testing against a local/static file server before real
  // hosting exists: CAMEL_UPDATE_FEED_URL=http://localhost:8080/ npm start
  const overrideUrl = process.env.CAMEL_UPDATE_FEED_URL;
  if (overrideUrl) {
    try {
      updater.setFeedURL({ provider: 'generic', url: overrideUrl });
      log('using feed URL override:', overrideUrl);
    } catch (err) {
      logError('ignoring bad CAMEL_UPDATE_FEED_URL:', err && err.message);
    }
  }

  return updater;
}

function send(channel, payload) {
  const win = targetWindow;
  if (!win || win.isDestroyed()) return;
  const contents = win.webContents;
  if (!contents || contents.isDestroyed()) return;
  try {
    contents.send(channel, payload);
  } catch {
    // Window went away mid-send; nothing to do.
  }
}

function sendStatus(state, extra) {
  send('update:status', { state, ...(extra || {}) });
}

function scheduleRestart(version) {
  if (restarting) return;
  restarting = true;
  setTimeout(() => {
    try {
      log('restarting to install', version || 'update');
      // (isSilent, isForceRunAfter): run the NSIS installer with /S so the user
      // sees no installer UI, and --force-run so we come back up automatically.
      updater.quitAndInstall(true, true);
    } catch (err) {
      restarting = false;
      logError('quitAndInstall failed:', err && err.message);
    }
  }, RESTART_DELAY_MS);
}

function wireEvents(up) {
  if (eventsWired) return;
  eventsWired = true;

  up.on('checking-for-update', () => {
    log('checking for updates...');
    sendStatus('checking');
  });

  up.on('update-available', (info) => {
    log('update available:', info && info.version);
    sendStatus('available', { version: info && info.version });
  });

  up.on('update-not-available', (info) => {
    log('already up to date', info && info.version ? `(${info.version})` : '');
    sendStatus('none');
  });

  up.on('download-progress', (p) => {
    send('update:progress', {
      percent: typeof p.percent === 'number' ? p.percent : 0,
      transferred: p.transferred || 0,
      total: p.total || 0,
      bytesPerSecond: p.bytesPerSecond || 0,
    });
  });

  up.on('update-downloaded', (info) => {
    const version = info && info.version;
    log('update downloaded:', version);
    sendStatus('ready', { version });
    scheduleRestart(version);
  });

  up.on('error', (err) => {
    // Expected until a real update feed exists. Log only - never surface this.
    logError('update check/download failed (harmless if no feed is hosted yet):', err && err.message ? err.message : err);
    sendStatus('error', { message: err && err.message ? err.message : String(err) });
  });
}

/**
 * Ask the feed whether an update exists. Always resolves - never rejects.
 * Returns a plain, IPC-serializable summary.
 */
async function checkForUpdates() {
  // The portable .exe has nothing to update in place - running the downloaded
  // NSIS installer would quietly convert it into an installed app, which is not
  // what someone running a portable build asked for. electron-builder sets this
  // env var only in portable builds.
  if (process.env.PORTABLE_EXECUTABLE_FILE) {
    log('portable build - skipping update check');
    sendStatus('none');
    return { ok: true, updateAvailable: false, skipped: true, reason: 'portable build' };
  }

  const up = getUpdater();
  if (!up) return { ok: false, reason: 'electron-updater unavailable' };

  wireEvents(up);

  try {
    const result = await up.checkForUpdates();
    if (!result) {
      // Unpacked dev run, or the updater is otherwise inactive.
      log('update check skipped (app is not packaged)');
      sendStatus('none');
      return { ok: true, updateAvailable: false, skipped: true };
    }
    const version = result.updateInfo && result.updateInfo.version;
    return { ok: true, updateAvailable: Boolean(result.downloadPromise), version };
  } catch (err) {
    logError('update check failed (harmless if no feed is hosted yet):', err && err.message ? err.message : err);
    sendStatus('error', { message: err && err.message ? err.message : String(err) });
    return { ok: false, reason: err && err.message ? err.message : String(err) };
  }
}

/**
 * Register update IPC and kick off one silent check shortly after the UI loads.
 * Safe to call once from app startup; failures here never break the app.
 */
function initAutoUpdater(win) {
  targetWindow = win;

  try {
    ipcMain.handle('update:check', async () => checkForUpdates());
  } catch (err) {
    logError('could not register update:check IPC:', err && err.message);
  }

  const start = () => setTimeout(() => { checkForUpdates(); }, STARTUP_CHECK_DELAY_MS);

  try {
    if (win.webContents.isLoading()) win.webContents.once('did-finish-load', start);
    else start();
  } catch (err) {
    logError('could not schedule the startup update check:', err && err.message);
  }
}

module.exports = { initAutoUpdater, checkForUpdates };
