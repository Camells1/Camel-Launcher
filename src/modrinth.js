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

// Mods only exist for a specific loader, so mod searches and mod version
// lookups are filtered by whichever loader the instance actually uses.
// Resource packs and shaders are loader-agnostic on Modrinth's side (shaders
// are tagged with their own "iris"/"optifine" category rather than a real
// loader facet), so `usesLoader: false` keeps that facet off those searches.
const PROJECT_TYPES = {
  mod: { type: 'mod', usesLoader: true },
  resourcepack: { type: 'resourcepack', usesLoader: false },
  shader: { type: 'shader', usesLoader: false },
  modpack: { type: 'modpack', usesLoader: false },
};

/** The loader facet to apply, or null when this project type ignores loaders. */
function loaderFacetFor(projectType, loader) {
  const kind = PROJECT_TYPES[projectType] || PROJECT_TYPES.mod;
  return kind.usesLoader && loader ? loader : null;
}

/**
 * Searches (or browses, if query is empty) Modrinth for a given project type
 * (mod/resourcepack/shader/modpack) compatible with a specific Minecraft
 * version. Pass mcVersion = null to browse across every game version.
 * Supports paging via offset.
 */
async function searchMods(query, mcVersion, { limit = 30, offset = 0, projectType = 'mod', loader = null } = {}) {
  const kind = PROJECT_TYPES[projectType] || PROJECT_TYPES.mod;
  const facets = [[`project_type:${kind.type}`]];
  if (mcVersion) facets.push([`versions:${mcVersion}`]);
  const loaderFacet = loaderFacetFor(projectType, loader);
  if (loaderFacet) facets.push([`categories:${loaderFacet}`]);
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
      // Modpack cards show which loader + game versions a pack targets, the
      // way Modrinth's own browse list does.
      gameVersions: hit.versions || [],
      categories: hit.categories || [],
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

/**
 * Looks up many projects in one request. Used after a modpack install to
 * backfill titles and icons for the mods the pack pinned, without firing one
 * request per mod.
 */
async function getProjects(ids) {
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length) return [];
  const params = new URLSearchParams({ ids: JSON.stringify(unique) });
  const list = await apiGet(`/projects?${params.toString()}`);
  return list.map((p) => ({ id: p.id, slug: p.slug, title: p.title, iconUrl: p.icon_url, projectType: p.project_type }));
}

/** Finds the best matching version file for a project + Minecraft version. */
async function getBestVersionFile(projectIdOrSlug, mcVersion, { projectType = 'mod', loader = null } = {}) {
  const params = new URLSearchParams({ game_versions: JSON.stringify([mcVersion]) });
  const loaderFacet = loaderFacetFor(projectType, loader);
  if (loaderFacet) params.set('loaders', JSON.stringify([loaderFacet]));
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

module.exports = {
  searchMods,
  getProject,
  getProjects,
  getBestVersionFile,
  installMod,
  removeMod,
  downloadFile,
  apiGet,
  USER_AGENT,
};
