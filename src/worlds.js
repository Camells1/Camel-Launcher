const fs = require('fs');
const path = require('path');

/** Lists singleplayer saves under an instance's saves/ folder. */
function listWorlds(instanceDir) {
  const savesDir = path.join(instanceDir, 'saves');
  let entries;
  try {
    entries = fs.readdirSync(savesDir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => {
      const worldDir = path.join(savesDir, e.name);
      let lastPlayed = 0;
      try {
        lastPlayed = fs.statSync(path.join(worldDir, 'level.dat')).mtimeMs;
      } catch {
        lastPlayed = fs.statSync(worldDir).mtimeMs;
      }
      return { name: e.name, lastPlayed };
    })
    .sort((a, b) => b.lastPlayed - a.lastPlayed);
}

function worldFolder(instanceDir, name) {
  return path.join(instanceDir, 'saves', name);
}

function deleteWorld(instanceDir, name) {
  fs.rmSync(worldFolder(instanceDir, name), { recursive: true, force: true });
}

module.exports = { listWorlds, worldFolder, deleteWorld };
