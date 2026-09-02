const fs = require('fs');
const path = require('path');

/** Finds the newest crash report written after `sinceMs` (i.e. produced by the run that just exited). */
function findLatestCrashReport(instanceDir, sinceMs) {
  const dir = path.join(instanceDir, 'crash-reports');
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch {
    return null;
  }
  let latest = null;
  for (const name of files) {
    if (!name.endsWith('.txt')) continue;
    const full = path.join(dir, name);
    let mtimeMs;
    try {
      mtimeMs = fs.statSync(full).mtimeMs;
    } catch {
      continue;
    }
    if (mtimeMs < sinceMs) continue;
    if (!latest || mtimeMs > latest.mtimeMs) latest = { path: full, name, mtimeMs };
  }
  return latest;
}

/** Pulls a short human-readable summary (description + top exception line) out of a crash report. */
function summarizeCrashReport(reportPath) {
  let text;
  try {
    text = fs.readFileSync(reportPath, 'utf-8');
  } catch {
    return null;
  }
  const descMatch = text.match(/^Description:\s*(.+)$/m);
  const description = descMatch ? descMatch[1].trim() : null;

  // The exception line is the first non-blank line after "Description: ...".
  let exceptionLine = null;
  if (descMatch) {
    const after = text.slice(descMatch.index + descMatch[0].length);
    const lines = after.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    exceptionLine = lines[0] || null;
  }
  return { description, exceptionLine, path: reportPath };
}

module.exports = { findLatestCrashReport, summarizeCrashReport };
