/* Reaction Test */
(function(){
const ROUNDS = 5;
function box(k){ return k.root.querySelector('#rtBox'); }
function setState(k, st, text, sub){
  const b = box(k), colors = { wait:'#c0303a', go:'#2fb03a', early:'#d08a10', result:'#2a4a9a' };
  b.style.background = colors[st]; b.innerHTML = '<div class="kbig">' + text + '</div><div class="kmsg" style="color:#fff">' + (sub || '') + '</div>';
}
function arm(k){
  const d = k.data; d.state = 'wait'; setState(k, 'wait', '🔴 WAIT…', 'Round ' + (d.times.length + 1) + ' of ' + ROUNDS + ' · tap when it turns green');
  clearTimeout(d.timer); d.timer = setTimeout(() => { if (!k.running) return; d.state = 'go'; d.t0 = performance.now(); setState(k, 'go', '🟢 TAP!'); k.beep(880, .08); }, k.rand(1200, 3800));
}
function tap(k){
  const d = k.data;
  if (d.state === 'wait'){ clearTimeout(d.timer); d.early++; d.state = 'early'; setState(k, 'early', '⚠️ TOO SOON!', '+100ms penalty. Tap to retry the round.'); k.bad(); k.shake(6); d.pen += 100; return; }
  if (d.state === 'early'){ arm(k); return; }
  if (d.state === 'go'){
    const ms = Math.round(performance.now() - d.t0); d.times.push(ms); d.state = 'result';
    const verdict = ms < 200 ? '⚡ INSANE' : ms < 250 ? '🔥 FAST' : ms < 320 ? '👍 GOOD' : ms < 450 ? '🐢 OK' : '😴 SLEEPY';
    setState(k, 'result', ms + ' ms', verdict + ' · tap for the next round');
    k.beep(ms < 250 ? 1200 : 700, .08); if (ms < 220) k.flash('#55ff55', .1);
    k.hud('avg', '⏱ avg ' + Math.round(avg(d)) + 'ms');
    if (d.times.length >= ROUNDS) setTimeout(() => finish(k), 700);
    return;
  }
  if (d.state === 'result' && d.times.length < ROUNDS) arm(k);
}
function avg(d){ return (d.times.reduce((a, b) => a + b, 0) + d.pen) / Math.max(1, d.times.length); }
function finish(k){
  const d = k.data, a = Math.round(avg(d)), best = Math.min.apply(null, d.times);
  k.over({ score:Math.max(1, 1000 - a), label:a + 'ms average', lines:['🚦 Average ' + a + 'ms · best ' + best + 'ms' + (d.early ? ' · ' + d.early + ' false starts' : ''), a < 250 ? 'Faster than most humans!' : a < 320 ? 'Solid human reflexes.' : 'Caffeine might help.'] });
}
Kit.def({
  dom:true, winAt:700,
  how:'Wait for the box to turn GREEN, then tap it (or press SPACE) as fast as you can. Tapping on red is a false start and adds a penalty. 5 rounds; your score is 1000 minus your average milliseconds.',
  init(k){
    const d = k.data; d.times = []; d.early = 0; d.pen = 0;
    k.root.innerHTML = '<div id="rtBox" style="height:min(60vh,420px);border:4px solid #000;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;touch-action:manipulation;user-select:none;box-shadow:0 8px 0 rgba(0,0,0,.4)"></div>';
    box(k).addEventListener('pointerdown', e => { e.preventDefault(); if (k.running) tap(k); });
    arm(k);
  },
  key(key, k){ if (key === ' ' || key === 'Enter') tap(k); }
});
})();
