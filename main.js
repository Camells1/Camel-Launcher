const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('Camel Launcher');

const { createStores, JsonStore } = require('./src/store');
const { AuthManager } = require('./src/auth');
const { InstanceManager } = require('./src/instances');
const { GameLauncher, LOADERS, loaderLabel, normalizeLoader } = require('./src/launcher');
const modrinth = require('./src/modrinth');
const modpackDiscovery = require('./src/modpackDiscovery');
const modrinthAppImport = require('./src/modrinthAppImport');
const worlds = require('./src/worlds');
const screenshots = require('./src/screenshots');
const servers = require('./src/servers');
const crashReports = require('./src/crashReports');
const modpack = require('./src/modpack');
const skins = require('./src/skins');
const { initAutoUpdater } = require('./src/updater');

// "Quick add" chips. `loaders` is what each project actually publishes for on
// Modrinth, so a Forge instance isn't offered a one-click button that can only
// ever fail. Forge has no overlap with this list and simply gets no chips.
const STARTER_MODS = [
  { slug: 'fabric-api', title: 'Fabric API', loaders: ['fabric'] },
  { slug: 'sodium', title: 'Sodium (performance)', loaders: ['fabric', 'neoforge', 'quilt'] },
  { slug: 'lithium', title: 'Lithium (performance)', loaders: ['fabric', 'neoforge', 'quilt'] },
  { slug: 'modmenu', title: 'Mod Menu', loaders: ['fabric', 'quilt'] },
  { slug: 'iris', title: 'Iris (shaders)', loaders: ['fabric', 'neoforge', 'quilt'] },
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
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  const sendState = () => mainWindow.webContents.send('window:state', { maximized: mainWindow.isMaximized() });
  mainWindow.on('maximize', sendState);
  mainWindow.on('unmaximize', sendState);
}

// ---- Mod installation (with required-dependency auto-resolution) ----

