/* Count It */
(function(){
const SHAPES = ['🔵','🔴','🟡','🟢','⭐','🐟','🍎','🐞'];
const ROUNDS = 12;
function round(k){
  const d = k.data; d.phase = 'show';
  const lvl = Math.floor(d.r / 3), target = SHAPES[d.r % 2 ? 0 : 1], decoys = lvl >= 1, n = k.ri(4 + lvl * 2, 8 + lvl * 3);
  const items = []; for (let i=0;i<n;i++) items.push(target);
  if (decoys) for (let i=0;i<k.ri(3, 4 + lvl * 2);i++) items.push(k.pick(SHAPES.filter(s => s !== target)));
  d.ans = n; d.target = target;
  const cells = [], used = new Set();
  items.forEach(e => { let p; do { p = k.ri(0, 63); } while (used.has(p)); used.add(p); cells.push({ p, e }); });
  k.root.innerHTML = '<div class="kmsg">Round ' + (d.r + 1) + '/' + ROUNDS + ' · count the ' + target + (decoys ? ' (ignore the others!)' : '') + '</div><div id="ciB" style="position:relative;width:min(100%,400px);aspect-ratio:1;margin:0 auto;background:#1d1838;border:3px solid #000">' +
    cells.map(c => '<div style="position:absolute;left:' + ((c.p % 8) * 12.5 + 1) + '%;top:' + (Math.floor(c.p / 8) * 12.5 + 1) + '%;width:10.5%;height:10.5%;font-size:clamp(18px,6vw,30px);display:flex;align-items:center;justify-content:center;transform:rotate(' + k.ri(-25, 25) + 'deg)">' + c.e + '</div>').join('') + '</div>';
  const ms = Math.max(700, 1800 - lvl * 300);
  setTimeout(() => { if (!k.running) return; d.phase = 'ask';
    const opts = new Set([n]); while (opts.size < 4){ const o = n + k.pick([-3,-2,-1,1,2,3]); if (o > 0) opts.add(o); }
    d.opts = [...opts].sort((a, b) => a - b);
    k.root.querySelector('#ciB').innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:20px;text-align:center;padding:10px">How many ' + target + ' did you see?</div>';
    k.root.insertAdjacentHTML('beforeend', '<div class="kgrid" style="grid-template-columns:repeat(4,1fr);width:min(100%,400px);margin-top:10px">' + d.opts.map((o, i) => '<button class="btn" data-o="' + o + '" style="font-size:22px">' + o + '</button>').join('') + '</div>');
    k.root.querySelectorAll('[data-o]').forEach(b => b.addEventListener('click', () => answer(k, +b.dataset.o, b)));
    d.t0 = k.t;
  }, ms);
}
function answer(k, v, el){
  const d = k.data; if (d.phase !== 'ask' || !k.running) return; d.phase = 'done';
  if (v === d.ans){ k.hit(Math.max(20, Math.round(80 - (k.t - d.t0) * 10)), 200, 60); k.good(); d.marks.push('🟩'); k.burstEl(el, ['#55ff55','#ffffff'], 8); }
  else { k.miss(); k.bad(); d.marks.push('🟥'); el.classList.add('red'); k.root.querySelector('[data-o="' + d.ans + '"]').classList.add('green'); }
  d.r++; setTimeout(() => { if (!k.running) return; if (d.r >= ROUNDS) return k.over({ lines:[d.marks.join(''), d.marks.filter(m => m === '🟩').length + '/' + ROUNDS + ' correct'] }); round(k); }, 900);
}
Kit.def({
  dom:true, winAt:600,
  how:'Shapes flash on screen for a moment. Count the ones you are asked about, then pick the number. Later rounds flash faster and mix in decoy shapes you must ignore. 12 rounds. Press 1–4 to answer.',
  init(k){ const d = k.data; d.r = 0; d.marks = []; round(k); },
  key(key, k){ const n = parseInt(key, 10), d = k.data; if (d.phase === 'ask' && n >= 1 && n <= 4) answer(k, d.opts[n - 1], k.root.querySelectorAll('[data-o]')[n - 1]); }
});
})();
