/* Pipe Connect */
(function(){
// bitmask: 1 = up, 2 = right, 4 = down, 8 = left
const DIR = [[0,-1,1,4],[1,0,2,8],[0,1,4,1],[-1,0,8,2]];
function rot(m){ return ((m << 1) | (m >> 3)) & 15; }
function level(k){
  const d = k.data, n = Math.min(8, 4 + d.lvl); d.n = n;
  const g = Array(n * n).fill(0), seen = new Uint8Array(n * n), st = [Math.floor(n / 2) * n]; seen[st[0]] = 1; d.src = st[0];
  while (st.length){
    const i = st[st.length - 1], x = i % n, y = Math.floor(i / n);
    const opts = DIR.filter(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < n && ny < n && !seen[ny * n + nx]; });
    if (!opts.length || (Math.random() < .25 && st.length > 1)){ st.pop(); continue; }
    const [dx, dy, a, b] = opts[Math.floor(Math.random() * opts.length)], j = (y + dy) * n + x + dx;
    g[i] |= a; g[j] |= b; seen[j] = 1; st.push(j);
  }
  d.sol = g.slice(); d.g = g.map(m => { let r = m; for (let t=k.ri(0, 3); t>0; t--) r = rot(r); return r; });
  d.moves = 0; render(k); k.hud('lv', '🚰 level ' + d.lvl);
}
function flow(d){
  const n = d.n, on = new Set([d.src]), q = [d.src];
  while (q.length){ const i = q.pop(), x = i % n, y = Math.floor(i / n); DIR.forEach(([dx, dy, a, b]) => { const nx = x + dx, ny = y + dy, j = ny * n + nx; if (nx < 0 || ny < 0 || nx >= n || ny >= n || on.has(j)) return; if ((d.g[i] & a) && (d.g[j] & b)){ on.add(j); q.push(j); } }); }
  return on;
}
function pipeSvg(m, wet, src){
  const c = wet ? '#3ad0ff' : '#c8c8de', s = 'stroke="' + c + '" stroke-width="22" stroke-linecap="butt"';
  let p = '';
  if (m & 1) p += '<line x1="50" y1="50" x2="50" y2="0" ' + s + '/>'; if (m & 2) p += '<line x1="50" y1="50" x2="100" y2="50" ' + s + '/>';
  if (m & 4) p += '<line x1="50" y1="50" x2="50" y2="100" ' + s + '/>'; if (m & 8) p += '<line x1="50" y1="50" x2="0" y2="50" ' + s + '/>';
  p += '<circle cx="50" cy="50" r="' + (src ? 22 : 11) + '" fill="' + (src ? '#ffd23a' : c) + '"/>';
  if ([1,2,4,8].includes(m)) p += '<circle cx="50" cy="50" r="16" fill="' + (wet ? '#55ff55' : '#555') + '" stroke="#000" stroke-width="4"/>';
  return '<svg viewBox="0 0 100 100" style="width:100%;height:100%;display:block">' + p + '</svg>';
}
function render(k){
  const d = k.data, on = flow(d);
  k.root.innerHTML = '<div class="kmsg">Connect every tap 🟢 to the 🟡 source · ' + on.size + '/' + d.n * d.n + ' flowing</div><div class="kgrid" id="ppG" style="grid-template-columns:repeat(' + d.n + ',1fr);gap:2px;width:min(100%,430px)"></div>';
  const G = k.root.querySelector('#ppG');
  d.g.forEach((m, i) => { const b = document.createElement('button'); b.className = 'kcell'; b.style.cssText = 'aspect-ratio:1;padding:2px;background:' + (on.has(i) ? '#163a50' : '#221a3a') + ';transition:transform .12s'; b.innerHTML = pipeSvg(m, on.has(i), i === d.src); b.addEventListener('pointerdown', e => { e.preventDefault(); turn(k, i, b); }); G.appendChild(b); });
  if (on.size === d.n * d.n) win(k);
}
function turn(k, i, el){ const d = k.data; if (!k.running || d.busy) return; d.g[i] = rot(d.g[i]); d.moves++; k.beep(420, .03, 'square', .04); render(k); }
function win(k){
  const d = k.data; if (d.busy) return; d.busy = true;
  const par = d.n * d.n; k.add(100 * d.lvl + Math.max(0, par * 3 - d.moves) * 2, 200, 60, '#55ff55'); k.good(); k.flash('#3ad0ff', .2); k.addTime(10 + d.lvl * 2);
  setTimeout(() => { d.busy = false; d.lvl++; if (k.running) level(k); }, 800);
}
Kit.def({
  dom:true, winAt:600,
  how:'Tap a pipe to rotate it 90°. Water flows from the 🟡 source through connected pipes. Connect EVERY piece (all the 🟢 taps light up) to clear the level. Levels get bigger. Each solve adds time to the clock.',
  init(k){ k.data.lvl = 1; level(k); k.timer(90); },
  timeUp(k){ k.over({ lines:['🚰 Solved ' + (k.data.lvl - 1) + ' pipe puzzles'] }); }
});
})();
