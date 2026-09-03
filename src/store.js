const fs = require('fs');
const path = require('path');

const DEFAULT_SETTINGS = {
  minMemoryMb: 2048,
  maxMemoryMb: 4096,
  javaPath: '',
  width: 854,
  height: 480,
  theme: 'dark',
  accentColor: 'ochre',
  reduceMotion: false,
  defaultLoader: 'fabric',
  minimizeOnPlay: false,
  alwaysOnTop: false,
  autoCheckUpdates: true,
  confirmStopGame: true,
};

class JsonStore {
  constructor(filePath, defaults) {
    this.filePath = filePath;
    this.data = { ...defaults };
    this.load();
  }

  load() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      this.data = { ...this.data, ...JSON.parse(raw) };
    } catch (err) {
      if (err.code !== 'ENOENT') console.error(`Failed to read ${this.filePath}:`, err);
    }
  }

  save() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  get(key) {
    return this.data[key];
  }

  getAll() {
    return { ...this.data };
  }

  set(key, value) {
    this.data[key] = value;
    this.save();
  }

  setAll(obj) {
    this.data = { ...this.data, ...obj };
    this.save();
  }

  delete(key) {
    delete this.data[key];
    this.save();
  }
}

function createStores(userDataPath) {
  const settings = new JsonStore(path.join(userDataPath, 'settings.json'), DEFAULT_SETTINGS);
  const account = new JsonStore(path.join(userDataPath, 'account.json'), {});
  return { settings, account };
}

module.exports = { createStores, DEFAULT_SETTINGS, JsonStore };
