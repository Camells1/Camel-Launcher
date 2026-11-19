/* Flood It */
(function(){
const N = 12, COLORS = ['#ff4a5a','#ffaa22','#ffe33a','#3ad05a','#3a9aff','#b05aff'];
function region(d){ const seen = new Set([0]), q = [0], c0 = d.g[0]; while (q.length){ const i = q.pop(), r = Math.floor(i / N), c = i % N; [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr, dc]) => { const rr = r + dr, cc = c + dc, j = rr * N + cc; if (rr >= 0 && cc >= 0 && rr < N && cc < N && !seen.has(j) && d.g[j] === c0){ seen.add(j); q.push(j); } }); } return seen; }
function paint(k, flash){
  const d = k.data, reg = region(d);
  d.cells.forEach((el, i) => { el.style.background = COLORS[d.g[i]]; el.style.outline = reg.has(i) ? '2px solid rgba(255,255,255,.35)' : 'none'; el.style.outlineOffset = '-2px'; });
  k.hud('mv', '💧 ' + d.left + ' moves left · ' + Math.round(reg.size / (N*N) * 100) + '%');
  return reg;
}
function pick(k, c){
  const d = k.data; if (!k.running || c === d.g[0]) return;
  const reg = region(d); reg.forEach(i => d.g[i] = c); d.left--;
  const nr = region(d), gained = nr.size - reg.size;
  k.beep(300 + Math.min(900, gained * 20), .06, 'triangle', .1);
  if (gained >= 10){ k.add(gained * 2, 150, 50, '#55ffff'); k.pop(150, 80, 'BIG FLOOD!', '#55ffff'); k.shake(4); } else k.add(gained);
  paint(k);
  if (nr.size === N*N){ const score = 500 + d.left * 120 + k.score; k.good(); k.flash(COLORS[c], .3); return k.over({ score, title:'🌊 FLOODED!', lines:['💧 Done with ' + d.left + ' moves to spare'] }); }
  if (d.left <= 0){ k.bad(); return k.over({ win:false, title:'🏜️ OUT OF MOVES', lines:['🌊 Flooded ' + Math.round(nr.size / (N*N) * 100) + '% of the board'] }); }
}
Kit.def({
  dom:true, winAt:600,
  how:'You own the top-left corner. Pick a color to flood your area into every touching tile of that color. Cover the whole board in 22 moves. Big floods earn bonus points, and spare moves at the end are worth a lot.',
  init(k){
    const d = k.data; d.g = Array.from({length:N*N}, () => k.ri(0, COLORS.length - 1)); d.left = 22;
    k.root.innerHTML = '<div class="kgrid" id="flG" style="grid-template-columns:repeat(' + N + ',1fr);gap:0;width:min(100%,420px);border:3px solid #000"></div><div class="krow" id="flPad">' + COLORS.map((c, i) => '<button class="kcell" data-c="' + i + '" style="width:52px;height:52px;background:' + c + '"></button>').join('') + '</div>';
    const g = k.root.querySelector('#flG'); d.cells = [];
    for (let i=0;i<N*N;i++){ const el = document.createElement('div'); el.style.aspectRatio = '1'; el.style.transition = 'background .2s'; g.appendChild(el); d.cells.push(el); }
    k.root.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => pick(k, +b.dataset.c)));
    paint(k);
  },
  key(key, k){ const n = parseInt(key, 10); if (n >= 1 && n <= 6) pick(k, n - 1); }
});
})();
