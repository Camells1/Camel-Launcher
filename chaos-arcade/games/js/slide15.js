/* Slide Puzzle */
(function(){
const N = 4;
function render(k){
  const d = k.data;
  d.cells.forEach((el, i) => {
    const v = d.b[i];
    el.textContent = v || '';
    el.style.visibility = v ? 'visible' : 'hidden';
    const hue = ((v - 1) / 15) * 300;
    el.style.background = v === i + 1 ? 'hsl(' + hue + ',75%,45%)' : 'hsl(' + hue + ',35%,28%)';
  });
  k.hud('mv', '👣 ' + d.moves);
}
function moveIdx(k, i){
  const d = k.data, z = d.b.indexOf(0), zr = Math.floor(z / N), zc = z % N, r = Math.floor(i / N), c = i % N;
  if (r !== zr && c !== zc) return false;
  const step = r === zr ? (c < zc ? -1 : 1) : (r < zr ? -N : N);
  let cur = z; while (cur !== i){ d.b[cur] = d.b[cur + step]; cur += step; d.moves++; }
  d.b[i] = 0; k.beep(500 + Math.random() * 200, .03, 'square', .04);
  render(k);
  if (d.b.every((v, j) => v === (j === N*N - 1 ? 0 : j + 1))){
    const secs = Math.round(k.t), score = Math.max(100, 4000 - d.moves * 12 - secs * 6);
    k.good(); k.flash('#55ff55', .2); d.cells.forEach(el => k.burstEl(el, ['#55ff55','#ffffff'], 3));
    k.over({ score, title:'🧩 SOLVED!', lines:['🔢 ' + d.moves + ' moves · ' + secs + ' seconds'] });
  }
  return true;
}
Kit.def({
  dom:true, winAt:1,
  how:'Tap a tile in the same row or column as the gap to slide it (and everything in between). Arrow keys / swipes slide tiles into the gap too. Get 1–15 in order. Fewer moves and less time = more points. Tiles light up when they are in the right spot.',
  init(k){
    const d = k.data; d.b = [...Array(N*N - 1).keys()].map(x => x + 1).concat([0]); d.moves = 0;
    let z = N*N - 1, prev = -1;
    for (let s=0;s<220;s++){ const opts = [z - 1, z + 1, z - N, z + N].filter(n => n >= 0 && n < N*N && n !== prev && (Math.floor(n / N) === Math.floor(z / N) || n % N === z % N)); const n = k.pick(opts); d.b[z] = d.b[n]; d.b[n] = 0; prev = z; z = n; }
    k.root.innerHTML = '<div class="kgrid" id="spG" style="grid-template-columns:repeat(4,1fr);width:min(100%,400px)"></div><div class="kmsg">Bright tiles are already in place ✓</div>';
    const g = k.root.querySelector('#spG'); d.cells = [];
    for (let i=0;i<N*N;i++){ const b = document.createElement('button'); b.className = 'kcell'; b.style.cssText = 'aspect-ratio:1;font-size:clamp(22px,7vw,34px)'; b.addEventListener('pointerdown', e => { e.preventDefault(); if (k.running) moveIdx(k, i); }); g.appendChild(b); d.cells.push(b); }
    d.moves = 0; render(k);
  },
  update(dt, k){ k.hud('tm', '⏱ ' + Math.floor(k.t) + 's'); },
  key(key, k){ const z = k.data.b.indexOf(0), m = { ArrowUp:z + N, ArrowDown:z - N, ArrowLeft:z + 1, ArrowRight:z - 1 }[key]; if (m != null && m >= 0 && m < N*N && (key.includes('Up') || key.includes('Down') || Math.floor(m / N) === Math.floor(z / N))) moveIdx(k, m); },
  swipe(dir, k){ k.def_key && 0; const z = k.data.b.indexOf(0), m = { up:z + N, down:z - N, left:z + 1, right:z - 1 }[dir]; if (m >= 0 && m < N*N && (dir === 'up' || dir === 'down' || Math.floor(m / N) === Math.floor(z / N))) moveIdx(k, m); }
});
})();
