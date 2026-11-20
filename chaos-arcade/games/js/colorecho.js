/* Color Echo: repeat the growing sequence of colored pads */
(function(){
const PADS = [
  { c:'#2fb04a', lit:'#7aff8a', f:392, n:'G' }, { c:'#c03030', lit:'#ff7a7a', f:330, n:'R' },
  { c:'#c8a010', lit:'#ffee55', f:262, n:'Y' }, { c:'#2a5ad0', lit:'#7aa8ff', f:196, n:'B' }
];
function render(k){
  const d = k.data;
  k.root.innerHTML = '<div class="kmsg" id="ceMsg" style="min-height:22px">' + (d.msg || '') + '</div>' +
    '<div id="cePads" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;width:min(100%,360px,52vh);margin:8px auto;aspect-ratio:1">' +
    PADS.map((p, i) => '<button data-p="' + i + '" aria-label="Pad ' + (i + 1) + '" style="border:5px solid #000;border-radius:' + ['60% 12px 12px 12px','12px 60% 12px 12px','12px 12px 12px 60%','12px 12px 60% 12px'][i] + ';background:' + p.c + ';box-shadow:inset 6px 6px 0 rgba(255,255,255,.25),inset -6px -6px 0 rgba(0,0,0,.3);cursor:pointer;font:inherit;font-size:22px;color:rgba(0,0,0,.35);transition:background .08s,transform .08s">' + (i + 1) + '</button>').join('') +
    '</div><div class="kmsg" style="font-size:12px;opacity:.75">Keys 1–4 also work</div>';
  k.root.querySelectorAll('[data-p]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); press(k, +b.dataset.p); }));
}
function light(k, i, ms){
  const b = k.root.querySelector('[data-p="' + i + '"]'); if (!b) return;
  b.style.background = PADS[i].lit; b.style.transform = 'scale(.96)'; k.beep(PADS[i].f, ms / 1000 * .9, 'triangle', .12);
  setTimeout(() => { b.style.background = PADS[i].c; b.style.transform = ''; }, ms);
}
function playSeq(k){
  const d = k.data; d.phase = 'show'; d.pos = 0; setMsg(k, '👀 Watch… (' + d.seq.length + ')');
  const gap = Math.max(170, 520 - d.seq.length * 22), on = gap * .7, run = d.run;
  d.seq.forEach((p, i) => setTimeout(() => { if (k.running && d.run === run) light(k, p, on); }, 500 + i * gap));
  setTimeout(() => { if (k.running && d.run === run){ d.phase = 'input'; d.inputT = 0; setMsg(k, '👉 Your turn! ' + d.seq.length + ' to go'); } }, 500 + d.seq.length * gap);
}
function setMsg(k, m){ k.data.msg = m; const el = k.root.querySelector('#ceMsg'); if (el) el.innerHTML = m; }
function press(k, i){
  const d = k.data; if (!k.running || d.phase !== 'input') return;
  light(k, i, 160); d.inputT = 0;
  if (d.seq[d.pos] !== i){
    d.phase = 'dead'; k.bad(); k.shake(8); k.flash('#ff3333', .2);
    const right = k.root.querySelector('[data-p="' + d.seq[d.pos] + '"]'); if (right) right.style.outline = '5px solid #fff';
    setMsg(k, '❌ It was ' + ['green','red','yellow','blue'][d.seq[d.pos]] + '!');
    setTimeout(() => k.over({ lines:['🎵 Longest echo: ' + (d.seq.length - 1)] }), 1100); return;
  }
  d.pos++; k.hit(5);
  if (d.pos === d.seq.length){
    const len = d.seq.length; k.add(len * 10, null, null); d.best = len;
    if (len % 5 === 0){ Arcade.bigText('🎵 ' + len + ' IN A ROW!', '#55ffff'); k.coin(); } else k.good();
    k.hud('ln', '🎵 ' + len);
    d.phase = 'wait'; d.run++; d.seq.push(Math.floor(Math.random() * 4));
    setTimeout(() => { if (k.running) playSeq(k); }, 650);
  } else setMsg(k, '👉 ' + (d.seq.length - d.pos) + ' to go');
}
Kit.def({
  dom:true, winAt:300, medals:[150, 300, 600],
  how:'Watch the pads light up, then repeat the same order. Each round adds one more step and plays faster. Every finished round scores its length × 10. One wrong pad or 6 seconds of hesitation ends the run. Keys 1–4 work too.',
  init(k){ const d = k.data; d.seq = [Math.floor(Math.random() * 4)]; d.run = 0; d.msg = ''; render(k); k.hud('ln', '🎵 0'); setTimeout(() => { if (k.running) playSeq(k); }, 300); },
  update(dt, k){ const d = k.data; if (d.phase === 'input'){ d.inputT += dt; if (d.inputT > 6){ d.phase = 'dead'; k.bad(); setMsg(k, '⏰ Too slow!'); setTimeout(() => k.over({ lines:['🎵 Longest echo: ' + (d.seq.length - 1)] }), 900); } } },
  key(key, k){ if (/^[1-4]$/.test(key)) press(k, +key - 1); }
});
})();
