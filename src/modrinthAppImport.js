const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { USER_AGENT } = require('./modrinth');

// The Modrinth App (the official third-party launcher) stores each profile's
// mods as plain .jar files here. We deliberately don't touch its private
// sqlite database (app.db) - that schema is undocumented and can change
// between Modrinth App versions. Reading the actual files on disk and
// identifying them by hash against Modrinth's public API is slower but works
// on any friend's PC regardless of which Modrinth App version they have.
function profilesRoot() {
  return path.join(os.homedir(), 'AppData', 'Roaming', 'ModrinthApp', 'profiles');
}

/** Every Modrinth App profile on this PC that has at least one mod or resource pack. */
function listProfiles() {
  const root = profilesRoot();
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory());
  } catch {
    return [];
  }
  return entries
    .map((d) => {
      const { enabled, disabled } = scanProfileContent(d.name);
      return { name: d.name, modCount: enabled.length, disabledCount: disabled.length };
    })
    .filter((p) => p.modCount + p.disabledCount > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Modrinth App lays a profile out just like a real .minecraft folder - mods
// and resource packs each in their own subfolder, disabled ones renamed with
// a ".disabled" suffix in place.
const CONTENT_FOLDERS = [
  { subdir: 'mods', ext: '.jar', type: 'mod' },
  { subdir: 'resourcepacks', ext: '.zip', type: 'resourcepack' },
];

/** Every mod and resource pack file in a profile, tagged with its type and enabled state. */
function scanProfileContent(profileName) {
  const base = path.join(profilesRoot(), profileName);
  const enabled = [];
  const disabled = [];
  for (const { subdir, ext, type } of CONTENT_FOLDERS) {
    let files;
    try {
      files = fs.readdirSync(path.join(base, subdir));
    } catch {
      continue;
    }
    for (const f of files) {
      const filePath = path.join(base, subdir, f);
      if (f.endsWith(ext)) enabled.push({ path: filePath, type });
      else if (f.endsWith(ext + '.disabled')) disabled.push({ path: filePath, type });
    }
  }
  return { enabled, disabled };
}

function sha1File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha1');
    fs.createReadStream(filePath)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });
}

/** Bulk-identifies files by content hash in one request instead of one lookup per mod. */
async function resolveByHash(hashes) {
  if (!hashes.length) return {};
  const res = await fetch('https://api.modrinth.com/v2/version_files', {
    method: 'POST',
    headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/json' },
    body: JSON.stringify({ hashes, algorithm: 'sha1' }),
  });
  if (!res.ok) throw new Error(`Modrinth hash lookup failed with status ${res.status}`);
  return res.json(); // { [sha1]: versionObject }
}

module.exports = { profilesRoot, listProfiles, scanProfileContent, sha1File, resolveByHash };
