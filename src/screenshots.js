const fs = require('fs');
const path = require('path');

const IMAGE_EXT = /\.(png|jpg|jpeg)$/i;

/** Lists screenshots under an instance's screenshots/ folder, newest first. */
function listScreenshots(instanceDir) {
  const dir = path.join(instanceDir, 'screenshots');
  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return entries
    .filter((f) => IMAGE_EXT.test(f))
    .map((f) => {
      const full = path.join(dir, f);
      let mtimeMs = 0;
      try {
        mtimeMs = fs.statSync(full).mtimeMs;
      } catch {
        // file vanished between readdir and stat; drop it below
      }
      return { name: f, path: full, mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function screenshotFolder(instanceDir) {
  return path.join(instanceDir, 'screenshots');
}

function deleteScreenshot(instanceDir, name) {
  fs.rmSync(path.join(screenshotFolder(instanceDir), name), { force: true });
}

module.exports = { listScreenshots, screenshotFolder, deleteScreenshot };
