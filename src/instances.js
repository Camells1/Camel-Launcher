const fs = require('fs');
const path = require('path');

function randomId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

// Everything under an instance folder that `GameLauncher.ensureInstalled()`
// re-downloads on its own, plus per-run debris. Duplicating an instance skips
// these: they're gigabytes of identical jars/assets and copying them would
// turn a "duplicate" into a multi-minute disk-thrash for no benefit. The
// copy re-fetches them on its first launch, exactly like a new instance.
const REGENERATED_ENTRIES = new Set([
  'versions',
  'libraries',
  'assets',
  'natives',
  'logs',
  'crash-reports',
  '.fabric',
  '.mixin.out',
  'usercache.json',
  'realms_persistence.json',
]);

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
    return this.instances.map((i) => this.toPublic(i));
  }

  get(id) {
    return this.instances.find((i) => i.id === id) || null;
  }

  folder(id) {
    return path.join(this.instancesDir, id);
  }

  /** Absolute path of an instance's custom icon file, or null when it has none. */
  iconPath(id) {
    const inst = this.get(id);
    if (!inst || !inst.icon) return null;
    return path.join(this.folder(id), inst.icon);
  }

  // The renderer can't build a file:// URL itself (it never sees userData), so
  // every record that crosses IPC carries a ready-to-use `iconUrl`. It's derived
  // rather than stored, so it never ends up persisted in instances.json.
  toPublic(inst) {
    if (!inst) return null;
    const copy = { ...inst };
    if (inst.icon) {
      copy.iconUrl = encodeURI(`file://${path.join(this.folder(inst.id), inst.icon).replace(/\\/g, '/')}`);
    }
    return copy;
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
    return this.toPublic(instance);
  }

  rename(id, name) {
    const inst = this.get(id);
    if (!inst) throw new Error('Instance not found');
    inst.name = name;
    this.save();
    return this.toPublic(inst);
  }

  /** Stamps "last played" for the Home page's recent-activity list. */
  touch(id) {
    const inst = this.get(id);
    if (!inst) return;
    inst.lastPlayedAt = Date.now();
    this.save();
  }

  /** Per-instance overrides (minMemoryMb/maxMemoryMb/javaPath/jvmArgs). Pass null/'' to clear a field back to the global default. */
  update(id, patch) {
    const inst = this.get(id);
    if (!inst) throw new Error('Instance not found');
    for (const key of ['minMemoryMb', 'maxMemoryMb', 'javaPath', 'jvmArgs']) {
      if (!(key in patch)) continue;
      if (patch[key] === null || patch[key] === '') delete inst[key];
      else inst[key] = patch[key];
    }
    this.save();
    return this.toPublic(inst);
  }

  /**
   * Copies `srcPath` into the instance folder as its custom icon.
   * The stored filename carries a timestamp so the renderer gets a URL it has
   * never cached — a fixed `icon.png` would keep showing the previous image.
   */
  setIcon(id, srcPath) {
    const inst = this.get(id);
    if (!inst) throw new Error('Instance not found');
    const ext = (path.extname(srcPath) || '.png').toLowerCase();
    const filename = `icon-${Date.now().toString(36)}${ext}`;
    fs.mkdirSync(this.folder(id), { recursive: true });
    fs.copyFileSync(srcPath, path.join(this.folder(id), filename));
    this.removeIconFile(id);
    inst.icon = filename;
    this.save();
    return this.toPublic(inst);
  }

  /** Drops the custom icon, falling back to the generated letter swatch. */
  clearIcon(id) {
    const inst = this.get(id);
    if (!inst) throw new Error('Instance not found');
    this.removeIconFile(id);
    delete inst.icon;
    this.save();
    return this.toPublic(inst);
  }

  removeIconFile(id) {
    const existing = this.iconPath(id);
    if (existing) fs.rmSync(existing, { force: true });
  }

  /**
   * Clones an instance's content (mods, config, saves, options, servers,
   * resource/shader packs and its custom icon) into a brand-new instance.
   * Vanilla/Fabric jars, libraries and assets are deliberately left behind —
   * see REGENERATED_ENTRIES.
   */
  duplicate(id, name) {
    const source = this.get(id);
    if (!source) throw new Error('Instance not found');

    const copy = this.create({ name: name || this.copyNameFor(source.name), mcVersion: source.mcVersion, loader: source.loader });
    const inst = this.get(copy.id);
    // Carry the source's own settings over, but not its play history: a fresh
    // copy hasn't been played, and claiming otherwise would falsify "Jump in".
    for (const key of ['minMemoryMb', 'maxMemoryMb', 'javaPath', 'jvmArgs', 'icon']) {
      if (source[key] !== undefined) inst[key] = source[key];
    }
    this.save();

    const from = this.folder(id);
    const to = this.folder(inst.id);
    if (fs.existsSync(from)) {
      fs.cpSync(from, to, {
        recursive: true,
        force: true,
        filter: (src) => {
          const rel = path.relative(from, src);
          if (!rel) return true;
          return !REGENERATED_ENTRIES.has(rel.split(path.sep)[0]);
        },
      });
    }
    // If the source had no icon file after all, don't leave a dangling record.
    if (inst.icon && !fs.existsSync(path.join(to, inst.icon))) {
      delete inst.icon;
      this.save();
    }
    return this.toPublic(inst);
  }

  /** "Copy of Skyblock", then "Copy of Skyblock (2)" once that name is taken. */
  copyNameFor(name) {
    const taken = new Set(this.instances.map((i) => i.name));
    const base = `Copy of ${name}`;
    if (!taken.has(base)) return base;
    for (let n = 2; ; n++) {
      const candidate = `${base} (${n})`;
      if (!taken.has(candidate)) return candidate;
    }
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
