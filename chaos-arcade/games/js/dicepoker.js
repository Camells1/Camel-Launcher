/* Dice Poker */
(function(){
const HANDS = 6, FACES = ['','⚀','⚁','⚂','⚃','⚄','⚅'];
function evalHand(v){
  const c = {}; v.forEach(x => c[x] = (c[x] || 0) + 1);
  const counts = Object.values(c).sort((a, b) => b - a), s = [...new Set(v)].sort().join('');
  if (counts[0] === 5) return ['🎲 FIVE OF A KIND', 1000];
  if (counts[0] === 4) return ['FOUR OF A KIND', 400];
  if (counts[0] === 3 && counts[1] === 2) return ['🏠 FULL HOUSE', 250];
  if (s === '12345' || s === '23456') return ['📏 STRAIGHT', 200];
  if (counts[0] === 3) return ['THREE OF A KIND', 100];
  if (counts[0] === 2 && counts[1] === 2) return ['TWO PAIR', 50];
  if (counts[0] === 2) return ['ONE PAIR', 20];
  return ['NOTHING', 0];
}
function render(k, msg){
  const d = k.data, [name, pts] = evalHand(d.v);
  k.root.innerHTML = '<div class="kmsg">Hand ' + (d.hand + 1) + '/' + HANDS + ' · roll ' + d.roll + '/3 · tap dice to HOLD them</div>' +
    '<div class="krow" style="gap:8px">' + d.v.map((x, i) => '<button data-i="' + i + '" class="kcell" style="width:clamp(52px,16vw,70px);height:clamp(52px,16vw,70px);font-size:clamp(44px,14vw,62px);background:' + (d.hold[i] ? '#2f8f2a' : '#f4f0e6') + ';color:#111;text-shadow:none;border-radius:10px;' + (d.anim ? 'animation:shakesm .3s steps(4);' : '') + '">' + FACES[x] + '</button>').join('') + '</div>' +
    '<div class="krow" style="gap:8px;font-size:11px">' + d.hold.map(h => '<span style="width:clamp(52px,16vw,70px);text-align:center;color:' + (h ? '#55ff55' : '#666') + '">' + (h ? 'HELD' : '') + '</span>').join('') + '</div>' +
    '<div class="kbig" style="font-size:clamp(20px,6vw,28px)">' + name + ' <span style="color:#ffff55">' + (pts ? '+' + pts : '') + '</span></div><div class="kmsg">' + (msg || '') + '</div>' +
    '<div class="krow"><button class="btn green big" id="dpR"' + (d.roll >= 3 ? ' disabled' : '') + '>🎲 ROLL' + (d.roll ? ' AGAIN' : '') + '</button><button class="btn gold big" id="dpK">✔ KEEP HAND</button></div>' +
    '<div class="kmsg" style="font-size:11px">5 of a kind 1000 · 4 of a kind 400 · full house 250 · straight 200 · 3 of a kind 100 · two pair 50 · pair 20</div>';
  d.anim = false;
  k.root.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => { if (d.roll === 0) return; d.hold[+b.dataset.i] = !d.hold[+b.dataset.i]; k.beep(500, .03); render(k); }));
  k.root.querySelector('#dpR').addEventListener('click', () => roll(k));
  k.root.querySelector('#dpK').addEventListener('click', () => keep(k));
}
function roll(k){ const d = k.data; if (d.roll >= 3 || !k.running) return; d.v = d.v.map((x, i) => d.hold[i] ? x : k.ri(1, 6)); d.roll++; d.anim = true; for (let i=0;i<5;i++) k.beep(200 + Math.random() * 400, .03, 'square', .04); render(k); if (d.roll >= 3) setTimeout(() => keep(k), 900); }
function keep(k){
  const d = k.data; if (!k.running || d.kept) return; if (d.roll === 0){ roll(k); return; }
  d.kept = true; const [name, pts] = evalHand(d.v);
  if (pts){ k.add(pts, 200, 80, pts >= 250 ? '#ff55ff' : '#ffff55'); if (pts >= 250){ k.good(); k.flash('#ffd700', .2); k.shake(6); } else k.beep(700, .08); } else k.bad();
  d.hist.push(pts >= 250 ? '🌟' : pts >= 100 ? '🟩' : pts ? '🟨' : '⬛');
  d.hand++;
  setTimeout(() => { if (!k.running) return; if (d.hand >= HANDS) return k.over({ lines:[d.hist.join('')] }); d.v = [1,2,3,4,5].map(() => k.ri(1, 6)); d.hold = [0,0,0,0,0].map(() => false); d.roll = 0; d.kept = false; render(k, 'New hand! Press ROLL.'); }, 1000);
}
Kit.def({
  dom:true, winAt:800,
  how:'Six hands of dice poker. Each hand you get up to 3 rolls: after a roll, tap dice to HOLD them, then roll the rest. Keep your hand whenever you like. Score poker hands from a pair (20) up to five of a kind (1000). Space = roll.',
  init(k){ const d = k.data; d.hand = 0; d.hist = []; d.v = [1,2,3,4,5]; d.hold = [false,false,false,false,false]; d.roll = 0; d.kept = false; render(k, 'Press ROLL to start.'); },
  key(key, k){ if (key === ' ') roll(k); if (key === 'Enter') keep(k); const n = parseInt(key, 10); if (n >= 1 && n <= 5 && k.data.roll){ k.data.hold[n - 1] = !k.data.hold[n - 1]; render(k); } }
});
})();
