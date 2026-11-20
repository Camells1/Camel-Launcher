/* Quick Draw */
(function(){
const BANDITS = [['🤠','Slow Pete',620],['😼','Kitty Kid',520],['🦹','Black Bart',440],['🤖','Robo Ranger',380],['👻','Ghost Gunner',320],['😈','The Devil',270]];
function stage(k){
  const d = k.data, b = BANDITS[Math.min(BANDITS.length - 1, d.lvl)];
  d.bandit = b; d.state = 'wait'; d.react = b[2] * k.rand(.9, 1.1);
  k.root.innerHTML = '<div class="kmsg">Duel ' + (d.lvl + 1) + ' vs <b style="color:#ffaa00">' + b[1] + '</b> (draws in ~' + b[2] + 'ms)</div>' +
    '<div id="qdBox" style="height:min(55vh,400px);border:4px solid #000;background:linear-gradient(#ffb36a,#c86a2a 60%,#8a4a1a);display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:14px;cursor:pointer;touch-action:manipulation;user-select:none">' +
    '<div style="font-size:clamp(50px,16vw,80px)" id="qdB">' + b[0] + '</div><div class="kbig" id="qdW" style="color:#fff">STEADY…</div><div style="font-size:clamp(50px,16vw,80px)">🧍</div></div>';
  k.root.querySelector('#qdBox').addEventListener('pointerdown', e => { e.preventDefault(); shoot(k); });
  clearTimeout(d.t1); clearTimeout(d.t2);
  d.t1 = setTimeout(() => { if (!k.running || d.state !== 'wait') return; d.state = 'draw'; d.t0 = performance.now(); const w = k.root.querySelector('#qdW'); w.textContent = '💥 DRAW! 💥'; w.style.color = '#ffff55'; k.root.querySelector('#qdBox').style.background = 'linear-gradient(#ff5555,#a01a1a)'; k.beep(1000, .15, 'square', .12);
    d.t2 = setTimeout(() => { if (d.state === 'draw') lose(k, 'too slow'); }, d.react); }, k.rand(1500, 4500));
}
function shoot(k){
  const d = k.data; if (!k.running) return;
  if (d.state === 'wait'){ clearTimeout(d.t1); return lose(k, 'early'); }
  if (d.state !== 'draw') return;
  clearTimeout(d.t2); d.state = 'won';
  const ms = Math.round(performance.now() - d.t0); d.times.push(ms);
  k.root.querySelector('#qdB').textContent = '💀'; k.root.querySelector('#qdW').textContent = ms + ' ms!';
  k.boom(); k.shake(8); k.flash('#ffffff', .15); k.add(Math.max(50, 600 - ms) + d.lvl * 100, 200, 120, '#55ff55');
  d.lvl++; setTimeout(() => { if (k.running) stage(k); }, 1300);
}
function lose(k, why){
  const d = k.data; d.state = 'lost';
  const w = k.root.querySelector('#qdW'); w.textContent = why === 'early' ? '🚫 TOO EARLY!' : '💀 TOO SLOW!'; w.style.color = '#ff5555';
  k.bad(); k.shake(10); k.flash('#ff0000', .2);
  const best = d.times.length ? Math.min.apply(null, d.times) : 0;
  setTimeout(() => k.over({ lines:['🤠 Beat ' + d.lvl + ' bandit' + (d.lvl === 1 ? '' : 's') + (best ? ' · fastest draw ' + best + 'ms' : ''), why === 'early' ? 'You drew before the signal. Dishonorable!' : d.bandit[1] + ' was faster.'] }), 900);
}
Kit.def({
  dom:true, winAt:800,
  how:'Wild west duel. Wait for the screen to flash DRAW!, then tap (or press SPACE) faster than the bandit. Tap too early and you lose. Each new bandit is faster. How many can you beat?',
  init(k){ const d = k.data; d.lvl = 0; d.times = []; stage(k); },
  key(key, k){ if (key === ' ' || key === 'Enter') shoot(k); }
});
})();
