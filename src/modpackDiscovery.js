const fs = require('fs');
const path = require('path');
const os = require('os');
const yauzl = require('yauzl');
const modrinth = require('./modrinth');
const { normalizeLoader } = require('./launcher');

// Browsing and installing whole modpacks published on Modrinth
// (project_type:modpack). This is entirely separate from src/modpack.js, which
// exports/imports *this launcher's own* mod-list files.
//
// A Modrinth modpack version ships a .mrpack: a zip whose modrinth.index.json
// lists a `dependencies` map (minecraft + loader versions) and a `files` array
// of pinned direct downloads. Installing from that index is what gets the
// exact mod builds the pack author tested, rather than "whatever is newest".

/** Searches (or browses, when query is empty) Modrinth's modpacks. */
async function searchModpacks(query, { limit = 30, offset = 0 } = {}) {
  // No mcVersion facet - a pack's own version dictates the Minecraft version,
  // so browsing shouldn't be pre-filtered to one.
  return modrinth.searchMods(query, null, { limit, offset, projectType: 'modpack' });
}

/**
 * Picks the version of a modpack to install and reads its declared Minecraft
 * version + loader. Prefers the newest full release over betas/alphas.
 */
async function getInstallPlan(projectIdOrSlug) {
  const versions = await modrinth.apiGet(`/project/${projectIdOrSlug}/version`);
  if (!versions.length) throw new Error('This modpack has no published versions yet.');
  const version = versions.find((v) => v.version_type === 'release') || versions[0];

  const file = version.files.find((f) => f.primary && f.filename.endsWith('.mrpack'))
    || version.files.find((f) => f.filename.endsWith('.mrpack'));
  if (!file) throw new Error('This modpack has no .mrpack download, so it cannot be installed automatically.');

  const mcVersion = (version.game_versions || [])[version.game_versions.length - 1];
  if (!mcVersion) throw new Error('This modpack does not declare a Minecraft version.');

  return {
    versionId: version.id,
    versionNumber: version.version_number,
    mcVersion,
    loader: normalizeLoader((version.loaders || [])[0]),
    url: file.url,
    filename: file.filename,
    size: file.size,
  };
}

function download(url, destPath) {
  return modrinth.downloadFile(url, destPath);
}

function openZip(zipPath) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, autoClose: false }, (err, zip) => (err ? reject(err) : resolve(zip)));
  });
}

/** Reads every entry of an opened zip into { fileName: Buffer } for the ones we want. */
function readEntries(zip, wantEntry) {
  return new Promise((resolve, reject) => {
    const out = new Map();
    zip.on('entry', (entry) => {
      if (entry.fileName.endsWith('/') || !wantEntry(entry.fileName)) {
        zip.readEntry();
        return;
      }
      zip.openReadStream(entry, (err, stream) => {
        if (err) return reject(err);
        const chunks = [];
        stream.on('data', (c) => chunks.push(c));
        stream.on('end', () => {
          out.set(entry.fileName, Buffer.concat(chunks));
          zip.readEntry();
        });
        stream.on('error', reject);
      });
    });
    zip.on('end', () => resolve(out));
    zip.on('error', reject);
    zip.readEntry();
  });
}

// A pack's index and its overrides both name their own destination paths, so
// both need checking before anything is written outside the instance folder.
function safeJoin(rootDir, relativePath) {
  const target = path.resolve(rootDir, relativePath);
  const root = path.resolve(rootDir);
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  return target;
}

const OVERRIDE_PREFIXES = ['overrides/', 'client-overrides/'];

function overrideDestination(entryName) {
  for (const prefix of OVERRIDE_PREFIXES) {
    if (entryName.startsWith(prefix)) return entryName.slice(prefix.length);
  }
  return null;
}

// Modrinth's CDN pins each file as /data/<projectId>/versions/<versionId>/<name>,
// so the project id the launcher needs for icons and update checks is already
// in the download URL - no extra API round trip per mod.
function projectIdFromCdnUrl(url) {
  const m = /^https:\/\/cdn\.modrinth\.com\/data\/([A-Za-z0-9]+)\//.exec(url || '');
  return m ? m[1] : null;
}

