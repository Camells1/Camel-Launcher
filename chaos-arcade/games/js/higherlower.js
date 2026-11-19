/* Higher or Lower */
(function(){
const SUITS = ['♠','♥','♦','♣'], RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
function card(k){ return { r:k.ri(0, 12), s:k.pick(SUITS) }; }
function cardHtml(c, back){ if (back) return '<div class="kcard back">?</div>'; const red = c.s === '♥' || c.s === '♦'; return '<div class="kcard' + (red ? ' red' : '') + '" style="width:clamp(90px,28vw,130px);font-size:clamp(28px,9vw,42px)"><div>' + RANKS[c.r] + '</div><div>' + c.s + '</div></div>'; }
function render(k, reveal){
  const d = k.data;
  const lo = d.cur.r, pHi = Math.round((12 - lo) / 12 * 100), pLo = Math.round(lo / 12 * 100);
  k.root.innerHTML = '<div class="krow" style="align-items:center;gap:18px">' + cardHtml(d.cur) + '<div style="font-size:30px">➜</div>' + (reveal ? cardHtml(reveal) : cardHtml(null, true)) + '</div>' +
    '<div class="kmsg">Streak <b style="color:#ffaa00">' + d.streak + '</b> · multiplier x' + (1 + Math.floor(d.streak / 3)) + ' · chances: ⬆ ' + pHi + '% / ⬇ ' + pLo + '%</div>' +
    '<div class="kgrid" style="grid-template-columns:1fr 1fr;width:min(100%,400px)"><button class="btn green big" id="hlH">⬆ HIGHER</button><button class="btn red big" id="hlL">⬇ LOWER</button></div>' +
    '<div class="krow" style="font-size:22px;min-height:30px">' + d.hist.slice(-12).join('') + '</div>';
  k.root.querySelector('#hlH').addEventListener('click', () => guess(k, 1));
  k.root.querySelector('#hlL').addEventListener('click', () => guess(k, -1));
}
function guess(k, dir){
  const d = k.data; if (!k.running || d.busy) return;
  const nx = card(k); d.busy = true;
  const right = nx.r === d.cur.r ? true : (dir > 0 ? nx.r > d.cur.r : nx.r < d.cur.r);
  render(k, nx);
  if (right){ d.streak++; const risk = dir > 0 ? (12 - d.cur.r) : d.cur.r; const pts = Math.round((10 + (12 - risk) * 4) * (1 + Math.floor(d.streak / 3))); k.add(pts, 200, 80, '#55ff55'); k.good(); d.hist.push('🟩'); if (d.streak % 5 === 0){ k.flash('#55ff55', .15); k.pop(200, 40, d.streak + ' STREAK!', '#ffaa00'); } }
  else { d.lives--; k.lives(d.lives, 3); d.streak = 0; k.bad(); k.shake(8); d.hist.push('🟥'); }
  setTimeout(() => { d.busy = false; d.cur = nx; if (d.lives <= 0) return k.over({ lines:[d.hist.slice(-15).join('')] }); render(k); }, 750);
}
Kit.def({
  dom:true, winAt:400,
  how:'Will the next card be HIGHER or LOWER? (A is high, ties count as correct.) Risky calls pay more, and every 3 correct in a row bumps your multiplier. You have 3 lives. Keys: ↑ / ↓.',
  init(k){ const d = k.data; d.cur = card(k); d.streak = 0; d.lives = 3; d.hist = []; d.busy = false; k.lives(3, 3); render(k); },
  key(key, k){ if (key === 'ArrowUp' || key === 'w') guess(k, 1); if (key === 'ArrowDown' || key === 's') guess(k, -1); }
});
})();
