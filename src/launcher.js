const fs = require('fs');
const { MinecraftFolder, Version, launch } = require('@xmcl/core');
const {
  install,
  installDependencies,
  getVersionList,
  installFabric,
  getLoaderArtifactListFor,
  installForge,
  getForgeVersionList,
  installQuiltVersion,
  getQuiltVersionsList,
  installNeoForged,
} = require('@xmcl/installer');
const { findJava } = require('./javaFinder');

// The four loaders the launcher can install, plus plain vanilla as a fallback
// for modpacks that declare no loader at all. `id` is what gets stored on the
// instance and sent to Modrinth as a search facet; `label` is what the UI
// shows. Keep this list in sync with the picker in renderer/index.html.
const LOADERS = [
  { id: 'fabric', label: 'Fabric' },
  { id: 'forge', label: 'Forge' },
  { id: 'quilt', label: 'Quilt' },
  { id: 'neoforge', label: 'NeoForge' },
];
const LOADER_IDS = LOADERS.map((l) => l.id);

/** 'neoforge' -> 'NeoForge'. Unknown/missing loaders read as "Vanilla". */
function loaderLabel(loader) {
  const found = LOADERS.find((l) => l.id === loader);
  return found ? found.label : 'Vanilla';
}

/** Normalizes whatever a modpack (or an older instance record) claims into a known id. */
function normalizeLoader(loader) {
  const raw = String(loader || '').toLowerCase();
  if (LOADER_IDS.includes(raw)) return raw;
  // Modrinth's .mrpack dependency keys are "fabric-loader" / "quilt-loader".
  if (raw === 'fabric-loader') return 'fabric';
  if (raw === 'quilt-loader') return 'quilt';
  return 'vanilla';
}

const NEOFORGE_VERSIONS_URL =
  'https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge';

// NeoForge drops Minecraft's leading "1." and uses the rest as its own major
// version: MC 1.21.1 -> neoforge 21.1.x, MC 1.21 -> neoforge 21.0.x.
function neoforgeVersionPrefix(mcVersion) {
  const m = /^1\.(\d+)(?:\.(\d+))?$/.exec(mcVersion);
  if (!m) return null;
  return `${m[1]}.${m[2] || '0'}.`;
}

async function pickNeoforgeVersion(mcVersion) {
  const prefix = neoforgeVersionPrefix(mcVersion);
  if (!prefix) throw new Error(`NeoForge doesn't publish builds for Minecraft ${mcVersion}.`);
  const res = await fetch(NEOFORGE_VERSIONS_URL);
  if (!res.ok) throw new Error(`Could not reach the NeoForge version list (HTTP ${res.status}).`);
  const { versions = [] } = await res.json();
  // The list is oldest-first, so the last stable match is the newest build.
  const matches = versions.filter((v) => v.startsWith(prefix) && !/-(beta|alpha|rc)/i.test(v));
  if (!matches.length) {
    throw new Error(
      `NeoForge has no release build for Minecraft ${mcVersion} yet. NeoForge starts at Minecraft 1.20.2 — for older versions use Forge instead.`
    );
  }
  return matches[matches.length - 1];
}

// Asset/library downloads occasionally hit transient network errors when
// fetching thousands of files concurrently. xmcl skips files already on disk,
// so retrying just re-fetches whatever failed instead of starting over.
async function withRetry(fn, attempts, onRetry) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) onRetry(i + 1, err);
    }
  }
  throw lastErr;
}

// Forge and NeoForge run post-processors during install and xmcl reads their
// console output. javaw.exe detaches from the console on Windows, so swap in
// its java.exe sibling when one is actually there.
function installerJava(javaPath) {
  const java = findJava(javaPath);
  if (!java) return undefined;
  const console = java.replace(/javaw(\.exe)?$/i, 'java$1');
  if (console === java) return java;
  if (!/[\\/]/.test(console)) return console;
  return fs.existsSync(console) ? console : java;
}

// Per-instance JVM arguments arrive as a single free-text string, the way
// Prism Launcher's "JVM arguments" box works. xmcl's LaunchOption wants a
// string[], so split on whitespace and drop the empties.
function splitJvmArgs(raw) {
  if (!raw) return [];
  return String(raw).trim().split(/\s+/).filter(Boolean);
}

class GameLauncher {
  constructor(instanceDir) {
    this.instanceDir = instanceDir;
    this.folder = new MinecraftFolder(instanceDir);
  }

  get modsDir() {
    return this.folder.mods;
  }

