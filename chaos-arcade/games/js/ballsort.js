/* Ball Sort */
(function(){
const CAP = 4, COLS = ['#ff4a6a','#ffc93a','#3ad06a','#3a9aff','#b05aff','#ff8a2a','#3adfd0','#ff7ad0'];
function level(k){
  const d = k.data, n = Math.min(COLS.length, 3 + d.lvl);
  let balls; do { balls = k.shuffle([...Array(n).keys()].flatMap(c => Array(CAP).fill(c))); } while (false);
  d.t = []; for (let i=0;i<n;i++) d.t.push(balls.slice(i * CAP, i * CAP + CAP)); d.t.push([], []);
  d.sel = -1; d.hist = []; d.extra = 1; d.moves = 0; render(k); k.hud('lv', '🧪 level ' + d.lvl + ' · ' + n + ' colors');
}
function solved(d){ return d.t.every(t => !t.length || (t.length === CAP && t.every(b => b === t[0]))); }
function render(k){
  const d = k.data;
  let h = '<div class="krow" style="gap:6px;flex-wrap:wrap;justify-content:center">';
  d.t.forEach((t, i) => {
    const done = t.length === CAP && t.every(b => b === t[0]);
    h += '<button data-t="' + i + '" style="width:44px;height:' + (CAP * 36 + 18) + 'px;border:3px solid ' + (done ? '#55ff55' : '#ddd') + ';border-top:none;border-radius:0 0 22px 22px;background:' + (d.sel === i ? 'rgba(85,255,255,.18)' : 'rgba(255,255,255,.06)') + ';display:flex;flex-direction:column-reverse;align-items:center;gap:4px;padding:6px 0;cursor:pointer">';
    t.forEach((b, j) => { const lift = d.sel === i && j === t.length - 1; h += '<div style="width:32px;height:32px;border-radius:50%;border:2px solid #000;background:radial-gradient(circle at 35% 35%,#fff8,transparent 40%),' + COLS[b] + ';' + (lift ? 'transform:translateY(-' + (CAP - t.length + 1) * 36 + 'px);' : '') + '"></div>'; });
    h += '</button>';
  });
  h += '</div><div class="krow"><button class="btn" id="bsU">↶ UNDO</button><button class="btn" id="bsX"' + (d.extra ? '' : ' disabled') + '>➕ EXTRA TUBE</button><button class="btn" id="bsR">🔄 RESTART</button></div>';
  k.root.innerHTML = h;
  k.root.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => tap(k, +b.dataset.t)));
  k.root.querySelector('#bsU').addEventListener('click', () => { if (d.hist.length){ d.t = d.hist.pop(); d.sel = -1; render(k); } });
  k.root.querySelector('#bsX').addEventListener('click', () => { if (d.extra){ d.extra = 0; d.t.push([]); k.add(-30); render(k); } });
  k.root.querySelector('#bsR').addEventListener('click', () => { if (d.hist.length){ d.t = d.hist[0]; d.hist = []; d.sel = -1; render(k); } });
}
function tap(k, i){
  const d = k.data; if (!k.running) return;
  if (d.sel < 0){ if (d.t[i].length){ d.sel = i; k.beep(500, .03); } render(k); return; }
  const from = d.t[d.sel], to = d.t[i];
  if (i === d.sel){ d.sel = -1; render(k); return; }
  const top = from[from.length - 1];
  if (to.length >= CAP || (to.length && to[to.length - 1] !== top)){ k.beep(150, .05); k.shake(3); d.sel = -1; render(k); return; }
  d.hist.push(d.t.map(t => t.slice()));
  while (from.length && from[from.length - 1] === top && to.length < CAP) to.push(from.pop());
  d.moves++; d.sel = -1; k.beep(400 + to.length * 80, .05, 'triangle', .08);
  if (to.length === CAP && to.every(b => b === top)){ k.add(25); k.burstEl(k.root.querySelectorAll('[data-t]')[i], [COLS[top], '#ffffff'], 10); }
  render(k);
  if (solved(d)){ k.add(150 * d.lvl, 200, 60, '#55ff55'); k.good(); k.flash('#55ff55', .15); k.addTime(20); d.lvl++; setTimeout(() => { if (k.running) level(k); }, 800); }
}
Kit.def({
  dom:true, winAt:800,
  how:'Tap a tube to pick up its top ball(s), then tap another tube to pour them in. You can only drop a ball onto the same color or into an empty tube. Sort every color into its own tube. Each level adds a color. Stuck? Use UNDO, RESTART, or one EXTRA TUBE (−30). Solving adds 20 seconds.',
  init(k){ k.data.lvl = 1; level(k); k.timer(120); },
  timeUp(k){ k.over({ lines:['🧪 Sorted ' + (k.data.lvl - 1) + ' levels'] }); }
});
})();
