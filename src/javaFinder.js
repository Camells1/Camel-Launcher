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
      .sort()
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

/** Best-effort local Java discovery. Returns a path/command usable with spawn, or null. */
function findJava(overridePath) {
  if (overridePath && fs.existsSync(overridePath)) return overridePath;
  return findFromJavaHome() || findInWindowsInstallDirs() || findOnPath();
}

module.exports = { findJava, isValidJava };
