// A hand-pixeled camel, drawn to evoke Minecraft's own Camel mob (sandy coat,
// one hump, tall lanky legs, long neck) as an ORIGINAL piece of pixel art --
// not a reproduction of Mojang's copyrighted texture. Built from shape
// primitives (rather than hand-typed grid strings) so the silhouette can
// actually be reasoned about and tweaked; a 1px outline is then computed
// automatically so it reads cleanly against any background.
// Shared between the renderer (draws it as crisp SVG rects) and the icon
// generation script (rasterizes it to a PNG for the window/taskbar icon), so
// both stay pixel-identical.

const COLS = 33;
const ROWS = 20;

function buildGrid() {
  const g = Array.from({ length: ROWS }, () => Array(COLS).fill('.'));
  const rect = (x0, y0, x1, y1, c) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (y >= 0 && y < ROWS && x >= 0 && x < COLS) g[y][x] = c;
    }
  };
  const set = (x, y, c) => { if (y >= 0 && y < ROWS && x >= 0 && x < COLS) g[y][x] = c; };

  // Body
  rect(6, 9, 25, 13, 'B');
  rect(9, 8, 22, 8, 'B');   // shoulder line - rounds the top slightly
  rect(6, 14, 25, 14, 'D'); // belly shadow

  // Hump (single, rounded)
  rect(13, 8, 20, 8, 'B');
  rect(12, 9, 21, 9, 'B');
  rect(12, 5, 21, 8, 'B');
  rect(14, 4, 19, 4, 'B');
  rect(16, 3, 17, 3, 'B');
  rect(12, 10, 21, 10, 'S'); // saddle strap across the hump base

  // Tail - hangs off the back at mid-body height
  rect(3, 11, 5, 12, 'B');
  rect(3, 13, 4, 13, 'D');

  // Neck - diagonal riser from body to head
  set(23, 8, 'B'); set(24, 8, 'B');
  set(24, 7, 'B'); set(25, 7, 'B');
  set(25, 6, 'B'); set(26, 6, 'B');
  set(26, 5, 'B'); set(27, 5, 'B');
  rect(26, 4, 28, 4, 'B');

  // Head - rounded block, small ear, projecting muzzle
  rect(25, 2, 29, 5, 'B');
  rect(26, 1, 28, 1, 'B'); // rounded crown
  set(27, 0, 'B');         // ear nub
  set(28, 3, 'E');         // eye
  rect(29, 4, 31, 5, 'D'); // muzzle
  set(29, 6, 'D');         // mouth line

  // Legs - thigh (3px) tapering to shin (2px), hoof darker
  const leg = (x) => {
    rect(x, 14, x + 2, 15, 'B');
    rect(x, 16, x + 1, 17, 'B');
    rect(x, 18, x + 1, 18, 'D');
  };
  leg(7); leg(12); leg(18); leg(22);

  return g;
}

// A 1px outline reads far more crisply than a flat, unbordered silhouette -
// every empty cell touching the art (including diagonals) becomes an outline
// pixel, computed once here rather than hand-placed.
function addOutline(grid) {
  const out = grid.map((row) => row.slice());
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (grid[y][x] !== '.') continue;
      let touches = false;
      for (let dy = -1; dy <= 1 && !touches; dy++) {
        for (let dx = -1; dx <= 1 && !touches; dx++) {
          if (!dx && !dy) continue;
          const ny = y + dy, nx = x + dx;
          if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS && grid[ny][nx] !== '.') touches = true;
        }
      }
      if (touches) out[y][x] = 'O';
    }
  }
  return out;
}

const GRID = addOutline(buildGrid()).map((row) => row.join(''));

const PALETTE = {
  B: '#e0bc8a', // sandy coat
  D: '#b8895a', // shadow / hooves / snout
  S: '#8a5a3a', // saddle strap on the hump
  E: '#1c1108', // eye
  O: '#2a1a0d', // outline
};

module.exports = { GRID, PALETTE, COLS, ROWS };
