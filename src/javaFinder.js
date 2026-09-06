const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const WIN_JAVA_DIRS = [
  'C:\\Program Files\\Eclipse Adoptium',
  'C:\\Program Files\\Java',
  'C:\\Program Files\\Microsoft\\jdk-21',
  'C:\\Program Files\\Microsoft',
  'C:\\Program Files\\Zulu',
];

function exeName() {
  return process.platform === 'win32' ? 'javaw.exe' : 'java';
}

// Compares version-ish folder names (e.g. "jdk-21.0.1+12" vs "jdk-8.0.302")
// by their numeric components instead of lexicographically, so "jdk-8..."
// doesn't outrank "jdk-21..." just because '8' > '2' as a character.
function compareVersionDirs(a, b) {
  const numsOf = (name) => (name.match(/\d+/g) || []).map(Number);
  const av = numsOf(a);
  const bv = numsOf(b);
  for (let i = 0; i < Math.max(av.length, bv.length); i++) {
    const diff = (av[i] || 0) - (bv[i] || 0);
    if (diff !== 0) return diff;
  }
  return a.localeCompare(b);
}

function isValidJava(javaPath) {
  try {
    execFileSync(javaPath, ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function findFromJavaHome() {
  const home = process.env.JAVA_HOME;
  if (!home) return null;
  const candidate = path.join(home, 'bin', exeName());
  return fs.existsSync(candidate) ? candidate : null;
}

function findInWindowsInstallDirs() {
  if (process.platform !== 'win32') return null;
  for (const dir of WIN_JAVA_DIRS) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    const versionDirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort(compareVersionDirs)
      .reverse();
    for (const versionDir of versionDirs) {
      const candidate = path.join(dir, versionDir, 'bin', exeName());
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function findOnPath() {
  const fallback = process.platform === 'win32' ? 'javaw' : 'java';
  return isValidJava(fallback) ? fallback : null;
}

// electron-builder's extraResources ships our own copy of Java 21 at
// resources/jre (see scripts/fetch-jre.js) so nobody has to install Java
// themselves. process.resourcesPath always exists under Electron - in dev
// (unpacked) it points at Electron's own resources dir, which naturally has
// no "jre" folder, so this just falls through there instead of finding one.
function findBundledJre() {
  if (!process.resourcesPath) return null;
  const candidate = path.join(process.resourcesPath, 'jre', 'bin', exeName());
  return fs.existsSync(candidate) ? candidate : null;
}

/** Best-effort local Java discovery. Returns a path/command usable with spawn, or null. */
function findJava(overridePath) {
  if (overridePath && fs.existsSync(overridePath)) return overridePath;
  return findFromJavaHome() || findInWindowsInstallDirs() || findOnPath() || findBundledJre();
}

module.exports = { findJava, isValidJava };
