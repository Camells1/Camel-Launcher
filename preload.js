const { contextBridge, ipcRenderer } = require('electron');
const camelArt = require('./src/camelArt');

contextBridge.exposeInMainWorld('camelArt', camelArt);

contextBridge.exposeInMainWorld('mc', {
  getAccount: () => ipcRenderer.invoke('auth:get'),
  login: () => ipcRenderer.invoke('auth:login'),
  logout: () => ipcRenderer.invoke('auth:logout'),

  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),

  listInstances: () => ipcRenderer.invoke('instances:list'),
  createInstance: (opts) => ipcRenderer.invoke('instances:create', opts),
  renameInstance: (id, name) => ipcRenderer.invoke('instances:rename', id, name),
  removeInstance: (id, opts) => ipcRenderer.invoke('instances:remove', id, opts),

  searchMods: (instanceId, query, opts) => ipcRenderer.invoke('mods:search', instanceId, query, opts),
  listMods: (instanceId) => ipcRenderer.invoke('mods:list', instanceId),
  installMod: (instanceId, project) => ipcRenderer.invoke('mods:install', instanceId, project),
  removeMod: (instanceId, filename) => ipcRenderer.invoke('mods:remove', instanceId, filename),
  toggleMod: (instanceId, filename) => ipcRenderer.invoke('mods:toggle', instanceId, filename),
  updateAllMods: (instanceId) => ipcRenderer.invoke('mods:updateAll', instanceId),

  play: (instanceId) => ipcRenderer.invoke('game:play', instanceId),
  stop: () => ipcRenderer.invoke('game:stop'),
  onProgress: (cb) => ipcRenderer.on('game:progress', (_e, payload) => cb(payload)),
  onLog: (cb) => ipcRenderer.on('game:log', (_e, payload) => cb(payload)),
  onExit: (cb) => ipcRenderer.on('game:exit', (_e, payload) => cb(payload)),

  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  onUpdateStatus: (cb) => ipcRenderer.on('update:status', (_e, payload) => cb(payload)),
  onUpdateProgress: (cb) => ipcRenderer.on('update:progress', (_e, payload) => cb(payload)),
});
