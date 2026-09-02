const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('Camel Launcher');

const { createStores, JsonStore } = require('./src/store');
const { AuthManager } = require('./src/auth');
const { InstanceManager } = require('./src/instances');
const { GameLauncher } = require('./src/launcher');
const modrinth = require('./src/modrinth');

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

function registerIpc() {
  ipcMain.handle('auth:get', async () => {
    const restored = await authManager.restore();
    return restored || authManager.getSavedAccount();
  });

  ipcMain.handle('auth:login', async () => {
    return authManager.login(mainWindow);
  });

  ipcMain.handle('auth:logout', async () => {
    authManager.logout();
    return null;
  });

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

  ipcMain.handle('instances:remove', async (_e, id, opts) => {
    if (gameProcess && playingInstanceId === id) throw new Error('Stop the game before deleting this instance.');
    instances.remove(id, opts);
    return true;
  });

  ipcMain.handle('mods:search', async (_e, instanceId, query, opts) => {
    const inst = requireInstance(instanceId);
    return modrinth.searchMods(query, inst.mcVersion, opts);
  });

  ipcMain.handle('mods:list', async (_e, instanceId) => {
    const inst = requireInstance(instanceId);
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

  ipcMain.handle('mods:install', async (_e, instanceId, project) => {
    const inst = requireInstance(instanceId);
    const dir = launcherFor(instanceId).modsDir;
    const file = await modrinth.installMod(project.slug || project.id, inst.mcVersion, dir);
    let iconUrl = project.iconUrl;
    let title = project.title;
    if (!iconUrl) {
      try {
        const full = await modrinth.getProject(project.slug || project.id);
        iconUrl = full.iconUrl;
        title = title || full.title;
      } catch {
        // best effort only; missing icon isn't fatal
      }
    }
    const store = modsMetaStore(instanceId);
    const metadata = store.get('installed') || [];
    const entry = { filename: file.filename, title: title || file.filename, projectId: project.id || project.slug, iconUrl };
    store.set('installed', [...metadata.filter((m) => m.filename !== file.filename), entry]);
    return entry;
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
      const best = await modrinth.getBestVersionFile(entry.projectId, inst.mcVersion);
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

  ipcMain.handle('game:play', async (_e, instanceId) => {
    if (gameProcess) throw new Error('The game is already running.');
    const inst = requireInstance(instanceId);
    const account = authManager.getSavedAccount();
    if (!account) throw new Error('Not signed in.');

    const settings = stores.settings.getAll();
    const send = (msg) => mainWindow.webContents.send('game:progress', { instanceId, msg });
    const launcher = launcherFor(instanceId);

    const resolved = await launcher.ensureInstalled(inst.mcVersion, send);
    send('Launching...');
    const child = await launcher.launchGame(resolved, account, settings);
    gameProcess = child;
    playingInstanceId = instanceId;

    child.stdout.on('data', (d) => mainWindow.webContents.send('game:log', { instanceId, line: d.toString() }));
    child.stderr.on('data', (d) => mainWindow.webContents.send('game:log', { instanceId, line: d.toString() }));
    child.on('exit', (code, signal) => {
      gameProcess = null;
      playingInstanceId = null;
      mainWindow.webContents.send('game:exit', { instanceId, code, signal });
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
}

app.whenReady().then(() => {
  const userDataPath = app.getPath('userData');
  stores = createStores(userDataPath);
  authManager = new AuthManager(stores.account);
  instances = new InstanceManager(userDataPath);

  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (gameProcess) gameProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});
