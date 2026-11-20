/* Picross (nonogram) */
(function(){
function clues(line){ const out = []; let run = 0; line.forEach(v => { if (v) run++; else if (run){ out.push(run); run = 0; } }); if (run) out.push(run); return out.length ? out : [0]; }
function level(k){
  const d = k.data, n = Math.min(8, 5 + Math.floor((d.lvl - 1) / 2)); d.n = n;
  do { d.sol = Array.from({length:n*n}, () => Math.random() < .58 ? 1 : 0); } while (d.sol.every(v => !v));
  d.g = Array(n*n).fill(0); d.rows = []; d.cols = [];
  for (let y=0;y<n;y++) d.rows.push(clues(d.sol.slice(y*n, y*n+n)));
  for (let x=0;x<n;x++) d.cols.push(clues([...Array(n).keys()].map(y => d.sol[y*n+x])));
  render(k); k.hud('lv', '🖼️ puzzle ' + d.lvl + ' (' + n + '×' + n + ')');
}
function render(k){
  const d = k.data, n = d.n, cs = 'minmax(0,1fr)';
  const rowOk = (y) => JSON.stringify(clues(d.g.slice(y*n, y*n+n).map(v => v === 1 ? 1 : 0))) === JSON.stringify(d.rows[y]);
  const colOk = (x) => JSON.stringify(clues([...Array(n).keys()].map(y => d.g[y*n+x] === 1 ? 1 : 0))) === JSON.stringify(d.cols[x]);
  let h = '<div class="krow"><button class="btn small' + (d.mode === 1 ? ' green' : '') + '" id="pcF">⬛ FILL</button><button class="btn small' + (d.mode === 2 ? ' red' : '') + '" id="pcX">✖ MARK EMPTY</button></div>';
  h += '<div style="display:grid;grid-template-columns:auto repeat(' + n + ',' + cs + ');gap:2px;width:min(100%,440px);margin:0 auto;font-size:' + (n > 6 ? 10 : 12) + 'px">';
  h += '<div></div>' + d.cols.map((c, x) => '<div style="text-align:center;line-height:1.15;color:' + (colOk(x) ? '#55ff55' : '#ffff55') + ';padding-bottom:3px">' + c.join('<br>') + '</div>').join('');
  for (let y=0;y<n;y++){
    h += '<div style="text-align:right;padding-right:5px;white-space:nowrap;align-self:center;color:' + (rowOk(y) ? '#55ff55' : '#ffff55') + '">' + d.rows[y].join(' ') + '</div>';
    for (let x=0;x<n;x++){ const v = d.g[y*n+x]; h += '<div data-i="' + (y*n+x) + '" style="aspect-ratio:1;border:2px solid #000;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;color:#ff5555;background:' + (v === 1 ? '#55ddff' : '#f0eef8') + ';' + (x % 5 === 4 && x < n - 1 ? 'margin-right:2px;' : '') + '">' + (v === 2 ? '✖' : '') + '</div>'; }
  }
  k.root.innerHTML = h + '</div><div class="kmsg">Clues turn green when a row/column matches</div>';
  k.root.querySelector('#pcF').addEventListener('click', () => { d.mode = 1; render(k); });
  k.root.querySelector('#pcX').addEventListener('click', () => { d.mode = 2; render(k); });
  k.root.querySelectorAll('[data-i]').forEach(c => { c.addEventListener('pointerdown', e => { e.preventDefault(); d.paint = d.g[+c.dataset.i] === d.mode ? 0 : d.mode; set(k, +c.dataset.i); }); c.addEventListener('pointerenter', e => { if (e.buttons && d.paint != null) set(k, +c.dataset.i); }); });
}
function set(k, i){
  const d = k.data; if (!k.running || d.g[i] === d.paint) return; d.g[i] = d.paint; k.beep(d.paint === 1 ? 600 : 300, .02, 'square', .03);
  const n = d.n, ok = [...Array(n).keys()].every(y => JSON.stringify(clues(d.g.slice(y*n, y*n+n).map(v => v === 1 ? 1 : 0))) === JSON.stringify(d.rows[y])) && [...Array(n).keys()].every(x => JSON.stringify(clues([...Array(n).keys()].map(y => d.g[y*n+x] === 1 ? 1 : 0))) === JSON.stringify(d.cols[x]));
  render(k);
  if (ok){ d.paint = null; k.add(100 * n, 200, 60, '#55ff55'); k.good(); k.flash('#55ddff', .2); k.addTime(30); d.lvl++; setTimeout(() => { if (k.running) level(k); }, 900); }
}
addEventListener('pointerup', () => { try { Kit._k.data.paint = null; } catch(e){} });
Kit.def({
  dom:true, winAt:1000,
  how:'Paint the hidden picture. The numbers say how many filled squares are in each row and column, in order, with at least one gap between groups (e.g. "2 1" = two filled, a gap, then one). Use ✖ to mark squares you know are empty. Drag to paint several. Each solve adds 30 seconds; puzzles grow from 5×5 to 8×8.',
  init(k){ const d = k.data; d.lvl = 1; d.mode = 1; level(k); k.timer(150); },
  timeUp(k){ k.over({ lines:['🖼️ Solved ' + (k.data.lvl - 1) + ' picross puzzles'] }); }
});
})();
