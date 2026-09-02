const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('Camel Launcher');

const { createStores, JsonStore } = require('./src/store');
const { AuthManager } = require('./src/auth');
const { InstanceManager } = require('./src/instances');
const { GameLauncher } = require('./src/launcher');
const modrinth = require('./src/modrinth');
const worlds = require('./src/worlds');
const screenshots = require('./src/screenshots');
const servers = require('./src/servers');
const crashReports = require('./src/crashReports');
const modpack = require('./src/modpack');
const skins = require('./src/skins');
const { initAutoUpdater } = require('./src/updater');

const STARTER_MODS = [
  { slug: 'fabric-api', title: 'Fabric API' },
  { slug: 'sodium', title: 'Sodium (performance)' },
  { slug: 'lithium', title: 'Lithium (performance)' },
  { slug: 'modmenu', title: 'Mod Menu' },
  { slug: 'iris', title: 'Iris (shaders)' },
];

let mainWindow;
let stores;
let authManager;
let instances;
let gameProcess = null;
let playingInstanceId = null;
let launchStartedAt = 0;

function requireInstance(id) {
  const inst = instances.get(id);
  if (!inst) throw new Error('Instance not found.');
  return inst;
}

function launcherFor(id) {
  return new GameLauncher(instances.folder(id));
}

function modsMetaStore(id) {
  return new JsonStore(instances.modsMetaPath(id), { installed: [] });
}

// The renderer only ever needs to display who's signed in - it never needs
// the live Xbox/Minecraft tokens, so those never cross the IPC boundary.
function toPublicAccount(account) {
  if (!account) return null;
  return { name: account.name, uuid: account.uuid };
}

