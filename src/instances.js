const fs = require('fs');
const path = require('path');

function randomId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Manages multiple named Minecraft installs (each its own folder, version, mods). */
class InstanceManager {
  constructor(userDataPath) {
    this.userDataPath = userDataPath;
    this.instancesDir = path.join(userDataPath, 'instances');
    this.indexPath = path.join(userDataPath, 'instances.json');
    this.instances = this.load();
    this.migrateLegacySingleInstance();
  }

  load() {
    try {
      return JSON.parse(fs.readFileSync(this.indexPath, 'utf-8'));
    } catch (err) {
      if (err.code !== 'ENOENT') console.error('Failed to read instances.json:', err);
      return [];
    }
  }

  save() {
    fs.mkdirSync(this.userDataPath, { recursive: true });
    fs.writeFileSync(this.indexPath, JSON.stringify(this.instances, null, 2));
  }

  // v1 of this launcher had exactly one hardcoded instance at userData/instance.
  // Adopt it as a real instance instead of re-downloading everything.
  migrateLegacySingleInstance() {
    if (this.instances.length > 0) return;
    const legacyDir = path.join(this.userDataPath, 'instance');
    if (!fs.existsSync(legacyDir)) return;
    let mcVersion = '1.21.1';
    try {
      const settings = JSON.parse(fs.readFileSync(path.join(this.userDataPath, 'settings.json'), 'utf-8'));
      if (settings.mcVersion) mcVersion = settings.mcVersion;
    } catch {
      // fall back to default above
    }
    fs.mkdirSync(this.instancesDir, { recursive: true });
    const target = path.join(this.instancesDir, 'default');
    fs.renameSync(legacyDir, target);
    this.instances.push({ id: 'default', name: 'Default', mcVersion, loader: 'fabric', createdAt: Date.now() });
    this.save();
  }

  list() {
    return [...this.instances];
  }

  get(id) {
    return this.instances.find((i) => i.id === id) || null;
  }

  folder(id) {
    return path.join(this.instancesDir, id);
  }

  modsMetaPath(id) {
    return path.join(this.folder(id), '.camel-mods.json');
  }

  create({ name, mcVersion, loader = 'fabric' }) {
    const id = randomId();
    const instance = { id, name: name || 'New Instance', mcVersion, loader, createdAt: Date.now() };
    fs.mkdirSync(this.folder(id), { recursive: true });
    this.instances.push(instance);
    this.save();
    return instance;
  }

  rename(id, name) {
    const inst = this.get(id);
    if (!inst) throw new Error('Instance not found');
    inst.name = name;
    this.save();
    return inst;
  }

  /** Stamps "last played" for the Home page's recent-activity list. */
  touch(id) {
    const inst = this.get(id);
    if (!inst) return;
    inst.lastPlayedAt = Date.now();
    this.save();
  }

  /** Per-instance overrides (minMemoryMb/maxMemoryMb/javaPath). Pass null/'' to clear a field back to the global default. */
  update(id, patch) {
    const inst = this.get(id);
    if (!inst) throw new Error('Instance not found');
    for (const key of ['minMemoryMb', 'maxMemoryMb', 'javaPath']) {
      if (!(key in patch)) continue;
      if (patch[key] === null || patch[key] === '') delete inst[key];
      else inst[key] = patch[key];
    }
    this.save();
    return inst;
  }

  remove(id, { deleteFiles = false } = {}) {
    const inst = this.get(id);
    if (!inst) return;
    this.instances = this.instances.filter((i) => i.id !== id);
    this.save();
    if (deleteFiles) fs.rmSync(this.folder(id), { recursive: true, force: true });
  }
}

module.exports = { InstanceManager };
