const fs = require('fs');
const path = require('path');

/*
 * Vanilla Mode: a stream-safe preset that launches an instance as plain,
 * unmodified Minecraft without touching the instance's real setup.
 *
 * When it's on, a launch:
 *   - skips the mod loader entirely (no Fabric/Forge/etc, so no mods load),
 *   - turns off every resource pack (just the built-in "vanilla" one),
 *   - sets particles to "All",
 *   - caps brightness at vanilla's max (no fullbright gamma hacks).
 *
 * Nothing is deleted or renamed. options.txt is snapshotted first and merged
 * back when the game exits, so switching Vanilla Mode off afterwards puts
 * everything back exactly how it was - packs, gamma, particles, and the mod
 * keybinds that vanilla Minecraft drops when it rewrites options.txt.
 */

const SNAPSHOT_NAME = '.camel-vanilla-snapshot.txt';

// The settings Vanilla Mode forces. Anything else the player changes during a
// vanilla session (FOV, volume, a rebound key...) is kept on restore.
const FORCED = {
  resourcePacks: '["vanilla"]',
  incompatibleResourcePacks: '[]',
  particles: '0', // 0 = All
};
const MAX_VANILLA_GAMMA = 1.0; // the "Bright" end of vanilla's slider

function optionsPath(instanceDir) {
  return path.join(instanceDir, 'options.txt');
}
function snapshotPath(instanceDir) {
  return path.join(instanceDir, SNAPSHOT_NAME);
}

/** options.txt -> ordered Map of key -> raw value. Missing file -> empty map. */
function readOptions(file) {
  const map = new Map();
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf-8');
  } catch {
    return map;
  }
  for (const line of raw.split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i <= 0) continue;
    map.set(line.slice(0, i), line.slice(i + 1));
  }
  return map;
}

function writeOptions(file, map) {
  const body = [...map].map(([k, v]) => `${k}:${v}`).join('\n') + '\n';
  fs.writeFileSync(file, body);
}

/** True when a previous vanilla session never got restored (launcher closed or crashed mid-game). */
function hasPendingRestore(instanceDir) {
  return fs.existsSync(snapshotPath(instanceDir));
}

/** Snapshots options.txt and forces the vanilla settings into it. Call right before launching. */
function apply(instanceDir) {
  // A leftover snapshot means the last vanilla session never restored -
  // put that back first so we never snapshot already-vanilla'd options.
  if (hasPendingRestore(instanceDir)) restore(instanceDir);

  const file = optionsPath(instanceDir);
  const hadOptions = fs.existsSync(file);
  // An empty snapshot marks "there was no options.txt" so restore leaves
  // whatever vanilla generated rather than resurrecting nothing.
  fs.writeFileSync(snapshotPath(instanceDir), hadOptions ? fs.readFileSync(file) : '');

  const opts = readOptions(file);
  for (const [k, v] of Object.entries(FORCED)) opts.set(k, v);
  const gamma = parseFloat(opts.get('gamma'));
  if (!Number.isFinite(gamma) || gamma > MAX_VANILLA_GAMMA || gamma < 0) {
    opts.set('gamma', Number.isFinite(gamma) && gamma > MAX_VANILLA_GAMMA ? '1.0' : '0.5');
  }
  writeOptions(file, opts);
}

/**
 * Puts the pre-vanilla options back, keeping anything the player changed in
 * the vanilla session except the settings Vanilla Mode forced. Safe to call
 * when there's nothing to restore.
 */
function restore(instanceDir) {
  const snap = snapshotPath(instanceDir);
  if (!fs.existsSync(snap)) return false;
  const file = optionsPath(instanceDir);

  const before = readOptions(snap);
  if (before.size) {
    const after = readOptions(file);
    const merged = new Map(before);
    for (const [k, v] of after) {
      if (k in FORCED || k === 'gamma') continue;
      merged.set(k, v);
    }
    writeOptions(file, merged);
  }
  fs.rmSync(snap, { force: true });
  return true;
}

module.exports = { apply, restore, hasPendingRestore };