// A project's install directory depends on its type; resource packs and
// shaders don't get xmcl's ready-made `.mods` getter, so we make the folder
// ourselves the first time something is installed into it.
function destDirFor(instanceId, projectType) {
  const launcher = launcherFor(instanceId);
  if (projectType === 'resourcepack') return launcher.folder.resourcepacks;
  if (projectType === 'shader') return path.join(instances.folder(instanceId), 'shaderpacks');
  return launcher.modsDir;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#1b120a',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

// ---- Mod installation (with required-dependency auto-resolution) ----

async function installProject(instanceId, project, { projectType = 'mod', visited = new Set() } = {}) {
  const inst = requireInstance(instanceId);
  const dir = destDirFor(instanceId, projectType);
  const projectId = project.id || project.slug;
  if (visited.has(projectId)) return [];
  visited.add(projectId);

  const file = await modrinth.installMod(projectId, inst.mcVersion, dir, { projectType });
  let iconUrl = project.iconUrl;
  let title = project.title;
  if (!iconUrl) {
    try {
      const full = await modrinth.getProject(projectId);
      iconUrl = full.iconUrl;
      title = title || full.title;
    } catch {
      // best effort only; missing icon isn't fatal
    }
  }

  const store = modsMetaStore(instanceId);
  const metadata = store.get('installed') || [];
  const entry = { filename: file.filename, title: title || file.filename, projectId, iconUrl, projectType };
  store.set('installed', [...metadata.filter((m) => m.filename !== file.filename), entry]);

  const installedIds = new Set(metadata.map((m) => m.projectId));
  const installedDeps = [];
  if (projectType === 'mod') {
    for (const depId of file.dependencies || []) {
      if (installedIds.has(depId) || visited.has(depId)) continue;
      try {
        const depInstalled = await installProject(instanceId, { id: depId }, { projectType: 'mod', visited });
        installedDeps.push(...depInstalled);
      } catch (err) {
        console.error(`Could not auto-install required dependency ${depId}:`, err.message);
      }
    }
  }

  return [entry, ...installedDeps];
}

function registerIpc() {
  ipcMain.handle('auth:get', async () => {
    const restored = await authManager.restore();
    return toPublicAccount(restored || authManager.getSavedAccount());
  });

  ipcMain.handle('auth:login', async () => toPublicAccount(await authManager.login(mainWindow)));

  ipcMain.handle('auth:logout', async () => {
    authManager.logout();
    return null;
  });

  ipcMain.handle('accounts:list', async () => {
    const activeUuid = authManager.getActiveUuid();
    return authManager.getAccounts().map((a) => ({ name: a.name, uuid: a.uuid, active: a.uuid === activeUuid }));
  });

  ipcMain.handle('accounts:switch', async (_e, uuid) => toPublicAccount(await authManager.switchAccount(uuid)));

  ipcMain.handle('accounts:remove', async (_e, uuid) => {
    authManager.removeAccount(uuid);
    return toPublicAccount(authManager.getSavedAccount());
  });

  ipcMain.handle('accounts:addAnother', async () => toPublicAccount(await authManager.login(mainWindow)));

  ipcMain.handle('settings:get', async () => {
    return { ...stores.settings.getAll(), starterMods: STARTER_MODS };
  });

  ipcMain.handle('settings:set', async (_e, patch) => {
    stores.settings.setAll(patch);
    return stores.settings.getAll();
  });

  ipcMain.handle('instances:list', async () => instances.list());

  ipcMain.handle('instances:create', async (_e, { name, mcVersion }) => {
    return instances.create({ name, mcVersion, loader: 'fabric' });
  });

  ipcMain.handle('instances:rename', async (_e, id, name) => instances.rename(id, name));
  ipcMain.handle('instances:update', async (_e, id, patch) => instances.update(id, patch));

  ipcMain.handle('instances:remove', async (_e, id, opts) => {
    if (gameProcess && playingInstanceId === id) throw new Error('Stop the game before deleting this instance.');
    instances.remove(id, opts);
    return true;
  });

  // Home page "Jump in": the most recently played instances + saved servers, merged.
  ipcMain.handle('activity:recent', async (_e, limit = 6) => {
    const items = [];
    for (const inst of instances.list()) {
      if (inst.lastPlayedAt) {
        items.push({ type: 'instance', instanceId: inst.id, name: inst.name, subtitle: `Fabric · ${inst.mcVersion}`, lastPlayedAt: inst.lastPlayedAt });
      }
      for (const server of servers.listServers(instances.folder(inst.id))) {
        if (server.lastPlayedAt) {
          items.push({
            type: 'server',
            instanceId: inst.id,
            serverId: server.id,
            name: server.name,
            subtitle: `${inst.name} · ${server.address}`,
            lastPlayedAt: server.lastPlayedAt,
          });
        }
      }
    }
    items.sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
    return items.slice(0, limit);
  });

  // ---- Skins ----
  ipcMain.handle('skin:get', async () => {
    const account = authManager.getSavedAccount();
    if (!account) throw new Error('Not signed in.');
    const profile = await skins.getProfile(account.accessToken);
    return { skins: profile.skins || [], capes: profile.capes || [] };
  });

  ipcMain.handle('skin:upload', async (_e, variant) => {
    const account = authManager.getSavedAccount();
    if (!account) throw new Error('Not signed in.');
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose a skin',
      filters: [{ name: 'PNG image', extensions: ['png'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths.length) return { canceled: true };
    const profile = await skins.uploadSkin(account.accessToken, filePaths[0], variant);
    return { canceled: false, skins: profile.skins || [] };
  });

  ipcMain.handle('skin:setFromUrl', async (_e, url, variant) => {
    const account = authManager.getSavedAccount();
    if (!account) throw new Error('Not signed in.');
    const profile = await skins.setSkinFromUrl(account.accessToken, url, variant);
    return { skins: profile.skins || [] };
  });

  ipcMain.handle('skin:reset', async () => {
    const account = authManager.getSavedAccount();
    if (!account) throw new Error('Not signed in.');
    await skins.resetSkin(account.accessToken);
    return true;
  });

  ipcMain.handle('mods:search', async (_e, instanceId, query, opts) => {
    const inst = requireInstance(instanceId);
    return modrinth.searchMods(query, inst.mcVersion, opts);
  });

  ipcMain.handle('mods:list', async (_e, instanceId) => {
    requireInstance(instanceId);
    const dir = launcherFor(instanceId).modsDir;
    let files = [];
    try {
      files = fs.readdirSync(dir).filter((f) => f.endsWith('.jar') || f.endsWith('.jar.disabled'));
    } catch {
      files = [];
    }
    const metadata = modsMetaStore(instanceId).get('installed') || [];
    return files.map((filename) => {
      const enabled = !filename.endsWith('.disabled');
      const baseName = enabled ? filename : filename.slice(0, -'.disabled'.length);
      const meta = metadata.find((m) => m.filename === baseName);
      return { ...(meta || { filename: baseName, title: baseName.replace(/\.jar$/, '') }), filename, enabled };
    });
  });

  ipcMain.handle('mods:install', async (_e, instanceId, project, opts) => {
    return installProject(instanceId, project, opts);
  });

  ipcMain.handle('mods:remove', async (_e, instanceId, filename) => {
    const dir = launcherFor(instanceId).modsDir;
    modrinth.removeMod(filename, dir);
    const store = modsMetaStore(instanceId);
    const metadata = store.get('installed') || [];
    const baseName = filename.replace(/\.disabled$/, '');
    store.set('installed', metadata.filter((m) => m.filename !== baseName));
    return true;
  });

  ipcMain.handle('mods:toggle', async (_e, instanceId, filename) => {
    const dir = launcherFor(instanceId).modsDir;
    const isDisabled = filename.endsWith('.disabled');
    const target = isDisabled ? filename.slice(0, -'.disabled'.length) : `${filename}.disabled`;
    fs.renameSync(path.join(dir, filename), path.join(dir, target));
    return { filename: target, enabled: !isDisabled };
  });

  ipcMain.handle('mods:updateAll', async (_e, instanceId) => {
    const inst = requireInstance(instanceId);
    const dir = launcherFor(instanceId).modsDir;
    const store = modsMetaStore(instanceId);
    const metadata = store.get('installed') || [];
    let updated = 0;
    for (const entry of metadata) {
      if (!entry.projectId) continue;
      const best = await modrinth.getBestVersionFile(entry.projectId, inst.mcVersion, { projectType: entry.projectType });
      if (!best || best.filename === entry.filename) continue;
      modrinth.removeMod(entry.filename, dir);
      modrinth.removeMod(`${entry.filename}.disabled`, dir);
      await modrinth.downloadFile(best.url, path.join(dir, best.filename));
      entry.filename = best.filename;
      updated++;
    }
    store.set('installed', metadata);
    return { updated };
  });

  // Checks (without downloading) how many installed mods have a newer build.
  ipcMain.handle('mods:checkUpdates', async (_e, instanceId) => {
    const inst = requireInstance(instanceId);
    const metadata = modsMetaStore(instanceId).get('installed') || [];
    let updatable = 0;
    for (const entry of metadata) {
      if (!entry.projectId) continue;
      try {
        const best = await modrinth.getBestVersionFile(entry.projectId, inst.mcVersion, { projectType: entry.projectType });
        if (best && best.filename !== entry.filename) updatable++;
      } catch {
        // treat lookup failures as "nothing to report" rather than an error
      }
    }
    return { updatable };
  });

  // ---- Worlds ----
  ipcMain.handle('worlds:list', async (_e, instanceId) => worlds.listWorlds(instances.folder(instanceId)));
  ipcMain.handle('worlds:delete', async (_e, instanceId, name) => {
    worlds.deleteWorld(instances.folder(instanceId), name);
    return true;
  });
  ipcMain.handle('worlds:openFolder', async (_e, instanceId, name) => {
    await shell.openPath(worlds.worldFolder(instances.folder(instanceId), name));
  });

  // ---- Screenshots ----
  ipcMain.handle('screenshots:list', async (_e, instanceId) => {
    return screenshots.listScreenshots(instances.folder(instanceId)).map((s) => ({ name: s.name, url: `file://${s.path.replace(/\\/g, '/')}` }));
  });
  ipcMain.handle('screenshots:delete', async (_e, instanceId, name) => {
    screenshots.deleteScreenshot(instances.folder(instanceId), name);
    return true;
  });
  ipcMain.handle('screenshots:openFolder', async (_e, instanceId) => {
    await shell.openPath(screenshots.screenshotFolder(instances.folder(instanceId)));
  });

  // ---- Servers ----
  ipcMain.handle('servers:list', async (_e, instanceId) => servers.listServers(instances.folder(instanceId)));
  ipcMain.handle('servers:add', async (_e, instanceId, entry) => servers.addServer(instances.folder(instanceId), entry));
  ipcMain.handle('servers:remove', async (_e, instanceId, id) => {
    servers.removeServer(instances.folder(instanceId), id);
    return true;
  });

  // ---- Modpack export/import ----
  ipcMain.handle('modpack:export', async (_e, instanceId) => {
    const inst = requireInstance(instanceId);
    const installedMods = modsMetaStore(instanceId).get('installed') || [];
    const manifestData = modpack.buildManifest(inst, installedMods);
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export modpack',
      defaultPath: `${inst.name.replace(/[\\/:*?"<>|]/g, '_')}.camelpack.json`,
      filters: [{ name: 'Camel Launcher modpack', extensions: ['json'] }],
    });
    if (canceled || !filePath) return { canceled: true };
    fs.writeFileSync(filePath, JSON.stringify(manifestData, null, 2));
    return { canceled: false, filePath };
  });

  ipcMain.handle('modpack:import', async (_e, instanceId) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Import modpack',
      filters: [{ name: 'Camel Launcher modpack', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths.length) return { canceled: true };
    const manifestData = modpack.parseManifest(fs.readFileSync(filePaths[0], 'utf-8'));
    const results = { installed: 0, failed: [] };
    for (const mod of manifestData.mods) {
      try {
        await installProject(instanceId, { id: mod.projectId, title: mod.title }, { projectType: 'mod' });
        results.installed++;
      } catch (err) {
        results.failed.push({ title: mod.title, reason: err.message });
      }
    }
    return { canceled: false, ...results };
  });

  ipcMain.handle('game:play', async (_e, instanceId, serverId) => {
    if (gameProcess) throw new Error('The game is already running.');
    const inst = requireInstance(instanceId);
    const account = authManager.getSavedAccount();
    if (!account) throw new Error('Not signed in.');

    const settings = { ...stores.settings.getAll(), ...inst };
    const send = (msg) => mainWindow.webContents.send('game:progress', { instanceId, msg });
    const launcher = launcherFor(instanceId);

    let server;
    if (serverId) {
      const found = servers.listServers(instances.folder(instanceId)).find((s) => s.id === serverId);
      if (found) server = servers.parseAddress(found.address);
    }

    const resolved = await launcher.ensureInstalled(inst.mcVersion, send);
    send('Launching...');
    launchStartedAt = Date.now();
    const child = await launcher.launchGame(resolved, account, settings, server);
    gameProcess = child;
    playingInstanceId = instanceId;
    instances.touch(instanceId);
    if (serverId) servers.touchServer(instances.folder(instanceId), serverId);

    child.stdout.on('data', (d) => mainWindow.webContents.send('game:log', { instanceId, line: d.toString() }));
    child.stderr.on('data', (d) => mainWindow.webContents.send('game:log', { instanceId, line: d.toString() }));
    child.on('exit', (code, signal) => {
      gameProcess = null;
      playingInstanceId = null;
      let crash = null;
      if (code) {
        const report = crashReports.findLatestCrashReport(instances.folder(instanceId), launchStartedAt);
        if (report) crash = crashReports.summarizeCrashReport(report.path);
      }
      mainWindow.webContents.send('game:exit', { instanceId, code, signal, crash });
    });
    child.on('error', (err) => {
      gameProcess = null;
      playingInstanceId = null;
      mainWindow.webContents.send('game:exit', { instanceId, code: -1, signal: null, error: err.message });
    });

    return true;
  });

  ipcMain.handle('game:stop', async () => {
    if (gameProcess) gameProcess.kill();
    return true;
  });

  ipcMain.handle('shell:openExternal', async (_e, url) => {
    if (/^https:\/\//.test(url)) await shell.openExternal(url);
  });

  ipcMain.handle('shell:openPath', async (_e, targetPath) => {
    await shell.openPath(targetPath);
  });
}

app.whenReady().then(() => {
  const userDataPath = app.getPath('userData');
  stores = createStores(userDataPath);
  authManager = new AuthManager(stores.account);
  instances = new InstanceManager(userDataPath);

  registerIpc();
  createWindow();
  initAutoUpdater(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (gameProcess) gameProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});
