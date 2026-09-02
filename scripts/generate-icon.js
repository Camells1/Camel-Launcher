const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { GRID, PALETTE, COLS, ROWS } = require('../src/camelArt');

const SCALE = 10;
const CANVAS = 256;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const png = new PNG({ width: CANVAS, height: CANVAS });

const artWidth = COLS * SCALE;
const artHeight = ROWS * SCALE;
const offsetX = Math.round((CANVAS - artWidth) / 2);
const offsetY = Math.round((CANVAS - artHeight) / 2);

for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    const code = GRID[row][col];
    if (code === '.') continue;
    const [r, g, b] = hexToRgb(PALETTE[code]);
    for (let dy = 0; dy < SCALE; dy++) {
      for (let dx = 0; dx < SCALE; dx++) {
        const x = offsetX + col * SCALE + dx;
        const y = offsetY + row * SCALE + dy;
        const idx = (CANVAS * y + x) << 2;
        png.data[idx] = r;
        png.data[idx + 1] = g;
        png.data[idx + 2] = b;
        png.data[idx + 3] = 255;
      }
    }
  }
}

const outDir = path.join(__dirname, '..', 'build');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'icon.png');
png.pack().pipe(fs.createWriteStream(outPath)).on('finish', () => {
  console.log('Wrote', outPath);
});
