/* Gem Swap */
(function(){
const N = 8, GEMS = ['💎','🔴','🟡','🟢','🟣','🔷'];
const rnd = () => Math.floor(Math.random() * GEMS.length);
function findMatches(g){
  const m = new Set();
  for (let y=0;y<N;y++) for (let x=0;x<N-2;x++){ const v = g[y*N+x]; if (v >= 0 && v === g[y*N+x+1] && v === g[y*N+x+2]){ let e = x; while (e < N && g[y*N+e] === v){ m.add(y*N+e); e++; } } }
  for (let x=0;x<N;x++) for (let y=0;y<N-2;y++){ const v = g[y*N+x]; if (v >= 0 && v === g[(y+1)*N+x] && v === g[(y+2)*N+x]){ let e = y; while (e < N && g[e*N+x] === v){ m.add(e*N+x); e++; } } }
  return m;
}
function hasMove(g){ for (let i=0;i<N*N;i++) for (const j of [i + 1, i + N]){ if (j >= N*N || (j === i + 1 && i % N === N - 1)) continue; [g[i], g[j]] = [g[j], g[i]]; const ok = findMatches(g).size > 0; [g[i], g[j]] = [g[j], g[i]]; if (ok) return true; } return false; }
function fresh(){ let g; do { g = Array.from({length:N*N}, rnd); let m; while ((m = findMatches(g)).size) m.forEach(i => g[i] = rnd()); } while (!hasMove(g)); return g; }
function render(k, hl){
  const d = k.data;
  if (!d.cells){
    k.root.innerHTML = '<div class="kmsg" id="m3M">Swap neighbours to match 3+</div><div class="kgrid" id="m3G" style="grid-template-columns:repeat(8,1fr);gap:3px;width:min(100%,430px);touch-action:none"></div>';
    const G = k.root.querySelector('#m3G'); d.cells = [];
    for (let i=0;i<N*N;i++){ const b = document.createElement('button'); b.className = 'kcell'; b.style.cssText = 'aspect-ratio:1;font-size:clamp(18px,6vw,32px);background:#221a3a;transition:transform .12s,opacity .15s'; b.dataset.i = i; G.appendChild(b); d.cells.push(b); }
    G.addEventListener('pointerdown', e => { const b = e.target.closest('[data-i]'); if (!b) return; e.preventDefault(); d.drag = { i:+b.dataset.i, x:e.clientX, y:e.clientY }; });
    G.addEventListener('pointerup', e => { const s = d.drag; d.drag = null; if (!s) return; const dx = e.clientX - s.x, dy = e.clientY - s.y; if (Math.hypot(dx, dy) > 18){ const j = Math.abs(dx) > Math.abs(dy) ? s.i + (dx > 0 ? 1 : -1) : s.i + (dy > 0 ? N : -N); tryPair(k, s.i, j); } else select(k, s.i); });
  }
  d.g.forEach((v, i) => { const c = d.cells[i]; c.textContent = v >= 0 ? GEMS[v] : ''; c.style.background = i === d.sel ? '#5a3ad0' : (hl && hl.has(i)) ? '#ffffff' : '#221a3a'; c.style.transform = hl && hl.has(i) ? 'scale(1.25)' : ''; c.style.opacity = hl && hl.has(i) ? '.4' : '1'; });
}
function select(k, i){ const d = k.data; if (d.busy) return; if (d.sel < 0){ d.sel = i; k.beep(500, .02); render(k); return; } const s = d.sel; d.sel = -1; if (s === i){ render(k); return; } tryPair(k, s, i); }
function tryPair(k, a, b){
  const d = k.data; if (d.busy || !k.running) return;
  const adj = (Math.abs(a - b) === 1 && Math.floor(a / N) === Math.floor(b / N)) || Math.abs(a - b) === N;
  if (!adj || b < 0 || b >= N * N){ d.sel = -1; render(k); return; }
  [d.g[a], d.g[b]] = [d.g[b], d.g[a]];
  if (!findMatches(d.g).size){ [d.g[a], d.g[b]] = [d.g[b], d.g[a]]; k.beep(150, .06); k.shake(3); d.sel = -1; render(k); return; }
  d.busy = true; d.moves++; d.chain = 0; render(k); setTimeout(() => cascade(k), 140);
}
function cascade(k){
  const d = k.data, m = findMatches(d.g);
  if (!m.size){ d.busy = false; if (!hasMove(d.g)){ k.pop(200, 120, 'NO MOVES · SHUFFLE!', '#ff55ff'); d.g = fresh(); } render(k); return; }
  d.chain++;
  // five-or-more of one gem clears every gem of that type
  const counts = {}; m.forEach(i => counts[d.g[i]] = (counts[d.g[i]] || 0) + 1);
  Object.keys(counts).forEach(v => { if (counts[v] >= 5){ d.g.forEach((x, i) => { if (x === +v) m.add(i); }); k.pop(200, 80, GEMS[v] + ' COLOR BOMB!', '#ffaa00'); k.shake(8); } });
  const pts = m.size * 10 * d.chain; k.add(pts, 200, 40, d.chain > 1 ? '#ffaa00' : '#ffff55');
  if (d.chain > 1) k.pop(200, 70, 'CASCADE x' + d.chain + '!', '#55ffff');
  k.beep(500 + d.chain * 120, .08, 'triangle', .1); m.forEach(i => k.burstEl(d.cells[i], ['#ffffff','#ffff55','#ff55ff'], 2));
  render(k, m);
  setTimeout(() => {
    m.forEach(i => d.g[i] = -1);
    for (let x=0;x<N;x++){ const col = []; for (let y=N-1;y>=0;y--) if (d.g[y*N+x] >= 0) col.push(d.g[y*N+x]); for (let y=N-1, c=0; y>=0; y--, c++) d.g[y*N+x] = c < col.length ? col[c] : rnd(); }
    render(k); setTimeout(() => cascade(k), 160);
  }, 220);
}
Kit.def({
  dom:true, winAt:1500,
  how:'Swap two neighbouring gems (tap one then the other, or swipe it) to line up 3 or more of the same. Matches that cause new matches = CASCADE multipliers. Line up 5 of one gem for a COLOR BOMB that clears every gem of that type. 90 seconds.',
  init(k){ const d = k.data; d.g = fresh(); d.sel = -1; d.busy = false; d.moves = 0; d.cells = null; render(k); k.timer(90); },
  timeUp(k){ k.over({ lines:['💎 ' + k.data.moves + ' swaps'] }); }
});
})();
