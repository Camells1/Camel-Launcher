/* Word Rain */
(function(){
const WORDS = 'cat dog sun run fun box sky red blue fire wind rain snow star moon tree fish bird jump fast slow pixel arcade combo laser rocket planet dragon wizard castle knight shield sword potion candy pizza burger turbo neon storm thunder ocean jungle tiger monkey zebra koala panda galaxy comet orbit alien robot ninja pirate island treasure magic power speed level score boss coin quest happy crazy super mega ultra banana cookie waffle donut music guitar piano drum dance party'.split(' ');
Kit.def({
  dom:true, typing:true, winAt:300,
  how:'Words fall from the sky. Type a word and it is zapped (no need to press Enter). Longer words score more, and quick kills build a combo. If 5 words hit the ground, the game is over. ⭐ golden words freeze the rain for 3 seconds.',
  init(k){
    const d = k.data; d.w = []; d.next = .4; d.miss = 0; d.freeze = 0; d.zapped = 0;
    k.root.innerHTML = '<div id="wrBox" style="position:relative;height:min(52vh,420px);background:linear-gradient(#0a1a3a,#1a3a6a);border:3px solid #000;overflow:hidden"><div style="position:absolute;left:0;right:0;bottom:0;height:8px;background:#ff3a3a"></div></div>' +
      '<input id="wrIn" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="type here…" style="width:100%;margin-top:8px;padding:14px;font-size:22px;font-weight:700;border:4px solid #55ffff;background:#fff;color:#000">';
    d.box = k.root.querySelector('#wrBox'); d.inp = k.root.querySelector('#wrIn');
    d.inp.addEventListener('input', () => {
      const v = d.inp.value.trim().toLowerCase(); if (!v) return;
      const w = d.w.find(o => o.t === v);
      if (w){ zap(k, w); d.inp.value = ''; }
      d.w.forEach(o => o.el.innerHTML = o.t.startsWith(v) ? '<span style="color:#55ff55">' + o.t.slice(0, v.length) + '</span>' + o.t.slice(v.length) : o.t);
    });
    setTimeout(() => d.inp.focus(), 60); k.hud('ms', '💧 0/5');
  },
  update(dt, k){
    const d = k.data, H = d.box.clientHeight, W = d.box.clientWidth; d.freeze -= dt;
    d.next -= dt;
    if (d.next <= 0){ const t = k.pick(WORDS.filter(x => x.length <= 3 + Math.floor(k.t / 15))), gold = Math.random() < .07, el = document.createElement('div');
      el.textContent = t; el.style.cssText = 'position:absolute;top:0;font-size:20px;font-weight:700;padding:2px 6px;border:2px solid #000;background:' + (gold ? '#ffd23a;color:#3a2a00' : 'rgba(0,0,0,.6);color:#fff') + ';white-space:nowrap';
      d.box.appendChild(el); const x = k.rand(4, Math.max(5, W - t.length * 13 - 20)); el.style.left = x + 'px';
      d.w.push({ t, el, y:-24, sp:k.rand(30, 50) * (1 + k.t / 45), gold }); d.next = Math.max(.6, 2 - k.t * .02); }
    d.w.forEach(o => { if (d.freeze <= 0) o.y += o.sp * dt; o.el.style.transform = 'translateY(' + o.y + 'px)';
      if (o.y > H - 30){ o.dead = true; o.el.remove(); d.miss++; k.miss(); k.bad(); k.shake(5); k.hud('ms', '💧 ' + d.miss + '/5'); } });
    d.w = d.w.filter(o => !o.dead);
    if (d.miss >= 5) k.over({ lines:['🌧️ Zapped ' + d.zapped + ' words'] });
  }
});
function zap(k, w){
  const d = k.data; w.dead = true; d.zapped++;
  const r = w.el.getBoundingClientRect(); Arcade.burst(r.left + r.width/2, r.top + r.height/2, w.gold ? ['#ffd700','#ffffff'] : ['#55ffff','#ffffff'], 12);
  w.el.remove(); d.w = d.w.filter(o => !o.dead);
  k.hit(w.t.length * 5); k.beep(700 + w.t.length * 50, .05);
  if (w.gold){ d.freeze = 3; k.pop(150, 40, '⭐ FREEZE!', '#ffd700'); }
}
})();
