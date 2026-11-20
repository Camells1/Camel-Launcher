/* Click Speed */
(function(){
const SECS = 10;
function pad(k){ return k.root.querySelector('#cpsPad'); }
Kit.def({
  dom:true, winAt:70,
  how:'Tap the big button as fast as you can for 10 seconds (the clock starts on your first tap). Space bar works too. Your score is the number of taps; we also show taps per second.',
  init(k){
    const d = k.data; d.n = 0; d.started = false; d.ripples = 0;
    k.root.innerHTML = '<div class="kbig" id="cpsN" style="font-size:clamp(60px,20vw,110px);color:#ffff55">0</div><div class="kmsg" id="cpsR">Tap to start!</div>' +
      '<button id="cpsPad" class="kcell" style="width:min(100%,380px);height:min(42vh,300px);margin:0 auto;display:flex;font-size:clamp(30px,10vw,56px);background:radial-gradient(circle,#ff55ff,#7a2a9a);border-radius:50%">👆 TAP!</button>';
    pad(k).addEventListener('pointerdown', e => { e.preventDefault(); tap(k); });
  },
  update(dt, k){ const d = k.data; if (!d.started) return; d.left = SECS - (k.t - d.t0); if (d.left <= 0) finish(k); else k.hud('tm', '⏱ ' + d.left.toFixed(1) + 's'); },
  key(key, k){ if (key === ' ' || key === 'Enter') tap(k); }
});
function tap(k){
  const d = k.data; if (!k.running || d.done) return;
  if (!d.started){ d.started = true; d.t0 = k.t; }
  d.n++; k.set(d.n);
  k.root.querySelector('#cpsN').textContent = d.n;
  const el = pad(k); el.style.transform = 'scale(' + (.92 + Math.random() * .04) + ') rotate(' + k.rand(-4, 4) + 'deg)'; setTimeout(() => el.style.transform = '', 50);
  k.beep(400 + (d.n % 12) * 60, .02, 'square', .04);
  if (d.n % 10 === 0){ k.burstEl(el, ['#ff55ff','#ffff55','#55ffff'], 12); k.pop(200, 60, d.n + '!', '#ffaa00'); }
  const cps = d.n / Math.max(.3, k.t - d.t0); k.root.querySelector('#cpsR').textContent = cps.toFixed(1) + ' taps / second';
}
function finish(k){ const d = k.data; if (d.done) return; d.done = true; const cps = d.n / SECS; k.over({ score:d.n, label:d.n + ' taps (' + cps.toFixed(1) + '/s)', lines:['👆 ' + cps.toFixed(1) + ' taps per second', cps >= 9 ? 'Inhuman. Are you a machine?' : cps >= 7 ? 'Lightning fingers!' : cps >= 5 ? 'Solid speed.' : 'Warm up those thumbs!'] }); }
})();
