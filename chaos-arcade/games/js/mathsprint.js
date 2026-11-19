/* Math Sprint */
(function(){
function q(k){
  const d = k.data, lv = Math.min(5, 1 + Math.floor(d.n / 6));
  let a, b, op, ans;
  const t = k.pick(lv < 2 ? ['+','-'] : lv < 4 ? ['+','-','×'] : ['+','-','×','÷']);
  const big = 5 + lv * 6;
  if (t === '+'){ a = k.ri(2, big * 2); b = k.ri(2, big * 2); ans = a + b; }
  else if (t === '-'){ a = k.ri(5, big * 2); b = k.ri(1, a); ans = a - b; }
  else if (t === '×'){ a = k.ri(2, 4 + lv * 2); b = k.ri(2, 9 + lv); ans = a * b; }
  else { b = k.ri(2, 9 + lv); ans = k.ri(2, 9 + lv); a = b * ans; }
  const opts = new Set([ans]);
  while (opts.size < 4){ const off = k.pick([-10,-2,-1,1,2,10,k.ri(-9, 9)]); if (ans + off >= 0 && off) opts.add(ans + off); }
  d.q = { text:a + ' ' + t + ' ' + b, ans, opts:k.shuffle([...opts]) };
  render(k);
}
function render(k){
  const d = k.data;
  k.root.innerHTML = '<div class="kbig" style="font-size:clamp(40px,13vw,64px);color:#ffff55">' + d.q.text + ' = ?</div><div class="kgrid" style="grid-template-columns:1fr 1fr;width:min(100%,420px)">' +
    d.q.opts.map((o, i) => '<button class="kcell" data-v="' + o + '" style="height:76px;font-size:30px">' + o + '<small style="font-size:11px;opacity:.5;margin-left:6px">' + (i + 1) + '</small></button>').join('') + '</div><div class="kmsg">Streak: ' + k.combo + ' · solved ' + d.n + '</div>';
  k.root.querySelectorAll('[data-v]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); answer(k, +b.dataset.v, b); }));
}
function answer(k, v, el){
  const d = k.data; if (!k.running) return;
  if (v === d.q.ans){ d.n++; k.hit(10 + Math.min(20, d.n), 200, 40); k.beep(700 + k.combo * 25, .05); if (k.combo % 5 === 0) k.addTime(2); if (el) k.burstEl(el, ['#55ff55','#ffffff'], 8); }
  else { k.miss(); k.bad(); k.addTime(-3); if (el){ el.style.background = '#a52a24'; } k.shake(5); }
  setTimeout(() => { if (k.running) q(k); }, v === d.q.ans ? 60 : 300);
}
Kit.def({
  dom:true, winAt:300,
  how:'Solve as many sums as you can in 60 seconds. Tap the right answer (or press 1–4). Wrong answers cost 3 seconds. Every 5 in a row gives +2 seconds. The questions get harder as you go.',
  init(k){ k.data.n = 0; q(k); k.timer(60); },
  key(key, k){ const n = parseInt(key, 10); if (n >= 1 && n <= 4){ const el = k.root.querySelectorAll('[data-v]')[n - 1]; answer(k, k.data.q.opts[n - 1], el); } },
  timeUp(k){ k.over({ lines:['➗ ' + k.data.n + ' correct answers'] }); }
});
})();
