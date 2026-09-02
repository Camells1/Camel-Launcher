// A hand-pixeled blocky camel, drawn to evoke Minecraft's own Camel mob
// (sandy coat, one hump, notably tall lanky legs, long neck) as an ORIGINAL
// piece of pixel art -- not a reproduction of Mojang's copyrighted texture.
// Stored as a grid of color codes shared between the renderer (draws it as
// crisp SVG rects) and the icon-generation script (rasterizes it to a PNG
// for the window/taskbar icon), so both stay pixel-identical.

const GRID = [
  '...................DBBB.',
  '......SSSSSS.......BBEDD',
  '......BBBBBB.....BBBBBDD',
  '......BBBBBB.....BB.....',
  '......BBBBBB...BBBB.....',
  '......BBBBBB...BB.......',
  'DDBBBBBBBBBBBBBBB.......',
  'DDBBBBBBBBBBBBBB........',
  '..BBBBBBBBBBBBBB........',
  '..DDDDDDDDDDDDDD........',
  '...BB.BB..BB.BB.........',
  '...BB.BB..BB.BB.........',
  '...BB.BB..BB.BB.........',
  '...BB.BB..BB.BB.........',
  '...BB.BB..BB.BB.........',
  '...DD.DD..DD.DD.........',
].map((row) => row.slice(0, 24).padEnd(24, '.'));

const PALETTE = {
  B: '#e0bc8a', // sandy coat
  D: '#b8895a', // shadow / hooves / snout
  S: '#8a5a3a', // rope/strap accent on the hump
  E: '#2a1c10', // eye
};

const COLS = GRID[0].length;
const ROWS = GRID.length;

module.exports = { GRID, PALETTE, COLS, ROWS };
