/* Visual Memory */
(function(){
function level(k){
  const d = k.data, n = Math.min(7, 3 + Math.floor((d.lvl - 1) / 2)), cnt = Math.min(n * n - 2, 2 + d.lvl);
  d.n = n; d.on = new Set(k.shuffle([...Array(n * n).keys()]).slice(0, cnt)); d.found = new Set(); d.miss = 0; d.phase = 'show';
  k.root.innerHTML = '<div class="kmsg">Level ' + d.lvl + ' · remember ' + cnt + ' squares</div><div class="kgrid" id="vmG" style="grid-template-columns:repeat(' + n + ',1fr);width:min(100%,400px)"></div>';
  const G = k.root.querySelector('#vmG'); d.cells = [];
  for (let i=0;i<n*n;i++){ const b = document.createElement('button'); b.className = 'kcell'; b.style.cssText = 'aspect-ratio:1;background:' + (d.on.has(i) ? '#ffffff' : '#2a3a6a') + ';transition:background .2s,transform .2s'; b.addEventListener('pointerdown', e => { e.preventDefault(); tap(k, i); }); G.appendChild(b); d.cells.push(b); }
  k.beep(700, .1, 'triangle', .08);
  setTimeout(() => { if (!k.running) return; d.cells.forEach(c => c.style.background = '#2a3a6a'); d.phase = 'play'; }, 900 + cnt * 120);
}
function tap(k, i){
  const d = k.data; if (!k.running || d.phase !== 'play' || d.found.has(i)) return;
  const c = d.cells[i];
  if (d.on.has(i)){ d.found.add(i); c.style.background = '#ffffff'; c.style.transform = 'scale(.92)'; k.add(10); k.beep(500 + d.found.size * 50, .04); if (d.found.size === d.on.size){ d.phase = 'done'; k.add(50 * d.lvl, 200, 60, '#55ff55'); k.good(); k.flash('#ffffff', .12); d.lvl++; setTimeout(() => { if (k.running) level(k); }, 600); } }
  else { d.found.add(i); c.style.background = '#a52a24'; d.miss++; k.bad(); k.shake(4);
    if (d.miss >= 3){ d.lives--; k.lives(d.lives, 3); d.phase = 'done'; d.cells.forEach((x, j) => { if (d.on.has(j) && !d.found.has(j)) x.style.background = '#8888ff'; });
      setTimeout(() => { if (!k.running) return; if (d.lives <= 0) return k.over({ lines:['🟦 Reached level ' + d.lvl] }); level(k); }, 1100); } }
}
Kit.def({
  dom:true, winAt:500,
  how:'Some squares flash white. When they go dark, tap all of them. 3 wrong taps in one level costs a life (3 lives). Every level adds a square, and the grid grows as you go. Most people reach level 8 to 10.',
  init(k){ const d = k.data; d.lvl = 1; d.lives = 3; k.lives(3, 3); level(k); }
});
})();
