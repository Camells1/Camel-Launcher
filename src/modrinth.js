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

/**
 * Searches (or browses, if query is empty) every Modrinth mod compatible with
 * Fabric + a specific Minecraft version. Supports paging via offset.
 */
async function searchMods(query, mcVersion, { limit = 30, offset = 0 } = {}) {
  const facets = JSON.stringify([
    ['project_type:mod'],
    ['categories:fabric'],
    [`versions:${mcVersion}`],
  ]);
  const params = new URLSearchParams({
    query: query || '',
    facets,
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
  };
}

/** Finds the best matching Fabric version file for a project + Minecraft version. */
async function getBestVersionFile(projectIdOrSlug, mcVersion) {
  const params = new URLSearchParams({
    loaders: JSON.stringify(['fabric']),
    game_versions: JSON.stringify([mcVersion]),
  });
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

/** Downloads a mod's best-matching jar straight into the instance's mods folder. */
async function installMod(projectIdOrSlug, mcVersion, modsDir) {
  const file = await getBestVersionFile(projectIdOrSlug, mcVersion);
  if (!file) throw new Error(`No Fabric build of this mod is available for Minecraft ${mcVersion}.`);
  const destPath = path.join(modsDir, file.filename);
  await downloadFile(file.url, destPath);
  return { ...file, path: destPath };
}

function removeMod(filename, modsDir) {
  const target = path.join(modsDir, filename);
  if (fs.existsSync(target)) fs.unlinkSync(target);
}

module.exports = { searchMods, getProject, getBestVersionFile, installMod, removeMod, downloadFile };
