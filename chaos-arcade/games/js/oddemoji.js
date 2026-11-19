/* Odd One Out */
(function(){
const PAIRS = [['😀','😃'],['🐶','🐕'],['🍎','🍅'],['🌕','🌝'],['😺','😸'],['🔵','🟦'],['⭐','🌟'],['🍊','🍑'],['🐻','🧸'],['🟥','🟧'],['😴','😪'],['🥝','🍈'],['🕐','🕑'],['🌲','🌳'],['👍','👌'],['🙂','🙃'],['🐵','🙈'],['🍪','🥠'],['🚗','🚙'],['🦊','🐱'],['🍋','🍌'],['💙','💜'],['🐟','🐠'],['🎱','⚫'],['🧀','🧈'],['❄️','❇️'],['😐','😑'],['🐭','🐹'],['🍩','🥯'],['🎃','🍊']];
function round(k){
  const d = k.data, size = Math.min(8, 3 + Math.floor(d.lvl / 3)), n = size * size;
  const [a, b] = k.pick(PAIRS), flip = Math.random() < .5;
  const base = flip ? b : a, odd = flip ? a : b;
  d.odd = k.ri(0, n - 1);
  k.root.innerHTML = '<div class="kmsg">Level ' + d.lvl + ' · find the odd one!</div><div class="kgrid" id="ooG" style="grid-template-columns:repeat(' + size + ',1fr);gap:3px;width:min(100%,430px)"></div>';
  const g = k.root.querySelector('#ooG');
  for (let i=0;i<n;i++){ const c = document.createElement('button'); c.className = 'kcell'; c.style.cssText = 'aspect-ratio:1;font-size:clamp(14px,' + (40 / size) + 'vw,40px);background:#221a3a;padding:0'; c.textContent = i === d.odd ? odd : base; c.addEventListener('pointerdown', e => { e.preventDefault(); pick(k, i, c); }); g.appendChild(c); }
  d.started = k.t;
}
function pick(k, i, el){
  const d = k.data; if (!k.running) return;
  if (i === d.odd){ const fast = k.t - d.started < 2; k.hit(10 + d.lvl * 3 + (fast ? 10 : 0), 200, 40); k.beep(700 + d.lvl * 20, .06); k.burstEl(el, ['#55ff55','#ffffff'], 10); if (fast) k.pop(200, 70, 'QUICK EYES!', '#55ffff'); d.lvl++; k.addTime(1); round(k); }
  else { k.miss(); k.bad(); k.addTime(-3); el.style.background = '#a52a24'; k.shake(5); }
}
Kit.def({
  dom:true, winAt:400,
  how:'Every grid hides ONE emoji that is slightly different. Tap it fast! Each find adds a second, wrong taps cost 3. The grids get bigger and sneakier. 40 seconds.',
  init(k){ k.data.lvl = 1; round(k); k.timer(40); },
  timeUp(k){ k.over({ lines:['👀 Found ' + (k.data.lvl - 1) + ' odd ones'] }); }
});
})();
