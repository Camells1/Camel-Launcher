/* Block Drop */
(function(){
const C = 10, R = 20;
const SHAPES = {
  I:[[0,1],[1,1],[2,1],[3,1]], O:[[1,0],[2,0],[1,1],[2,1]], T:[[1,0],[0,1],[1,1],[2,1]], S:[[1,0],[2,0],[0,1],[1,1]],
  Z:[[0,0],[1,0],[1,1],[2,1]], J:[[0,0],[0,1],[1,1],[2,1]], L:[[2,0],[0,1],[1,1],[2,1]]
};
const COL = { I:'#55ffff', O:'#ffff55', T:'#ff55ff', S:'#55ff55', Z:'#ff5555', J:'#5577ff', L:'#ffaa00' };
function bag(){ return Object.keys(SHAPES).sort(() => Math.random() - .5); }
function piece(t){ return { t, cells:SHAPES[t].map(c => c.slice()), x:3, y:-1 }; }
function fits(d, cells, x, y){ return cells.every(([cx, cy]) => { const X = x + cx, Y = y + cy; return X >= 0 && X < C && Y < R && (Y < 0 || !d.g[Y][X]); }); }
function nextPiece(k){
  const d = k.data; if (d.bag.length < 2) d.bag = d.bag.concat(bag());
  d.p = piece(d.bag.shift());
  if (!fits(d, d.p.cells, d.p.x, d.p.y)){ k.boom(); k.shake(10, .4); k.over({ lines:['🟪 ' + d.lines + ' lines · level ' + d.lvl] }); }
}
function rotate(k){
  const d = k.data, p = d.p; if (!p || p.t === 'O') return;
  const size = p.t === 'I' ? 4 : 3;
  const rc = p.cells.map(([x, y]) => [size - 1 - y, x]);
  for (const off of [0, -1, 1, -2, 2]) if (fits(d, rc, p.x + off, p.y)){ p.cells = rc; p.x += off; k.beep(700, .03); return; }
}
function move(k, dx){ const d = k.data; if (d.p && fits(d, d.p.cells, d.p.x + dx, d.p.y)){ d.p.x += dx; k.beep(400, .02, 'square', .03); } }
function lock(k){
  const d = k.data, p = d.p;
  p.cells.forEach(([x, y]) => { if (p.y + y >= 0) d.g[p.y + y][p.x + x] = COL[p.t]; });
  const full = [];
  for (let y=0;y<R;y++) if (d.g[y].every(Boolean)) full.push(y);
  if (full.length){
    const cs = d.cs;
    full.forEach(y => { for (let x=0;x<C;x++) k.burst(d.ox + x*cs + cs/2, y*cs + cs/2, [d.g[y][x], '#ffffff'], 2, 180); });
    full.forEach(y => { d.g.splice(y, 1); d.g.unshift(Array(C).fill(null)); });
    d.lines += full.length; d.streak++;
    const pts = [0, 100, 300, 500, 800][full.length] * d.lvl + (d.streak > 1 ? 50 * d.streak * d.lvl : 0);
    k.add(pts, d.ox + C*cs/2, (full[0]) * cs, full.length === 4 ? '#55ffff' : '#ffff55');
    if (full.length === 4){ k.pop(d.ox + C*cs/2, R*cs/2, 'TETRA BLAST!', '#55ffff'); k.flash('#55ffff', .2); k.shake(10, .3); k.good(); }
    else { k.shake(3 + full.length * 2, .15); k.beep(500 + full.length * 150, .1); }
    if (d.streak > 1) k.pop(d.ox + C*cs/2, R*cs/2 + 30, 'COMBO x' + d.streak, '#ffaa00');
    const lvl = 1 + Math.floor(d.lines / 10);
    if (lvl > d.lvl){ d.lvl = lvl; k.pop(d.ox + C*cs/2, R*cs/3, 'LEVEL ' + lvl + '!', '#ff55ff'); k.good(); }
    k.hud('ln', '📏 ' + d.lines + ' · LV ' + d.lvl);
  } else { d.streak = 0; k.beep(150, .04); }
  nextPiece(k);
}
function soft(k){ const d = k.data; if (!d.p) return; if (fits(d, d.p.cells, d.p.x, d.p.y + 1)){ d.p.y++; d.fall = 0; k.add(1); } else lock(k); }
function hard(k){ const d = k.data; if (!d.p) return; let n = 0; while (fits(d, d.p.cells, d.p.x, d.p.y + 1)){ d.p.y++; n++; } k.add(n * 2); k.shake(4, .1); lock(k); }
Kit.def({
  aspect:.62, winAt:2000,
  how:'Swipe ←/→ to move, tap to rotate, swipe ↓ to hard-drop. Keys: ←/→, ↑ rotate, ↓ soft drop, SPACE hard drop. Clear lines in a row for combo points. Four lines at once = TETRA BLAST.',
  controls:[{ label:'◀', down:k => move(k, -1) }, { label:'⟳', down:k => rotate(k) }, { label:'▶', down:k => move(k, 1) }, { label:'⬇', cls:'gold', down:k => hard(k) }],
  init(k){ const d = k.data; d.g = Array.from({length:R}, () => Array(C).fill(null)); d.bag = bag(); d.lines = 0; d.lvl = 1; d.fall = 0; d.streak = 0; nextPiece(k); k.hud('ln', '📏 0 · LV 1'); },
  update(dt, k){ const d = k.data; d.cs = k.H / R; d.ox = (k.W - C * d.cs) / 2 - d.cs * 1.6; d.fall += dt; const rate = Math.max(.06, .8 * Math.pow(.85, d.lvl - 1)); if (d.fall >= rate){ d.fall = 0; if (d.p && fits(d, d.p.cells, d.p.x, d.p.y + 1)) d.p.y++; else if (d.p) lock(k); } },
  draw(ctx, k){
    const d = k.data, cs = k.H / R, ox = (k.W - C * cs) / 2 - cs * 1.6;
    ctx.fillStyle = '#0a0818'; ctx.fillRect(0, 0, k.W, k.H);
    ctx.fillStyle = '#120f26'; ctx.fillRect(ox, 0, C * cs, R * cs);
    ctx.strokeStyle = '#1e1a3a'; ctx.lineWidth = 1;
    for (let x=0;x<=C;x++){ ctx.beginPath(); ctx.moveTo(ox + x*cs, 0); ctx.lineTo(ox + x*cs, R*cs); ctx.stroke(); }
    if (!d.g) return;
    const cell = (x, y, c, a) => { ctx.globalAlpha = a || 1; ctx.fillStyle = c; ctx.fillRect(ox + x*cs + 1, y*cs + 1, cs - 2, cs - 2); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(ox + x*cs + 1, y*cs + 1, cs - 2, 3); ctx.globalAlpha = 1; };
    d.g.forEach((row, y) => row.forEach((c, x) => { if (c) cell(x, y, c); }));
    if (d.p){
      let gy = d.p.y; while (fits(d, d.p.cells, d.p.x, gy + 1)) gy++;
      d.p.cells.forEach(([x, y]) => { if (gy + y >= 0) cell(d.p.x + x, gy + y, COL[d.p.t], .22); });
      d.p.cells.forEach(([x, y]) => { if (d.p.y + y >= 0) cell(d.p.x + x, d.p.y + y, COL[d.p.t]); });
    }
    const nx = ox + C * cs + 10;
    ctx.fillStyle = '#aaa'; ctx.font = 'bold 11px monospace'; ctx.fillText('NEXT', nx, 16);
    if (d.bag && d.bag[0]){ const t = d.bag[0]; SHAPES[t].forEach(([x, y]) => { ctx.fillStyle = COL[t]; ctx.fillRect(nx + x * cs * .6, 26 + y * cs * .6, cs * .6 - 2, cs * .6 - 2); }); }
  },
  key(key, k){ if (key === 'ArrowLeft' || key === 'a') move(k, -1); else if (key === 'ArrowRight' || key === 'd') move(k, 1); else if (key === 'ArrowUp' || key === 'w' || key === 'x') rotate(k); else if (key === 'ArrowDown' || key === 's') soft(k); else if (key === ' ') hard(k); },
  swipe(dir, k, dx){ if (dir === 'down') hard(k); else if (dir === 'left' || dir === 'right'){ const n = Math.max(1, Math.round(Math.abs(dx) / 30)); for (let i=0;i<n;i++) move(k, dir === 'left' ? -1 : 1); } else rotate(k); },
  up(x, y, k){ if (!k._dragged) {} },
  down(x, y, k){ k.data.tapT = performance.now(); k.data.tapX = x; k.data.tapY = y; },
  move(x, y, k, pressed){ },
  setup(k){ const stage = document.getElementById('kitStage'); stage.addEventListener('pointerup', e => { const d = k.data; if (!k.running || !d.tapT) return; const r = k.root.getBoundingClientRect(); if (Math.hypot(e.clientX - r.left - d.tapX, e.clientY - r.top - d.tapY) < 15 && performance.now() - d.tapT < 300) rotate(k); d.tapT = 0; }); }
});
})();
