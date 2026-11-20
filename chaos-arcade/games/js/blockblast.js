/* Block Blast */
(function(){
const N = 8;
const SHAPES = [[[0,0]],[[0,0],[1,0]],[[0,0],[0,1]],[[0,0],[1,0],[2,0]],[[0,0],[0,1],[0,2]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[2,0],[3,0]],[[0,0],[0,1],[0,2],[0,3]],
  [[0,0],[0,1],[1,1]],[[1,0],[0,1],[1,1]],[[0,0],[1,0],[0,1]],[[0,0],[1,0],[1,1]],[[0,0],[1,0],[2,0],[1,1]],[[0,0],[0,1],[0,2],[1,2]],[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]],[[0,0],[1,0],[2,0],[2,1],[2,2]],[[0,0],[1,0],[2,0],[3,0],[4,0]]];
const COLS = ['#ff5577','#ffaa33','#ffdd44','#55dd66','#44bbff','#aa66ff','#ff66cc'];
function deal(k){ const d = k.data; d.hand = [0,1,2].map(() => ({ s:k.pick(SHAPES), c:k.pick(COLS) })); }
function fits(d, s, x, y){ return s.every(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < N && Y < N && !d.g[Y*N+X]; }); }
function canPlay(d){ return d.hand.some(p => p && [...Array(N*N).keys()].some(i => fits(d, p.s, i % N, Math.floor(i / N)))); }
function render(k){
  const d = k.data;
  let h = '<div class="kgrid" id="bbG" style="grid-template-columns:repeat(8,1fr);gap:2px;width:min(100%,400px);background:#000;padding:2px">';
  for (let i=0;i<N*N;i++) h += '<div data-i="' + i + '" style="aspect-ratio:1;background:' + (d.g[i] || '#1d1838') + ';' + (d.g[i] ? 'box-shadow:inset 3px 3px 0 rgba(255,255,255,.3),inset -3px -3px 0 rgba(0,0,0,.3);' : '') + '"></div>';
  h += '</div><div class="krow" style="margin-top:14px;min-height:96px;align-items:center">';
  d.hand.forEach((p, i) => {
    if (!p){ h += '<div style="width:96px"></div>'; return; }
    const w = Math.max.apply(null, p.s.map(c => c[0])) + 1, hh = Math.max.apply(null, p.s.map(c => c[1])) + 1;
    h += '<button data-p="' + i + '" class="kcell" style="width:96px;height:96px;background:' + (d.sel === i ? '#5a3ad0' : '#221a3a') + ';padding:6px"><div style="display:grid;grid-template-columns:repeat(' + w + ',14px);grid-template-rows:repeat(' + hh + ',14px);gap:2px">';
    for (let y=0;y<hh;y++) for (let x=0;x<w;x++) h += '<div style="background:' + (p.s.some(c => c[0] === x && c[1] === y) ? p.c : 'transparent') + '"></div>';
    h += '</div></button>';
  });
  h += '</div><div class="kmsg">' + (d.sel >= 0 ? 'Now tap the board where the piece\'s top-left block should go' : 'Tap a piece, then tap the board') + '</div>';
  k.root.innerHTML = h;
  k.root.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => { d.sel = +b.dataset.p; k.beep(500, .03); render(k); }));
  const G = k.root.querySelector('#bbG');
  G.querySelectorAll('[data-i]').forEach(c => {
    c.addEventListener('pointerenter', () => preview(k, +c.dataset.i));
    c.addEventListener('click', () => place(k, +c.dataset.i));
  });
}
function preview(k, i){ const d = k.data; if (d.sel < 0 || !d.hand[d.sel]) return; const s = d.hand[d.sel].s, x = i % N, y = Math.floor(i / N), ok = fits(d, s, x, y); k.root.querySelectorAll('#bbG [data-i]').forEach(c => { const j = +c.dataset.i; if (!d.g[j]) c.style.background = '#1d1838'; }); s.forEach(([dx, dy]) => { const X = x + dx, Y = y + dy; if (X < N && Y < N){ const c = k.root.querySelector('#bbG [data-i="' + (Y*N+X) + '"]'); if (c && !d.g[Y*N+X]) c.style.background = ok ? 'rgba(85,255,85,.35)' : 'rgba(255,85,85,.35)'; } }); }
function place(k, i){
  const d = k.data; if (!k.running || d.sel < 0 || !d.hand[d.sel]) return;
  const p = d.hand[d.sel], x = i % N, y = Math.floor(i / N);
  if (!fits(d, p.s, x, y)){ k.beep(150, .06); k.shake(3); return; }
  p.s.forEach(([dx, dy]) => d.g[(y + dy) * N + x + dx] = p.c);
  k.add(p.s.length); k.beep(400 + p.s.length * 40, .05);
  d.hand[d.sel] = null; d.sel = -1;
  const rows = [], cols = [];
  for (let r=0;r<N;r++) if ([...Array(N).keys()].every(c => d.g[r*N+c])) rows.push(r);
  for (let c=0;c<N;c++) if ([...Array(N).keys()].every(r => d.g[r*N+c])) cols.push(c);
  const lines = rows.length + cols.length;
  if (lines){
    rows.forEach(r => { for (let c=0;c<N;c++) d.g[r*N+c] = null; }); cols.forEach(c => { for (let r=0;r<N;r++) d.g[r*N+c] = null; });
    d.streak++; const pts = lines * 10 * lines * (1 + d.streak * .5);
    k.add(Math.round(pts), 200, 100, '#55ffff'); k.pop(200, 140, (lines > 1 ? lines + ' LINES! ' : 'LINE! ') + (d.streak > 1 ? 'COMBO x' + d.streak : ''), '#ffaa00');
    k.good(); k.shake(3 + lines * 2); if (lines >= 3) k.flash('#55ffff', .15);
    if (d.g.every(v => !v)){ k.add(300, 200, 60, '#ff55ff'); k.pop(200, 40, '✨ BOARD CLEAR!', '#ff55ff'); }
  } else d.streak = 0;
  if (d.hand.every(h => !h)) deal(k);
  render(k);
  if (lines) k.root.querySelectorAll('#bbG [data-i]').forEach(c => { const j = +c.dataset.i; if (rows.includes(Math.floor(j / N)) || cols.includes(j % N)) k.burstEl(c, ['#ffffff','#55ffff'], 1); });
  if (!canPlay(d)) setTimeout(() => k.over({ title:'🧱 NO SPACE LEFT', lines:['🟩 ' + d.placed + ' pieces placed'] }), 600);
  d.placed++;
}
Kit.def({
  dom:true, winAt:500,
  how:'Tap one of the three pieces, then tap a board cell to place it there (the piece\'s top-left block lands on that cell; on desktop you see a preview). Fill a complete row OR column to blast it. Clearing lines on back-to-back turns builds a combo. Game over when no piece fits.',
  init(k){ const d = k.data; d.g = Array(N*N).fill(null); d.sel = -1; d.streak = 0; d.placed = 0; deal(k); render(k); }
});
})();
