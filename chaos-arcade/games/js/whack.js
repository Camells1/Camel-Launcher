/* Whack-a-Mole */
(function(){
const HOLES = 9;
function render(k){
  const d = k.data;
  k.root.innerHTML = '<div class="kmsg" id="wmMsg">Bonk 🐹 · spare 🐰 · ⭐ = 5x</div><div class="kgrid" id="wmGrid" style="grid-template-columns:repeat(3,1fr);width:min(100%,420px)"></div>';
  const g = k.root.querySelector('#wmGrid');
  for (let i=0;i<HOLES;i++){ const b = document.createElement('button'); b.className = 'kcell wm-hole'; b.dataset.i = i; b.style.cssText = 'aspect-ratio:1;font-size:clamp(34px,11vw,56px);background:radial-gradient(ellipse at 50% 80%,#1a0f08 0 38%,#5a3a1a 40%,#6a4a2a 100%)'; g.appendChild(b); }
  g.addEventListener('pointerdown', e => { const b = e.target.closest('.wm-hole'); if (b && k.running) whack(k, +b.dataset.i, b); });
  d.cells = Array.from(g.children);
}
function whack(k, i, el){
  const d = k.data, h = d.holes[i];
  if (!h.who){ k.miss(); k.beep(150, .05); return; }
  const r = el.getBoundingClientRect(), rr = k.root.getBoundingClientRect(), x = r.left - rr.left + r.width/2, y = r.top - rr.top;
  if (h.who === '🐰'){ k.add(-50, x, y, '#ff5555'); k.bad(); k.shake(6); k.combo = 0; k.addTime(-3); }
  else if (h.who === '💣'){ k.boom(); k.flash(); k.shake(14); return k.over({ title:'💣 BOOM!', lines:['🔨 You whacked a bomb'] }); }
  else { const base = h.who === '⭐' ? 50 : 10; k.hit(base, x, y); k.burstEl(el, h.who === '⭐' ? ['#ffd700','#ffffff'] : ['#c88a5a','#ffffff'], 12); k.beep(h.who === '⭐' ? 1200 : 300 + k.combo * 20, .07, 'square', .08); if (h.who === '⭐') k.coin(); }
  h.who = null; h.t = 0; paint(k, i, true);
}
function paint(k, i, bonked){ const d = k.data, el = d.cells[i], h = d.holes[i]; el.textContent = h.who ? h.who : (bonked ? '💫' : ''); el.style.transform = h.who ? 'translateY(-4px)' : ''; }
Kit.def({
  dom:true, winAt:400,
  how:'Tap the 🐹 moles as they pop up. Do NOT hit the 🐰 bunnies (−50 points and −3 seconds). ⭐ golden moles are worth 5x. A 💣 ends the game instantly. Hit fast to build your combo. 45 seconds on the clock.',
  init(k){ const d = k.data; d.holes = Array.from({length:HOLES}, () => ({ who:null, t:0 })); render(k); d.spawn = .4; k.timer(45); },
  update(dt, k){
    const d = k.data; d.spawn -= dt;
    const speed = 1 + k.t / 30;
    d.holes.forEach((h, i) => { if (h.who){ h.t -= dt; if (h.t <= 0){ if (h.who === '🐹' || h.who === '⭐') k.miss(); h.who = null; paint(k, i); } } });
    if (d.spawn <= 0){
      d.spawn = Math.max(.25, .8 / speed) * k.rand(.6, 1.3);
      const empty = d.holes.map((h, i) => h.who ? -1 : i).filter(i => i >= 0);
      if (empty.length){
        const i = k.pick(empty), r = Math.random();
        d.holes[i].who = r < .06 ? '⭐' : r < .2 ? '🐰' : r < .25 + Math.min(.1, k.t / 400) ? '💣' : '🐹';
        d.holes[i].t = Math.max(.55, 1.4 / speed); paint(k, i);
      }
    }
  },
  timeUp(k){ k.over({ lines:['🔨 Best combo: ' + k.combo] }); }
});
})();
