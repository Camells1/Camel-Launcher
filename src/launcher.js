const { MinecraftFolder, Version, launch } = require('@xmcl/core');
const { install, installDependencies, getVersionList, installFabric, getLoaderArtifactListFor } = require('@xmcl/installer');
const { findJava } = require('./javaFinder');

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

class GameLauncher {
  constructor(instanceDir) {
    this.instanceDir = instanceDir;
    this.folder = new MinecraftFolder(instanceDir);
  }

  get modsDir() {
    return this.folder.mods;
  }

  /** Downloads vanilla Minecraft + Fabric for the given version if not already present. */
  async ensureInstalled(mcVersion, onProgress = () => {}) {
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

    onProgress('Finding a Fabric loader build...');
    const loaders = await getLoaderArtifactListFor(mcVersion);
    if (!loaders.length) throw new Error(`Fabric has no loader build for Minecraft ${mcVersion} yet.`);
    const loaderArtifact = loaders.find((l) => l.loader.stable) || loaders[0];

    onProgress(`Installing Fabric ${loaderArtifact.loader.version}...`);
    const fabricVersionId = await installFabric(loaderArtifact, this.folder);

    onProgress('Downloading Fabric libraries...');
    const resolved = await Version.parse(this.folder, fabricVersionId);
    await withRetry(
      () => installDependencies(resolved),
      3,
      (attempt) => onProgress(`A few libraries failed to download, retrying (${attempt}/3)...`)
    );

    onProgress('Ready.');
    return resolved;
  }

  /** Spawns the game process. `server` (optional) is { ip, port } to connect straight into. */
  async launchGame(resolvedVersion, account, settings, server) {
    const javaPath = findJava(settings.javaPath);
    if (!javaPath) {
      throw new Error(
        'No Java installation found. Install Java 21+ from https://adoptium.net, or set a custom Java path in Settings.'
      );
    }
    return launch({
      gamePath: this.instanceDir,
      javaPath,
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

module.exports = { GameLauncher };
