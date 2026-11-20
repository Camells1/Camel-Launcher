/* Number Rush */
(function(){
const N = 25;
Kit.def({
  dom:true, winAt:1500,
  how:'Tap the numbers 1 to 25 in order as fast as you can. Wrong taps add a 1-second penalty. The clock starts on your first tap. Faster = more points. Great for training your peripheral vision.',
  init(k){
    const d = k.data; d.next = 1; d.pen = 0; d.started = false;
    const nums = k.shuffle([...Array(N).keys()].map(x => x + 1));
    k.root.innerHTML = '<div class="kmsg" id="nrM">Find <b style="color:#ffff55;font-size:20px">1</b></div><div class="kgrid" id="nrG" style="grid-template-columns:repeat(5,1fr);width:min(100%,420px)"></div>';
    const g = k.root.querySelector('#nrG');
    nums.forEach(n => { const b = document.createElement('button'); b.className = 'kcell'; b.textContent = n; b.style.cssText = 'aspect-ratio:1;font-size:clamp(20px,6vw,30px);background:hsl(' + (n * 37 % 360) + ',45%,28%)'; b.addEventListener('pointerdown', e => { e.preventDefault(); tap(k, n, b); }); g.appendChild(b); });
  },
  update(dt, k){ const d = k.data; if (d.started) k.hud('tm', '⏱ ' + ((k.t - d.t0) + d.pen).toFixed(2) + 's'); }
});
function tap(k, n, el){
  const d = k.data; if (!k.running) return;
  if (!d.started){ d.started = true; d.t0 = k.t; }
  if (n !== d.next){ d.pen += 1; k.bad(); k.shake(4); el.style.background = '#a52a24'; setTimeout(() => el.style.background = 'hsl(' + (n * 37 % 360) + ',45%,28%)', 250); return; }
  el.style.visibility = 'hidden'; k.burstEl(el, ['#55ffff','#ffffff'], 5); k.beep(400 + n * 30, .03);
  d.next++;
  if (d.next > N){ const t = (k.t - d.t0) + d.pen; return k.over({ score:Math.max(10, Math.round(3000 - t * 100)), label:t.toFixed(2) + 's', lines:['🔟 ' + t.toFixed(2) + ' seconds (' + d.pen + 's penalties)', t < 12 ? 'Eagle eyes!' : t < 20 ? 'Nice and quick.' : 'Keep practicing!'] }); }
  k.root.querySelector('#nrM').innerHTML = 'Find <b style="color:#ffff55;font-size:20px">' + d.next + '</b>';
}
})();
