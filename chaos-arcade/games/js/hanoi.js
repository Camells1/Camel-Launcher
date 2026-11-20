/* Tower of Hanoi */
(function(){
const LEVELS = [3, 4, 5, 6, 7], COLS = ['#ff5577','#ffaa33','#ffdd44','#55dd66','#44bbff','#aa66ff','#ff66cc'];
function level(k){ const d = k.data, n = LEVELS[d.lvl]; d.n = n; d.p = [[...Array(n).keys()].map(i => n - i), [], []]; d.sel = -1; d.moves = 0; render(k); k.hud('lv', '🗼 ' + n + ' discs · par ' + (Math.pow(2, n) - 1)); }
function render(k){
  const d = k.data, maxW = 100;
  let h = '<div class="kmsg">Moves: <b style="color:#ffff55">' + d.moves + '</b> · perfect = ' + (Math.pow(2, d.n) - 1) + '</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:min(100%,460px);margin:0 auto">';
  d.p.forEach((peg, i) => {
    h += '<button data-p="' + i + '" class="kcell" style="height:min(46vh,300px);flex-direction:column-reverse;justify-content:flex-start;gap:3px;padding:8px 4px;position:relative;background:' + (d.sel === i ? '#3a2a6a' : '#1d1838') + '"><div style="position:absolute;left:50%;top:14px;bottom:8px;width:8px;margin-left:-4px;background:#8a6a4a"></div>';
    peg.forEach((disc, j) => { const lift = d.sel === i && j === peg.length - 1; h += '<div style="position:relative;z-index:1;height:20px;width:' + (20 + disc / d.n * 75) + '%;background:' + COLS[(disc - 1) % 7] + ';border:2px solid #000;' + (lift ? 'transform:translateY(-16px);box-shadow:0 0 12px #fff;' : '') + '"></div>'; });
    h += '</button>';
  });
  k.root.innerHTML = h + '</div><div class="kmsg">Tap a tower to pick up its top disc, then tap where it should go.</div>';
  k.root.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => tap(k, +b.dataset.p)));
}
function tap(k, i){
  const d = k.data; if (!k.running) return;
  if (d.sel < 0){ if (d.p[i].length){ d.sel = i; k.beep(500, .03); } render(k); return; }
  const from = d.p[d.sel], to = d.p[i], disc = from[from.length - 1];
  if (i !== d.sel){
    if (to.length && to[to.length - 1] < disc){ k.bad(); k.shake(4); d.sel = -1; render(k); return; }
    to.push(from.pop()); d.moves++; k.beep(300 + disc * 60, .05);
  }
  d.sel = -1; render(k);
  if (d.p[2].length === d.n){
    const par = Math.pow(2, d.n) - 1, extra = d.moves - par, pts = Math.max(50, 150 * d.n - extra * 15);
    k.add(pts, 200, 60, extra === 0 ? '#55ff55' : '#ffff55'); k.good(); k.flash('#55ff55', .15);
    k.pop(200, 90, extra === 0 ? 'PERFECT SOLVE!' : 'SOLVED (+' + extra + ' moves)', extra === 0 ? '#55ff55' : '#ffff55');
    d.lvl++;
    setTimeout(() => { if (!k.running) return; if (d.lvl >= LEVELS.length) return k.over({ title:'🗼 MASTER BUILDER', lines:['All 5 towers moved'] }); level(k); }, 900);
  }
}
Kit.def({
  dom:true, winAt:2500,
  how:'Move the whole tower from the left peg to the RIGHT peg. Move one disc at a time, and never put a bigger disc on a smaller one. 5 levels from 3 to 7 discs. Solving in the minimum number of moves earns the most points. Keys 1 / 2 / 3 select towers.',
  init(k){ k.data.lvl = 0; level(k); },
  key(key, k){ const n = parseInt(key, 10); if (n >= 1 && n <= 3) tap(k, n - 1); }
});
})();