  /**
   * Downloads vanilla Minecraft plus the instance's mod loader if not already
   * present. `loader` is one of 'fabric' | 'forge' | 'quilt' | 'neoforge'
   * (anything else installs plain vanilla).
   */
  async ensureInstalled(mcVersion, loader, onProgress = () => {}, { javaPath } = {}) {
    const kind = normalizeLoader(loader);

    onProgress('Checking Minecraft version list...');
    const list = await getVersionList();
    const versionMeta = list.versions.find((v) => v.id === mcVersion);
    if (!versionMeta) throw new Error(`Unknown Minecraft version: ${mcVersion}`);

    onProgress(`Downloading Minecraft ${mcVersion}...`);
    await withRetry(
      () => install(versionMeta, this.folder),
      3,
      (attempt) => onProgress(`A few files failed to download, retrying (${attempt}/3)...`)
    );

    const versionId = await this.installLoader(kind, mcVersion, onProgress, javaPath);

    onProgress(`Downloading ${loaderLabel(kind)} libraries...`);
    const resolved = await Version.parse(this.folder, versionId);
    await withRetry(
      () => installDependencies(resolved),
      3,
      (attempt) => onProgress(`A few libraries failed to download, retrying (${attempt}/3)...`)
    );

    onProgress('Ready.');
    return resolved;
  }

  /**
   * Installs one loader's version JSON + libraries over an already-installed
   * vanilla version, and returns the version id to launch. Each loader's xmcl
   * API has a genuinely different shape, hence the branch rather than a table.
   */
  async installLoader(kind, mcVersion, onProgress, javaPath) {
    if (kind === 'vanilla') return mcVersion;

    if (kind === 'fabric') {
      onProgress('Finding a Fabric loader build...');
      const loaders = await getLoaderArtifactListFor(mcVersion);
      if (!loaders.length) throw new Error(`Fabric has no loader build for Minecraft ${mcVersion} yet.`);
      const artifact = loaders.find((l) => l.loader.stable) || loaders[0];
      onProgress(`Installing Fabric ${artifact.loader.version}...`);
      return installFabric(artifact, this.folder);
    }

    if (kind === 'quilt') {
      onProgress('Finding a Quilt loader build...');
      // Quilt's list covers every Minecraft version at once and is newest-first,
      // so filter the pre-releases out and take the newest stable build.
      const versions = await getQuiltVersionsList();
      const stable = versions.find((v) => !/-(beta|pre|rc|alpha)/i.test(v.version)) || versions[0];
      if (!stable) throw new Error('Quilt published no loader versions.');
      onProgress(`Installing Quilt ${stable.version}...`);
      return installQuiltVersion({
        minecraftVersion: mcVersion,
        version: stable.version,
        minecraft: this.folder,
      });
    }

    // Forge and NeoForge both run an installer jar with post-processors, which
    // needs a real JVM on hand before we start.
    const java = installerJava(javaPath);
    if (!java) {
      throw new Error(
        `Installing ${loaderLabel(kind)} needs Java. Install Java 21+ from https://adoptium.net, or set a custom Java path in Settings.`
      );
    }

    if (kind === 'forge') {
      onProgress('Finding a Forge build...');
      const { versions } = await getForgeVersionList({ minecraft: mcVersion });
      if (!versions || !versions.length) throw new Error(`Forge has no build for Minecraft ${mcVersion}.`);
      const build =
        versions.find((v) => v.type === 'recommended') || versions.find((v) => v.type === 'latest') || versions[0];
      onProgress(`Installing Forge ${build.version} (this one takes a while)...`);
      return installForge(
        // The version list hands back absolute maven URLs, which xmcl uses
        // as-is - better than its stale built-in forge maven host.
        { mcversion: mcVersion, version: build.version, installer: build.installer },
        this.folder,
        { java, mavenHost: ['https://maven.minecraftforge.net'] }
      );
    }

    if (kind === 'neoforge') {
      onProgress('Finding a NeoForge build...');
      const version = await pickNeoforgeVersion(mcVersion);
      onProgress(`Installing NeoForge ${version} (this one takes a while)...`);
      return installNeoForged('neoforge', version, this.folder, { java });
    }

    throw new Error(`Unsupported mod loader: ${kind}`);
  }

  /** Spawns the game process. `server` (optional) is { ip, port } to connect straight into. */
  async launchGame(resolvedVersion, account, settings, server) {
    const javaPath = findJava(settings.javaPath);
    if (!javaPath) {
      throw new Error(
        'No Java installation found. Install Java 21+ from https://adoptium.net, or set a custom Java path in Settings.'
      );
    }
    const extraJVMArgs = splitJvmArgs(settings.jvmArgs);
    return launch({
      gamePath: this.instanceDir,
      javaPath,
      ...(extraJVMArgs.length ? { extraJVMArgs } : {}),
      version: resolvedVersion,
      gameProfile: { name: account.name, id: account.uuid },
      accessToken: account.accessToken,
      userType: 'mojang',
      minMemory: settings.minMemoryMb,
      maxMemory: settings.maxMemoryMb,
      resolution: { width: settings.width, height: settings.height },
      launcherName: 'CamelLauncher',
      launcherBrand: 'CamelLauncher',
      ...(server ? { server } : {}),
    });
  }
}

module.exports = { GameLauncher, LOADERS, LOADER_IDS, loaderLabel, normalizeLoader, splitJvmArgs };
