/* Peg Solitaire (English board) */
(function(){
const LAYOUT = ['..XXX..','..XXX..','XXXXXXX','XXXXXXX','XXXXXXX','..XXX..','..XXX..'];
const valid = (x, y) => y >= 0 && y < 7 && x >= 0 && x < 7 && LAYOUT[y][x] === 'X';
function moves(d, x, y){ const out = []; [[2,0],[-2,0],[0,2],[0,-2]].forEach(([dx, dy]) => { const tx = x + dx, ty = y + dy, mx = x + dx/2, my = y + dy/2; if (valid(tx, ty) && d.b[y][x] && d.b[my][mx] && !d.b[ty][tx]) out.push([tx, ty, mx, my]); }); return out; }
function anyMove(d){ for (let y=0;y<7;y++) for (let x=0;x<7;x++) if (valid(x, y) && moves(d, x, y).length) return true; return false; }
function left(d){ let n = 0; d.b.forEach(r => r.forEach(v => n += v ? 1 : 0)); return n; }
function render(k){
  const d = k.data, sm = d.sel ? moves(d, d.sel[0], d.sel[1]) : [];
  let h = '<div class="kmsg">Pegs left: <b style="color:#ffff55">' + left(d) + '</b> · undo: ' + d.undos + '</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;width:min(100%,400px);margin:0 auto;background:#5a3a1a;border:4px solid #000;padding:8px;border-radius:12px">';
  for (let y=0;y<7;y++) for (let x=0;x<7;x++){
    if (!valid(x, y)){ h += '<div></div>'; continue; }
    const sel = d.sel && d.sel[0] === x && d.sel[1] === y, tgt = sm.some(m => m[0] === x && m[1] === y);
    h += '<button data-x="' + x + '" data-y="' + y + '" style="aspect-ratio:1;border-radius:50%;border:3px solid #000;cursor:pointer;padding:0;background:' + (d.b[y][x] ? (sel ? 'radial-gradient(circle at 35% 35%,#fff,#ffd23a)' : 'radial-gradient(circle at 35% 35%,#fff,#3a9aff)') : tgt ? 'rgba(85,255,85,.5)' : '#2a1a0a') + ';' + (sel ? 'box-shadow:0 0 12px #ffd23a;' : '') + '"></button>';
  }
  h += '</div><div class="krow"><button class="btn" id="pgU">↶ UNDO</button><button class="btn red" id="pgE">🏁 FINISH</button></div>';
  k.root.innerHTML = h;
  k.root.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', () => tap(k, +b.dataset.x, +b.dataset.y)));
  k.root.querySelector('#pgU').addEventListener('click', () => { if (d.hist.length && d.undos > 0){ d.b = d.hist.pop(); d.undos--; d.sel = null; k.beep(300, .05); render(k); } });
  k.root.querySelector('#pgE').addEventListener('click', () => end(k));
}
function tap(k, x, y){
  const d = k.data; if (!k.running) return;
  if (d.b[y][x]){ d.sel = moves(d, x, y).length ? [x, y] : null; if (!d.sel) k.beep(150, .04); else k.beep(500, .03); render(k); return; }
  if (!d.sel) return;
  const m = moves(d, d.sel[0], d.sel[1]).find(mv => mv[0] === x && mv[1] === y);
  if (!m){ d.sel = null; render(k); return; }
  d.hist.push(d.b.map(r => r.slice()));
  d.b[d.sel[1]][d.sel[0]] = 0; d.b[m[3]][m[2]] = 0; d.b[y][x] = 1; d.sel = null;
  k.hit(10); k.beep(400 + (32 - left(d)) * 15, .05);
  render(k);
  if (!anyMove(d)) setTimeout(() => end(k), 500);
}
function end(k){
  const d = k.data, n = left(d), center = n === 1 && d.b[3][3];
  const bonus = n === 1 ? (center ? 1500 : 800) : Math.max(0, (8 - n) * 60);
  k.add(bonus);
  k.over({ title:n === 1 ? (center ? '🏆 PERFECT: ONE PEG IN THE CENTER!' : '🎉 ONLY ONE PEG LEFT!') : '📍 ' + n + ' PEGS LEFT', lines:[n <= 2 ? 'Genius level.' : n <= 4 ? 'Very good. Most people leave 5+.' : 'Try to keep pegs together next time.'] });
}
Kit.def({
  dom:true, winAt:600,
  how:'Tap a peg, then tap an empty hole two spaces away to jump over (and remove) the peg in between. Only straight jumps, no diagonals. Try to end with just ONE peg (ideally in the center). 3 undos. The game ends when no jumps are left.',
  init(k){ const d = k.data; d.b = LAYOUT.map((r, y) => [...r].map((c, x) => c === 'X' && !(x === 3 && y === 3) ? 1 : 0)); d.sel = null; d.hist = []; d.undos = 3; render(k); }
});
})();
