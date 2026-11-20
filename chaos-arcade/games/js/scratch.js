/* Scratch Cards */
(function(){
const PRIZES = [['🍒',20],['🍋',30],['🔔',50],['⭐',100],['💎',250],['👑',500]], COST = 10, CARDS = 10;
function card(k){
  const d = k.data, win = Math.random() < .38;
  let cells;
  if (win){ const r = Math.random(), sym = r < .45 ? 0 : r < .7 ? 1 : r < .85 ? 2 : r < .94 ? 3 : r < .985 ? 4 : 5; cells = [PRIZES[sym][0], PRIZES[sym][0], PRIZES[sym][0]]; while (cells.length < 9){ const e = k.pick(PRIZES)[0]; if (cells.filter(x => x === e).length < 2) cells.push(e); } }
  else { cells = []; while (cells.length < 9){ const e = k.pick(PRIZES)[0]; if (cells.filter(x => x === e).length < 2) cells.push(e); } }
  d.cells = k.shuffle(cells); d.rev = Array(9).fill(false); d.paid = false;
  d.bank -= COST; d.n++; k.set(d.bank); render(k);
}
function render(k){
  const d = k.data;
  let h = '<div class="kmsg">Card ' + d.n + '/' + CARDS + ' · find 3 matching symbols · ' + PRIZES.map(p => p[0] + p[1]).join(' ') + '</div>' +
    '<div id="scG" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:min(100%,330px);margin:0 auto;padding:10px;background:linear-gradient(135deg,#ffd23a,#ff8a2a);border:4px solid #000;border-radius:12px;touch-action:none">';
  d.cells.forEach((e, i) => { h += '<div data-i="' + i + '" style="aspect-ratio:1;border:3px solid #000;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:clamp(30px,10vw,44px);background:' + (d.rev[i] ? '#fff8e0' : 'repeating-linear-gradient(45deg,#b0b0b8 0 6px,#9a9aa4 6px 12px)') + ';cursor:pointer">' + (d.rev[i] ? e : '<span style="font-size:14px;color:#555">SCRATCH</span>') + '</div>'; });
  h += '</div><div class="kmsg" id="scM">' + (d.msg || 'Drag your finger over the silver panels!') + '</div><div class="krow"><button class="btn" id="scA">✨ REVEAL ALL</button><button class="btn green" id="scN"' + (d.rev.every(Boolean) && d.n < CARDS && d.bank >= COST ? '' : ' disabled') + '>NEXT CARD (−' + COST + ')</button></div>';
  k.root.innerHTML = h;
  const G = k.root.querySelector('#scG'), hit = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); const c = el && el.closest('[data-i]'); if (c) scratch(k, +c.dataset.i); };
  G.addEventListener('pointerdown', e => { e.preventDefault(); d.scr = true; hit(e); }); G.addEventListener('pointermove', e => { if (d.scr) hit(e); });
  k.root.querySelector('#scA').addEventListener('click', () => { d.cells.forEach((_, i) => { d.rev[i] = true; }); check(k); render(k); });
  k.root.querySelector('#scN').addEventListener('click', () => { d.msg = ''; card(k); });
}
addEventListener('pointerup', () => { try { Kit._k.data.scr = false; } catch(e){} });
function scratch(k, i){ const d = k.data; if (d.rev[i] || !k.running) return; d.rev[i] = true; k.sfx.noise(.08, .15, 0, 'highpass', 3000, 5000); check(k); render(k); }
function check(k){
  const d = k.data; if (d.paid || !d.rev.every(Boolean)) return; d.paid = true;
  const c = {}; d.cells.forEach(e => c[e] = (c[e] || 0) + 1);
  const w = PRIZES.find(p => c[p[0]] >= 3);
  if (w){ d.bank += w[1]; d.msg = '🎉 THREE ' + w[0] + ' · WIN ' + w[1] + '!'; k.set(d.bank); k.good(); k.flash('#ffd700', .2); d.hist.push(w[1] >= 250 ? '💰' : '🟩'); if (w[1] >= 250){ try { Arcade.confetti(); } catch(e){} } }
  else { d.msg = 'No match this time.'; d.hist.push('⬛'); k.beep(200, .1); }
  if (d.n >= CARDS || d.bank < COST) setTimeout(() => k.over({ score:d.bank, win:d.bank > 100, title:d.bank > 100 ? '💰 LUCKY YOU' : '🎫 OUT OF CARDS', lines:[d.hist.join('') + ' · ended with ' + d.bank + ' coins'] }), 1200);
}
Kit.def({
  dom:true, noBestBar:true, winAt:101, scoreText:(s) => s + '🪙',
  how:'You get 100 coins. Each scratch card costs 10. Drag your finger (or mouse) over the silver panels to scratch them. Three matching symbols wins that prize, from 🍒 20 up to 👑 500. 10 cards. Score = coins you end with.',
  init(k){ const d = k.data; d.bank = 100 + COST; d.n = 0; d.hist = []; d.msg = ''; card(k); }
});
})();