async function installProject(instanceId, project, { projectType = 'mod', visited = new Set() } = {}) {
  const inst = requireInstance(instanceId);
  const dir = destDirFor(instanceId, projectType);
  const projectId = project.id || project.slug;
  if (visited.has(projectId)) return [];
  visited.add(projectId);

  // Mods have to match the instance's own loader; resource packs and shaders
  // ignore the loader entirely (modrinth.js decides which applies).
  const loader = normalizeLoader(inst.loader);
  const file = await modrinth.installMod(projectId, inst.mcVersion, dir, { projectType, loader });
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
    if ('alwaysOnTop' in patch) mainWindow.setAlwaysOnTop(!!patch.alwaysOnTop);
    return stores.settings.getAll();
  });

  ipcMain.handle('instances:list', async () => instances.list());

  ipcMain.handle('instances:create', async (_e, { name, mcVersion, loader }) => {
    // Fabric stays the fallback for anything that doesn't name a loader, so a
    // renderer that forgets the field can't silently produce vanilla instances.
    return instances.create({ name, mcVersion, loader: normalizeLoader(loader || 'fabric') });
  });

  ipcMain.handle('instances:rename', async (_e, id, name) => instances.rename(id, name));
  ipcMain.handle('instances:update', async (_e, id, patch) => instances.update(id, patch));

  // ---- Custom instance icons ----
  // The picked file is copied into the instance folder, so the icon survives
  // the user moving or deleting whatever they originally selected.
  ipcMain.handle('instances:setIcon', async (_e, id) => {
    requireInstance(id);
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose an instance icon',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths.length) return { canceled: true };
    return { canceled: false, instance: instances.setIcon(id, filePaths[0]) };
  });

  ipcMain.handle('instances:clearIcon', async (_e, id) => instances.clearIcon(id));

  ipcMain.handle('instances:duplicate', async (_e, id, name) => {
    if (gameProcess && playingInstanceId === id) throw new Error('Stop the game before duplicating this instance.');
    return instances.duplicate(id, name);
  });

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
        items.push({ type: 'instance', instanceId: inst.id, name: inst.name, subtitle: `${loaderLabel(normalizeLoader(inst.loader))} · ${inst.mcVersion}`, lastPlayedAt: inst.lastPlayedAt });
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
    return { uuid: account.uuid, skins: profile.skins || [], capes: profile.capes || [] };
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
    return modrinth.searchMods(query, inst.mcVersion, { ...opts, loader: normalizeLoader(inst.loader) });
  });

  // The loader list the New Instance picker renders, so the UI never has to
  // keep its own copy of what src/launcher.js can actually install.
  ipcMain.handle('loaders:list', async () => LOADERS);

  // Mods and resource packs live in separate folders on disk but show up as
  // one unified list in the Content tab, so every handler that acts on a
  // single file needs to know which folder actually holds it.
  function dirForContentFile(instanceId, filename) {
    const launcher = launcherFor(instanceId);
    if (fs.existsSync(path.join(launcher.modsDir, filename))) return launcher.modsDir;
    return launcher.folder.resourcepacks;
  }

  function listContentDir(dir, projectType, extensions, metadata) {
    let files = [];
    try {
      files = fs.readdirSync(dir).filter((f) => extensions.some((ext) => f.endsWith(ext) || f.endsWith(`${ext}.disabled`)));
    } catch {
      files = [];
    }
    return files.map((filename) => {
      const enabled = !filename.endsWith('.disabled');
      const baseName = enabled ? filename : filename.slice(0, -'.disabled'.length);
      const meta = metadata.find((m) => m.filename === baseName);
      return { ...(meta || { filename: baseName, title: baseName.replace(/\.(jar|zip)$/, '') }), filename, enabled, projectType };
    });
  }

  ipcMain.handle('mods:list', async (_e, instanceId) => {
    const launcher = launcherFor(instanceId);
    const metadata = modsMetaStore(instanceId).get('installed') || [];
    return [
      ...listContentDir(launcher.modsDir, 'mod', ['.jar'], metadata),
      ...listContentDir(launcher.folder.resourcepacks, 'resourcepack', ['.zip'], metadata),
    ];
  });

  ipcMain.handle('mods:install', async (_e, instanceId, project, opts) => {
    return installProject(instanceId, project, opts);
  });

  // Drops arbitrary local files straight into the mods folder - for anything
  // that isn't on Modrinth (a friend's private build, a jar off a forum post).
  ipcMain.handle('mods:uploadFiles', async (_e, instanceId) => {
    requireInstance(instanceId);
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Add mod files',
      filters: [{ name: 'Mod/resource pack files', extensions: ['jar', 'zip'] }],
      properties: ['openFile', 'multiSelections'],
    });
    if (canceled || !filePaths.length) return { canceled: true, added: 0 };
    const launcher = launcherFor(instanceId);
    let added = 0;
    for (const src of filePaths) {
      const destDir = src.toLowerCase().endsWith('.zip') ? launcher.folder.resourcepacks : launcher.modsDir;
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, path.join(destDir, path.basename(src)));
      added++;
    }
    return { canceled: false, added };
  });

  ipcMain.handle('mods:remove', async (_e, instanceId, filename) => {
    const dir = dirForContentFile(instanceId, filename);
    modrinth.removeMod(filename, dir);
    const store = modsMetaStore(instanceId);
    const metadata = store.get('installed') || [];
    const baseName = filename.replace(/\.disabled$/, '');
    store.set('installed', metadata.filter((m) => m.filename !== baseName));
    return true;
  });

  ipcMain.handle('mods:toggle', async (_e, instanceId, filename) => {
    const dir = dirForContentFile(instanceId, filename);
    const isDisabled = filename.endsWith('.disabled');
    const target = isDisabled ? filename.slice(0, -'.disabled'.length) : `${filename}.disabled`;
    fs.renameSync(path.join(dir, filename), path.join(dir, target));
    return { filename: target, enabled: !isDisabled };
  });

  ipcMain.handle('mods:updateAll', async (_e, instanceId) => {
    const inst = requireInstance(instanceId);
    const launcher = launcherFor(instanceId);
    const store = modsMetaStore(instanceId);
    const metadata = store.get('installed') || [];
    let updated = 0;
    for (const entry of metadata) {
      if (!entry.projectId) continue;
      const dir = entry.projectType === 'resourcepack' ? launcher.folder.resourcepacks : launcher.modsDir;
      const best = await modrinth.getBestVersionFile(entry.projectId, inst.mcVersion, { projectType: entry.projectType, loader: normalizeLoader(inst.loader) });
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
        const best = await modrinth.getBestVersionFile(entry.projectId, inst.mcVersion, { projectType: entry.projectType, loader: normalizeLoader(inst.loader) });
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
  // Every instance keeps its own favorites; this flattens them into one list
  // (tagged with which instance each came from) for a global "All Servers" view.
  ipcMain.handle('servers:listAll', async () => {
    const all = [];
    for (const inst of instances.list()) {
      for (const server of servers.listServers(instances.folder(inst.id))) {
        all.push({ ...server, instanceId: inst.id, instanceName: inst.name });
      }
    }
    return all;
  });
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

  // ---- Modrinth modpack discovery (browse + one-click install) ----
  // Unrelated to modpack:export/import above: this browses Modrinth's own
  // project_type:modpack listings and turns one into a whole new instance.
  ipcMain.handle('modpacks:search', async (_e, query, opts) => modpackDiscovery.searchModpacks(query, opts));

  ipcMain.handle('modpacks:install', async (_e, project) => {
    const projectId = project.id || project.slug;
    const send = (msg) => mainWindow.webContents.send('modpacks:progress', { projectId, msg });

    send('Looking up the latest version...');
    const plan = await modpackDiscovery.getInstallPlan(projectId);

    // The .mrpack's own manifest - not the search hit - decides the Minecraft
    // version and loader, so the instance is only created once the pack has
    // been downloaded and read.
    const prepared = await modpackDiscovery.preparePack(plan, send);
    let inst;
    try {
      inst = instances.create({
        name: project.title || prepared.name,
        mcVersion: prepared.mcVersion,
        loader: prepared.loader,
      });
    } catch (err) {
      modpackDiscovery.discardPreparedPack(prepared);
      throw err;
    }

    try {
      const result = await modpackDiscovery.applyMrpack(prepared, instances.folder(inst.id), send);
      send('Tidying up mod details...');
      const entries = await modpackDiscovery.decorateEntries(result.entries);
      modsMetaStore(inst.id).set('installed', entries);
      return { instance: inst, modCount: entries.length, versionNumber: plan.versionNumber };
    } catch (err) {
      // A half-installed pack is worse than none - drop the shell instance so
      // the user can just click Install again.
      instances.remove(inst.id, { deleteFiles: true });
      throw err;
    }
  });

  // ---- Import from Modrinth App ----
  // Identifies a friend's local Modrinth App mods by content hash against
  // Modrinth's public API - works on any PC regardless of that app's version,
  // since it never touches Modrinth App's own (undocumented) database.
  ipcMain.handle('modrinthApp:listProfiles', async () => modrinthAppImport.listProfiles());

  ipcMain.handle('modrinthApp:import', async (_e, { name, mcVersion, loader }, profileName) => {
    const { enabled, disabled } = modrinthAppImport.scanProfileMods(profileName);
    if (!enabled.length && !disabled.length) throw new Error(`No mods found in the "${profileName}" profile.`);

    const send = (msg) => mainWindow.webContents.send('modrinthApp:progress', { msg });
    send('Creating instance...');
    const inst = instances.create({ name: name || profileName, mcVersion, loader: normalizeLoader(loader || 'fabric') });

    try {
      send('Hashing local mod files...');
      const hashToPath = new Map();
      for (const filePath of enabled) {
        hashToPath.set(await modrinthAppImport.sha1File(filePath), filePath);
      }

      send('Matching mods against Modrinth...');
      let resolved = {};
      try {
        resolved = await modrinthAppImport.resolveByHash([...hashToPath.keys()]);
      } catch (err) {
        console.error('Modrinth hash lookup failed, falling back to raw file copies:', err.message);
      }

      const destDir = launcherFor(inst.id).modsDir;
      fs.mkdirSync(destDir, { recursive: true });

      let matchedCount = 0;
      let copiedCount = 0;
      const failed = [];
      let done = 0;
      for (const [hash, filePath] of hashToPath) {
        done++;
        const filename = path.basename(filePath);
        const version = resolved[hash];
        if (version && version.project_id) {
          send(`Installing ${filename} (${done}/${hashToPath.size})...`);
          try {
            await installProject(inst.id, { id: version.project_id }, { projectType: 'mod' });
            matchedCount++;
            continue;
          } catch (err) {
            failed.push({ filename, error: err.message });
            // fall through to a raw copy so the mod still makes it across
          }
        } else {
          send(`Copying ${filename} (not on Modrinth) (${done}/${hashToPath.size})...`);
        }
        fs.copyFileSync(filePath, path.join(destDir, filename));
        copiedCount++;
      }

      // Disabled mods are carried over inert, exactly as they were - no
      // network calls or metadata, just the same "off" state the source had.
      for (const filePath of disabled) {
        fs.copyFileSync(filePath, path.join(destDir, path.basename(filePath)));
      }

      return { instance: inst, matchedCount, copiedCount, disabledCount: disabled.length, failed };
    } catch (err) {
      // A half-imported instance is worse than none - drop the shell so the
      // user can just try again.
      instances.remove(inst.id, { deleteFiles: true });
      throw err;
    }
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

    const resolved = await launcher.ensureInstalled(inst.mcVersion, normalizeLoader(inst.loader), send, {
      javaPath: settings.javaPath,
    });
    send('Launching...');
    launchStartedAt = Date.now();
    const child = await launcher.launchGame(resolved, account, settings, server);
    gameProcess = child;
    playingInstanceId = instanceId;
    instances.touch(instanceId);
    if (serverId) servers.touchServer(instances.folder(instanceId), serverId);
    if (settings.minimizeOnPlay) mainWindow.minimize();

    child.stdout.on('data', (d) => mainWindow.webContents.send('game:log', { instanceId, line: d.toString() }));
    child.stderr.on('data', (d) => mainWindow.webContents.send('game:log', { instanceId, line: d.toString() }));
    child.on('exit', (code, signal) => {
      gameProcess = null;
      playingInstanceId = null;
      instances.addPlaytime(instanceId, Date.now() - launchStartedAt);
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

  // Repaints the taskbar/title-bar icon to match the chosen accent - same
  // badge art the in-app rail logo uses, just switched at the OS level too.
  ipcMain.handle('app:setIcon', async (_e, accent) => {
    const iconPath = path.join(__dirname, 'build', 'icons', `icon-${accent}.png`);
    if (fs.existsSync(iconPath)) mainWindow.setIcon(iconPath);
  });

  // ---- Custom title bar (the window is frameless; the renderer draws its
  // own bar and drives minimize/maximize/close through these) ----
  ipcMain.handle('window:minimize', () => mainWindow.minimize());
  ipcMain.handle('window:toggleMaximize', () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.handle('window:close', () => mainWindow.close());
  ipcMain.handle('window:isMaximized', () => mainWindow.isMaximized());

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
  mainWindow.setAlwaysOnTop(!!stores.settings.getAll().alwaysOnTop);
  if (stores.settings.getAll().autoCheckUpdates !== false) initAutoUpdater(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (gameProcess) gameProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});
