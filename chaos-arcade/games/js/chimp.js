/* Chimp Test */
(function(){
const COLS = 5, ROWS = 6;
function round(k){
  const d = k.data, cells = k.shuffle([...Array(COLS * ROWS).keys()]).slice(0, d.n);
  d.pos = cells; d.next = 1; d.hidden = false;
  k.root.innerHTML = '<div class="kmsg">Level ' + (d.n - 3) + ' · tap 1 to ' + d.n + ' in order. After you tap 1, the numbers hide!</div><div class="kgrid" id="chG" style="grid-template-columns:repeat(' + COLS + ',1fr);width:min(100%,400px)"></div>';
  const g = k.root.querySelector('#chG');
  for (let i=0;i<COLS*ROWS;i++){
    const at = cells.indexOf(i), b = document.createElement('button');
    b.className = 'kcell'; b.style.cssText = 'aspect-ratio:1;font-size:clamp(20px,6vw,30px);' + (at < 0 ? 'visibility:hidden' : 'background:#3a2a7a');
    if (at >= 0){ b.textContent = at + 1; b.dataset.n = at + 1; b.addEventListener('pointerdown', e => { e.preventDefault(); tap(k, +b.dataset.n, b); }); }
    g.appendChild(b);
  }
}
function tap(k, n, el){
  const d = k.data; if (!k.running) return;
  if (n !== d.next){ d.strikes++; k.lives(3 - d.strikes, 3); k.bad(); k.shake(8); k.flash('#ff0000', .15); el.style.background = '#a52a24'; el.textContent = n;
    k.root.querySelectorAll('[data-n]').forEach(b => { b.textContent = b.dataset.n; });
    if (d.strikes >= 3) return setTimeout(() => k.over({ lines:['🐒 Remembered ' + (d.n - 1) + ' numbers'] }), 900);
    return setTimeout(() => { if (k.running) round(k); }, 1100);
  }
  if (n === 1) k.root.querySelectorAll('[data-n]').forEach(b => { b.textContent = ''; b.style.background = '#e8e8f0'; });
  el.style.visibility = 'hidden'; d.next++; k.add(n * 2); k.beep(400 + n * 60, .05);
  if (d.next > d.n){ k.add(d.n * 25, 200, 60, '#55ff55'); k.good(); k.flash('#55ff55', .12); d.n++; k.hud('lv', '🐒 ' + d.n + ' numbers'); setTimeout(() => { if (k.running) round(k); }, 400); }
}
Kit.def({
  dom:true, winAt:500,
  how:'Numbers appear on the grid. Tap them in order starting at 1. The moment you tap 1, all the others turn blank, so remember where they were! Each level adds one more number. 3 strikes and you are out. Chimps are famously great at this.',
  init(k){ const d = k.data; d.n = 4; d.strikes = 0; k.lives(3, 3); k.hud('lv', '🐒 4 numbers'); round(k); }
});
})();