// modrinth.index.json's `dependencies` is the authoritative statement of what
// a pack needs - a version listed under several loaders on the API still ships
// one .mrpack per loader, and only the index says which one this file is.
const LOADER_DEPENDENCY_KEYS = {
  'fabric-loader': 'fabric',
  'quilt-loader': 'quilt',
  forge: 'forge',
  neoforge: 'neoforge',
};

function loaderFromIndex(index) {
  for (const [key, loader] of Object.entries(LOADER_DEPENDENCY_KEYS)) {
    if (index.dependencies && index.dependencies[key]) return loader;
  }
  return 'vanilla';
}

/**
 * Downloads the .mrpack and reads its manifest, without writing anything into
 * an instance yet - the caller needs the pack's real Minecraft version and
 * loader before it can create the instance to install into.
 * Always pair with discardPreparedPack() or applyMrpack(), which clean up.
 */
async function preparePack(plan, onProgress = () => {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'camel-mrpack-'));
  try {
    onProgress('Downloading modpack...');
    const mrpackPath = path.join(tmpDir, plan.filename || 'pack.mrpack');
    await download(plan.url, mrpackPath);

    const zip = await openZip(mrpackPath);
    const contents = await readEntries(zip, (name) => name === 'modrinth.index.json' || overrideDestination(name) !== null);
    zip.close();

    const indexRaw = contents.get('modrinth.index.json');
    if (!indexRaw) throw new Error('That .mrpack has no modrinth.index.json inside it.');
    const index = JSON.parse(indexRaw.toString('utf-8'));

    return {
      tmpDir,
      contents,
      index,
      name: index.name || plan.filename,
      mcVersion: (index.dependencies && index.dependencies.minecraft) || plan.mcVersion,
      loader: loaderFromIndex(index),
    };
  } catch (err) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw err;
  }
}

function discardPreparedPack(prepared) {
  if (prepared) fs.rmSync(prepared.tmpDir, { recursive: true, force: true });
}

/**
 * Writes a prepared pack into an instance folder: every file the index pins,
 * plus the pack's config overrides.
 * Returns { name, index, entries } where entries are ready for .camel-mods.json.
 */
async function applyMrpack(prepared, instanceDir, onProgress = () => {}) {
  const { index, contents } = prepared;
  try {
    // Server-only files would just be dead weight in a client instance.
    const files = (index.files || []).filter((f) => !f.env || f.env.client !== 'unsupported');
    const entries = [];
    let done = 0;

    for (const file of files) {
      const dest = safeJoin(instanceDir, file.path);
      if (!dest) {
        console.error(`Skipping modpack file with an unsafe path: ${file.path}`);
        continue;
      }
      const url = (file.downloads || [])[0];
      if (!url) continue;
      done++;
      onProgress(`Downloading pack files (${done}/${files.length})...`);
      await download(url, dest);

      // Only mods land in .camel-mods.json; resource packs and shaders the
      // pack ships stay on disk but aren't managed as installed projects.
      if (file.path.startsWith('mods/')) {
        entries.push({
          filename: path.basename(file.path),
          title: path.basename(file.path).replace(/\.jar$/, ''),
          projectId: projectIdFromCdnUrl(url),
          projectType: 'mod',
        });
      }
    }

    onProgress('Applying pack configuration...');
    for (const [name, buffer] of contents) {
      const relative = overrideDestination(name);
      if (relative === null || relative === '') continue;
      const dest = safeJoin(instanceDir, relative);
      if (!dest) continue;
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buffer);
    }

    return { name: prepared.name, index, entries };
  } finally {
    discardPreparedPack(prepared);
  }
}

/** Fills in real titles and icons for the mods a pack pinned, in one API call. */
async function decorateEntries(entries) {
  const ids = entries.map((e) => e.projectId).filter(Boolean);
  if (!ids.length) return entries;
  let projects = [];
  try {
    projects = await modrinth.getProjects(ids);
  } catch (err) {
    // Cosmetic only - the pack is already installed and playable either way.
    console.error('Could not backfill modpack mod metadata:', err.message);
    return entries;
  }
  const byId = new Map(projects.map((p) => [p.id, p]));
  return entries.map((entry) => {
    const project = entry.projectId && byId.get(entry.projectId);
    return project ? { ...entry, title: project.title, iconUrl: project.iconUrl } : entry;
  });
}

module.exports = { searchModpacks, getInstallPlan, preparePack, applyMrpack, discardPreparedPack, decorateEntries };
