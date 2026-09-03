// Regenerates build/icon.png (the window/taskbar/installer icon) from the
// default (ochre) badge logo in renderer/assets/logos - the same source the
// in-app rail logo uses, so the two never drift apart.
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const LOGO_PATH = path.join(__dirname, '..', 'renderer', 'assets', 'logos', 'logo-ochre.png');
const OUT_PATH = path.join(__dirname, '..', 'build', 'icon.png');
const CANVAS = 512;

const src = PNG.sync.read(fs.readFileSync(LOGO_PATH));
const out = new PNG({ width: CANVAS, height: CANVAS });
const scale = (CANVAS * 0.86) / src.width;
const destSize = Math.round(src.width * scale);
const offset = Math.round((CANVAS - destSize) / 2);
for (let y = 0; y < destSize; y++) {
  const sy = Math.min(src.height - 1, Math.floor(y / scale));
  for (let x = 0; x < destSize; x++) {
    const sx = Math.min(src.width - 1, Math.floor(x / scale));
    const sIdx = (sy * src.width + sx) << 2;
    const dIdx = ((y + offset) * CANVAS + (x + offset)) << 2;
    out.data[dIdx] = src.data[sIdx];
    out.data[dIdx + 1] = src.data[sIdx + 1];
    out.data[dIdx + 2] = src.data[sIdx + 2];
    out.data[dIdx + 3] = src.data[sIdx + 3];
  }
}

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
out.pack().pipe(fs.createWriteStream(OUT_PATH)).on('finish', () => {
  console.log('Wrote', OUT_PATH);
});
