/* Emoji Pairs */
(function(){
const POOL = ['🐶','🐱','🦊','🐸','🐼','🐵','🦁','🐙','🦄','🐝','🍕','🍩','🍉','🌮','🚀','⚽','🎸','🎮','👑','💎','🔥','🌈','⭐','🍀','🎲','🧲','🪐','🦖','🍔','🧁'];
const SIZES = [[4,4],[4,5],[5,6],[6,6]];
function board(k){
  const d = k.data, [c, r] = SIZES[Math.min(SIZES.length - 1, d.lvl - 1)], n = c * r / 2;
  const deck = k.shuffle(k.shuffle(POOL).slice(0, n).flatMap(e => [e, e]));
  d.cards = deck.map(e => ({ e, up:false, done:false })); d.open = []; d.left = n; d.lock = false;
  k.root.innerHTML = '<div class="kgrid" id="prG" style="grid-template-columns:repeat(' + c + ',1fr);width:min(100%,' + (c * 78) + 'px)"></div>';
  const g = k.root.querySelector('#prG'); d.els = [];
  d.cards.forEach((card, i) => { const b = document.createElement('button'); b.className = 'kcell'; b.style.cssText = 'aspect-ratio:3/4;font-size:clamp(20px,' + (c > 5 ? 5.5 : 7) + 'vw,34px);transition:transform .15s,background .15s'; b.addEventListener('pointerdown', e => { e.preventDefault(); flip(k, i); }); g.appendChild(b); d.els.push(b); });
  paint(k); k.hud('lv', '🃏 BOARD ' + d.lvl);
}
function paint(k){ const d = k.data; d.cards.forEach((c, i) => { const el = d.els[i]; el.textContent = c.up || c.done ? c.e : '❔'; el.style.background = c.done ? '#2f6a1f' : c.up ? '#3a3a6a' : 'repeating-linear-gradient(45deg,#5a2fb0 0 6px,#3a1f7a 6px 12px)'; el.style.transform = c.up && !c.done ? 'rotateY(0) scale(1.05)' : ''; el.style.opacity = c.done ? .55 : 1; }); }
function flip(k, i){
  const d = k.data, c = d.cards[i];
  if (!k.running || d.lock || c.up || c.done) return;
  c.up = true; d.open.push(i); k.beep(600, .03); paint(k);
  if (d.open.length < 2) return;
  const [a, b] = d.open.map(j => d.cards[j]);
  if (a.e === b.e){
    a.done = b.done = true; d.open.forEach(j => k.burstEl(d.els[j], ['#55ff55','#ffffff'], 8));
    const r = d.els[i].getBoundingClientRect(), rr = k.root.getBoundingClientRect();
    k.hit(20, r.left - rr.left + r.width/2, r.top - rr.top); k.beep(900 + k.combo * 50, .08); d.open = []; d.left--; paint(k);
    if (!d.left){ k.add(150 * d.lvl, rr.width/2, 80, '#ffff55'); k.addTime(15); k.good(); k.flash('#55ff55', .2); d.lvl++; setTimeout(() => { if (k.running) board(k); }, 700); }
  } else {
    d.lock = true; k.miss(); k.beep(200, .06);
    setTimeout(() => { a.up = b.up = false; d.open = []; d.lock = false; paint(k); }, 650);
  }
}
Kit.def({
  dom:true, winAt:400,
  how:'Flip two cards at a time and find the matching emoji. Matches in a row build your combo. Clear a board for a bonus and +15 seconds, then the next board is bigger. 60 seconds to start.',
  init(k){ k.data.lvl = 1; board(k); k.timer(60); },
  timeUp(k){ k.over({ lines:['🃏 Reached board ' + k.data.lvl] }); }
});
})();
