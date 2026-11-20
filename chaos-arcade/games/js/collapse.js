/* Collapse */
(function(){
const W = 10, H = 12, COLS = ['#ff4a6a','#ffc93a','#3ad06a','#3a9aff','#b05aff'];
function group(d, i){ const v = d.g[i]; if (v < 0) return []; const out = [], seen = new Set([i]), q = [i]; while (q.length){ const c = q.pop(); out.push(c); const x = c % W, y = Math.floor(c / W); [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy, j = ny * W + nx; if (nx >= 0 && ny >= 0 && nx < W && ny < H && !seen.has(j) && d.g[j] === v){ seen.add(j); q.push(j); } }); } return out; }
function anyMoves(d){ for (let i=0;i<W*H;i++) if (d.g[i] >= 0 && group(d, i).length > 1) return true; return false; }
function render(k){
  const d = k.data;
  if (!d.cells){
    k.root.innerHTML = '<div class="kmsg" id="clM">Tap groups of 2 or more</div><div class="kgrid" id="clG" style="grid-template-columns:repeat(' + W + ',1fr);gap:2px;width:min(100%,400px)"></div>';
    const G = k.root.querySelector('#clG'); d.cells = [];
    for (let i=0;i<W*H;i++){ const b = document.createElement('div'); b.style.cssText = 'aspect-ratio:1;border:2px solid #000;cursor:pointer;transition:background .15s'; b.addEventListener('click', () => tap(k, i)); b.addEventListener('pointerenter', () => hover(k, i)); G.appendChild(b); d.cells.push(b); }
  }
  d.g.forEach((v, i) => { const c = d.cells[i]; c.style.background = v < 0 ? 'transparent' : COLS[v]; c.style.borderColor = v < 0 ? 'transparent' : '#000'; c.style.boxShadow = v < 0 ? 'none' : 'inset 3px 3px 0 rgba(255,255,255,.3)'; });
  k.root.querySelector('#clM').textContent = d.g.filter(v => v >= 0).length + ' blocks left';
}
function hover(k, i){ const d = k.data, gr = group(d, i); d.cells.forEach((c, j) => c.style.filter = gr.length > 1 && gr.includes(j) ? 'brightness(1.4)' : ''); if (gr.length > 1) k.root.querySelector('#clM').textContent = gr.length + ' blocks = ' + (gr.length - 1) * (gr.length - 1) * 5 + ' points'; }
function tap(k, i){
  const d = k.data; if (!k.running) return;
  const gr = group(d, i); if (gr.length < 2){ k.beep(150, .04); return; }
  gr.forEach(j => { k.burstEl(d.cells[j], [COLS[d.g[j]], '#ffffff'], 1); d.g[j] = -1; });
  const pts = (gr.length - 1) * (gr.length - 1) * 5; k.add(pts, 200, 60, gr.length >= 8 ? '#ffaa00' : '#ffff55');
  if (gr.length >= 10){ k.pop(200, 90, 'MEGA GROUP!', '#ff55ff'); k.shake(6); } k.beep(300 + gr.length * 40, .07, 'triangle', .1);
  for (let x=0;x<W;x++){ const col = []; for (let y=H-1;y>=0;y--) if (d.g[y*W+x] >= 0) col.push(d.g[y*W+x]); for (let y=H-1, c=0; y>=0; y--, c++) d.g[y*W+x] = c < col.length ? col[c] : -1; }
  const cols = []; for (let x=0;x<W;x++) if (d.g[(H-1)*W+x] >= 0) cols.push(x);
  const ng = Array(W*H).fill(-1); cols.forEach((x, nx) => { for (let y=0;y<H;y++) ng[y*W+nx] = d.g[y*W+x]; }); d.g = ng;
  d.cells.forEach(c => c.style.filter = ''); render(k);
  if (!anyMoves(d)){ const left = d.g.filter(v => v >= 0).length, bonus = left === 0 ? 1000 : Math.max(0, 300 - left * 15); k.add(bonus, 200, 40, '#55ff55'); k.over({ title:left === 0 ? '✨ BOARD CLEARED!' : '🟥 NO MOVES LEFT', lines:[left + ' blocks left · +' + bonus + ' bonus'] }); }
}
Kit.def({
  dom:true, winAt:1000,
  how:'Tap a group of 2 or more touching blocks of the same color to remove it. Bigger groups score MUCH more (a group of n is worth (n−1)² × 5). Blocks fall down and empty columns slide left. Plan ahead to build giant groups. Clearing the whole board = +1000.',
  init(k){ const d = k.data; d.g = Array.from({length:W*H}, () => k.ri(0, COLS.length - 1)); d.cells = null; render(k); }
});
})();
