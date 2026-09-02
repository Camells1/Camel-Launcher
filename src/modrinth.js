const fs = require('fs');
const path = require('path');
const https = require('https');

const API_BASE = 'https://api.modrinth.com/v2';
const USER_AGENT = 'CustomMCLauncher/1.0 (personal friend-group launcher)';

async function apiGet(pathAndQuery) {
  const res = await fetch(`${API_BASE}${pathAndQuery}`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`Modrinth API error ${res.status} for ${pathAndQuery}`);
  return res.json();
}

// Mods only exist for a specific loader (Fabric here); resource packs and
// shaders are loader-agnostic on Modrinth's side (shaders are tagged with
// their own "iris"/"optifine" category rather than a real loader facet), so
// only mod searches/version-lookups should filter by loader.
const PROJECT_TYPES = {
  mod: { type: 'mod', loader: 'fabric' },
  resourcepack: { type: 'resourcepack', loader: null },
  shader: { type: 'shader', loader: null },
};

/**
 * Searches (or browses, if query is empty) Modrinth for a given project type
 * (mod/resourcepack/shader) compatible with a specific Minecraft version.
 * Supports paging via offset.
 */
async function searchMods(query, mcVersion, { limit = 30, offset = 0, projectType = 'mod' } = {}) {
  const kind = PROJECT_TYPES[projectType] || PROJECT_TYPES.mod;
  const facets = [[`project_type:${kind.type}`], [`versions:${mcVersion}`]];
  if (kind.loader) facets.push([`categories:${kind.loader}`]);
  const params = new URLSearchParams({
    query: query || '',
    facets: JSON.stringify(facets),
    limit: String(limit),
    offset: String(offset),
    // With no search text, sort by popularity so browsing surfaces the best mods first.
    index: query ? 'relevance' : 'downloads',
  });
  const data = await apiGet(`/search?${params.toString()}`);
  return {
    total: data.total_hits,
    offset,
    limit,
    hits: data.hits.map((hit) => ({
      id: hit.project_id,
      slug: hit.slug,
      title: hit.title,
      description: hit.description,
      iconUrl: hit.icon_url,
      downloads: hit.downloads,
      author: hit.author,
      projectType: hit.project_type,
    })),
  };
}

/** Looks up a single project's basic info (used to backfill icon/title for quick-add mods). */
async function getProject(idOrSlug) {
  const p = await apiGet(`/project/${idOrSlug}`);
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    iconUrl: p.icon_url,
    downloads: p.downloads,
    projectType: p.project_type,
  };
}

/** Finds the best matching version file for a project + Minecraft version. */
async function getBestVersionFile(projectIdOrSlug, mcVersion, { projectType = 'mod' } = {}) {
  const kind = PROJECT_TYPES[projectType] || PROJECT_TYPES.mod;
  const params = new URLSearchParams({ game_versions: JSON.stringify([mcVersion]) });
  if (kind.loader) params.set('loaders', JSON.stringify([kind.loader]));
  const versions = await apiGet(`/project/${projectIdOrSlug}/version?${params.toString()}`);
  if (!versions.length) return null;
  const version = versions[0];
  const file = version.files.find((f) => f.primary) || version.files[0];
  if (!file) return null;
  return {
    versionNumber: version.version_number,
    filename: file.filename,
    url: file.url,
    size: file.size,
    sha1: file.hashes && file.hashes.sha1,
    // Only "required" deps that point at another project (not a pinned
    // version) are worth auto-installing - e.g. a mod that needs Fabric API.
    dependencies: (version.dependencies || [])
      .filter((d) => d.dependency_type === 'required' && d.project_id)
      .map((d) => d.project_id),
  };
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    const tmpPath = `${destPath}.part`;
    const file = fs.createWriteStream(tmpPath);
    https
      .get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(tmpPath);
          downloadFile(res.headers.location, destPath).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          file.close();
          reject(new Error(`Download failed with status ${res.statusCode} for ${url}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            fs.renameSync(tmpPath, destPath);
            resolve(destPath);
          });
        });
      })
      .on('error', (err) => {
        file.close();
        fs.rm(tmpPath, { force: true }, () => {});
        reject(err);
      });
  });
}

/** Downloads a project's best-matching file straight into the given folder (mods/resourcepacks/shaderpacks). */
async function installMod(projectIdOrSlug, mcVersion, destDir, opts = {}) {
  const file = await getBestVersionFile(projectIdOrSlug, mcVersion, opts);
  if (!file) throw new Error(`No compatible build of this project is available for Minecraft ${mcVersion}.`);
  const destPath = path.join(destDir, file.filename);
  await downloadFile(file.url, destPath);
  return { ...file, path: destPath };
}

function removeMod(filename, modsDir) {
  const target = path.join(modsDir, filename);
  if (fs.existsSync(target)) fs.unlinkSync(target);
}

module.exports = { searchMods, getProject, getBestVersionFile, installMod, removeMod, downloadFile };
