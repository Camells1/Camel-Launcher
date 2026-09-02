const FORMAT = 'camel-modpack-v1';

/** Builds a shareable manifest from an instance + its installed-mod metadata. */
function buildManifest(instance, installedMods) {
  return {
    format: FORMAT,
    name: instance.name,
    mcVersion: instance.mcVersion,
    loader: instance.loader || 'fabric',
    mods: installedMods
      .filter((m) => m.projectId)
      .map((m) => ({ projectId: m.projectId, title: m.title })),
  };
}

function parseManifest(raw) {
  const data = JSON.parse(raw);
  if (data.format !== FORMAT || !Array.isArray(data.mods)) {
    throw new Error('That file is not a Camel Launcher modpack export.');
  }
  return data;
}

module.exports = { buildManifest, parseManifest };
