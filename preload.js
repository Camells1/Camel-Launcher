const { contextBridge, ipcRenderer } = require('electron');
const camelArt = require('./src/camelArt');

contextBridge.exposeInMainWorld('camelArt', camelArt);

contextBridge.exposeInMainWorld('mc', {
  getAccount: () => ipcRenderer.invoke('auth:get'),
  login: () => ipcRenderer.invoke('auth:login'),
  logout: () => ipcRenderer.invoke('auth:logout'),

  listAccounts: () => ipcRenderer.invoke('accounts:list'),
  switchAccount: (uuid) => ipcRenderer.invoke('accounts:switch', uuid),
  removeAccount: (uuid) => ipcRenderer.invoke('accounts:remove', uuid),
  addAnotherAccount: () => ipcRenderer.invoke('accounts:addAnother'),

  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),

  listInstances: () => ipcRenderer.invoke('instances:list'),
  createInstance: (opts) => ipcRenderer.invoke('instances:create', opts),
  renameInstance: (id, name) => ipcRenderer.invoke('instances:rename', id, name),
  updateInstance: (id, patch) => ipcRenderer.invoke('instances:update', id, patch),
  removeInstance: (id, opts) => ipcRenderer.invoke('instances:remove', id, opts),
  setInstanceIcon: (id) => ipcRenderer.invoke('instances:setIcon', id),
  clearInstanceIcon: (id) => ipcRenderer.invoke('instances:clearIcon', id),
  duplicateInstance: (id, name) => ipcRenderer.invoke('instances:duplicate', id, name),

  listLoaders: () => ipcRenderer.invoke('loaders:list'),

  searchModpacks: (query, opts) => ipcRenderer.invoke('modpacks:search', query, opts),
  installModpack: (project) => ipcRenderer.invoke('modpacks:install', project),
  onModpackProgress: (cb) => ipcRenderer.on('modpacks:progress', (_e, payload) => cb(payload)),

  listModrinthAppProfiles: () => ipcRenderer.invoke('modrinthApp:listProfiles'),
  importFromModrinthApp: (opts, profileName) => ipcRenderer.invoke('modrinthApp:import', opts, profileName),
  onModrinthAppProgress: (cb) => ipcRenderer.on('modrinthApp:progress', (_e, payload) => cb(payload)),

  searchMods: (instanceId, query, opts) => ipcRenderer.invoke('mods:search', instanceId, query, opts),
  listMods: (instanceId) => ipcRenderer.invoke('mods:list', instanceId),
  installMod: (instanceId, project, opts) => ipcRenderer.invoke('mods:install', instanceId, project, opts),
  uploadModFiles: (instanceId) => ipcRenderer.invoke('mods:uploadFiles', instanceId),
  removeMod: (instanceId, filename) => ipcRenderer.invoke('mods:remove', instanceId, filename),
  toggleMod: (instanceId, filename) => ipcRenderer.invoke('mods:toggle', instanceId, filename),
  updateAllMods: (instanceId) => ipcRenderer.invoke('mods:updateAll', instanceId),
  checkModUpdates: (instanceId) => ipcRenderer.invoke('mods:checkUpdates', instanceId),

  listWorlds: (instanceId) => ipcRenderer.invoke('worlds:list', instanceId),
  deleteWorld: (instanceId, name) => ipcRenderer.invoke('worlds:delete', instanceId, name),
  openWorldFolder: (instanceId, name) => ipcRenderer.invoke('worlds:openFolder', instanceId, name),

  listScreenshots: (instanceId) => ipcRenderer.invoke('screenshots:list', instanceId),
  deleteScreenshot: (instanceId, name) => ipcRenderer.invoke('screenshots:delete', instanceId, name),
  openScreenshotsFolder: (instanceId) => ipcRenderer.invoke('screenshots:openFolder', instanceId),

  listServers: (instanceId) => ipcRenderer.invoke('servers:list', instanceId),
  listAllServers: () => ipcRenderer.invoke('servers:listAll'),
  addServer: (instanceId, entry) => ipcRenderer.invoke('servers:add', instanceId, entry),
  removeServer: (instanceId, id) => ipcRenderer.invoke('servers:remove', instanceId, id),

  exportModpack: (instanceId) => ipcRenderer.invoke('modpack:export', instanceId),
  importModpack: (instanceId) => ipcRenderer.invoke('modpack:import', instanceId),

  getRecentActivity: (limit) => ipcRenderer.invoke('activity:recent', limit),

  getSkin: () => ipcRenderer.invoke('skin:get'),
  uploadSkin: (variant) => ipcRenderer.invoke('skin:upload', variant),
  setSkinFromUrl: (url, variant) => ipcRenderer.invoke('skin:setFromUrl', url, variant),
  resetSkin: () => ipcRenderer.invoke('skin:reset'),

  play: (instanceId, serverId) => ipcRenderer.invoke('game:play', instanceId, serverId),
  stop: () => ipcRenderer.invoke('game:stop'),
  onProgress: (cb) => ipcRenderer.on('game:progress', (_e, payload) => cb(payload)),
  onLog: (cb) => ipcRenderer.on('game:log', (_e, payload) => cb(payload)),
  onExit: (cb) => ipcRenderer.on('game:exit', (_e, payload) => cb(payload)),

  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  openPath: (targetPath) => ipcRenderer.invoke('shell:openPath', targetPath),

  setAppIcon: (accent) => ipcRenderer.invoke('app:setIcon', accent),

  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window:toggleMaximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onWindowState: (cb) => ipcRenderer.on('window:state', (_e, payload) => cb(payload)),

  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  onUpdateStatus: (cb) => ipcRenderer.on('update:status', (_e, payload) => cb(payload)),
  onUpdateProgress: (cb) => ipcRenderer.on('update:progress', (_e, payload) => cb(payload)),
});
