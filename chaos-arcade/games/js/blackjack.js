/* Blackjack 21 */
(function(){
const SUITS = ['♠','♥','♦','♣'], RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'], HANDS = 10;
function deal(d){ if (d.deck.length < 15){ d.deck = []; for (let n=0;n<4;n++) SUITS.forEach(s => RANKS.forEach(r => d.deck.push({ r, s }))); d.deck.sort(() => Math.random() - .5); } return d.deck.pop(); }
function val(h){ let t = 0, a = 0; h.forEach(c => { if (c.r === 'A'){ a++; t += 11; } else t += ['J','Q','K'].includes(c.r) ? 10 : +c.r; }); while (t > 21 && a){ t -= 10; a--; } return t; }
function ch(c, hide){ if (hide) return '<div class="kcard back">?</div>'; const red = c.s === '♥' || c.s === '♦'; return '<div class="kcard' + (red ? ' red' : '') + '"><div>' + c.r + '</div><div>' + c.s + '</div></div>'; }
function render(k){
  const d = k.data, hide = d.phase === 'play';
  let h = '<div class="kmsg">Dealer ' + (hide ? '?' : val(d.dh)) + '</div><div class="krow">' + d.dh.map((c, i) => ch(c, hide && i === 1)).join('') + '</div>' +
    '<div class="kmsg" style="color:#ffff55">' + (d.msg || '') + '</div>' +
    '<div class="krow">' + d.ph.map(c => ch(c)).join('') + '</div><div class="kmsg">You ' + (d.ph.length ? val(d.ph) : '') + ' · hand ' + Math.min(HANDS, d.hand + (d.phase === 'bet' ? 1 : 0)) + '/' + HANDS + '</div>';
  if (d.phase === 'bet') h += '<div class="krow">' + [10, 25, 50, 100].filter(b => b <= d.chips).map(b => '<button class="btn gold" data-bet="' + b + '">BET ' + b + '</button>').join('') + (d.chips >= 10 ? '<button class="btn purple" data-bet="' + d.chips + '">ALL IN</button>' : '') + '</div>';
  else if (d.phase === 'play') h += '<div class="krow"><button class="btn green" id="bjH">HIT</button><button class="btn red" id="bjS">STAND</button>' + (d.ph.length === 2 && d.chips >= d.bet ? '<button class="btn gold" id="bjD">DOUBLE</button>' : '') + '</div>';
  k.root.innerHTML = '<div style="background:radial-gradient(ellipse,#1f7a3a,#0f4a22);border:4px solid #5a3a1a;padding:12px;box-shadow:inset 0 0 30px rgba(0,0,0,.5)">' + h + '</div>';
  k.root.querySelectorAll('[data-bet]').forEach(b => b.addEventListener('click', () => start(k, +b.dataset.bet)));
  const H = k.root.querySelector('#bjH'), S = k.root.querySelector('#bjS'), D = k.root.querySelector('#bjD');
  if (H) H.addEventListener('click', () => hit(k)); if (S) S.addEventListener('click', () => stand(k)); if (D) D.addEventListener('click', () => dbl(k));
  k.hud('ch', '🪙 ' + d.chips + (d.phase !== 'bet' ? ' (bet ' + d.bet + ')' : ''));
}
function start(k, bet){ const d = k.data; d.bet = bet; d.chips -= bet; d.ph = [deal(d), deal(d)]; d.dh = [deal(d), deal(d)]; d.phase = 'play'; d.msg = ''; k.beep(500, .05); if (val(d.ph) === 21) return settle(k, 'bj'); render(k); }
function hit(k){ const d = k.data; d.ph.push(deal(d)); k.beep(600, .04); if (val(d.ph) > 21) return settle(k, 'bust'); if (val(d.ph) === 21) return stand(k); render(k); }
function dbl(k){ const d = k.data; d.chips -= d.bet; d.bet *= 2; d.ph.push(deal(d)); if (val(d.ph) > 21) return settle(k, 'bust'); stand(k); }
function stand(k){ const d = k.data; d.phase = 'dealer'; while (val(d.dh) < 17) d.dh.push(deal(d)); const p = val(d.ph), q = val(d.dh); settle(k, q > 21 || p > q ? 'win' : p === q ? 'push' : 'lose'); }
function settle(k, r){
  const d = k.data; d.phase = 'done'; d.hand++;
  const pay = { bj:Math.floor(d.bet * 2.5), win:d.bet * 2, push:d.bet, lose:0, bust:0 }[r];
  d.chips += pay;
  d.msg = { bj:'🃏 BLACKJACK! +' + (pay - d.bet), win:'🏆 You win +' + (pay - d.bet), push:'🤝 Push', lose:'💀 Dealer wins −' + d.bet, bust:'💥 BUST −' + d.bet }[r];
  if (r === 'bj' || r === 'win'){ k.good(); k.flash(r === 'bj' ? '#ffd700' : '#55ff55', .15); k.combo++; if (r === 'bj') A_conf(); } else if (r !== 'push'){ k.bad(); k.shake(5); k.combo = 0; }
  d.hist.push({ bj:'🃏', win:'🟩', push:'⬜', lose:'🟥', bust:'💥' }[r]);
  k.set(d.chips); render(k);
  setTimeout(() => { if (!k.running) return; if (d.chips < 10 || d.hand >= HANDS) return k.over({ score:d.chips, win:d.chips > 100, title:d.chips > 100 ? '💰 TABLE CLEANED!' : d.chips < 10 ? '🪦 BROKE' : '🙃 THE HOUSE WINS', lines:[d.hist.join('') + ' · ended with ' + d.chips + ' chips'] }); d.phase = 'bet'; d.ph = []; d.dh = []; render(k); }, 1400);
}
function A_conf(){ try { Arcade.confetti(); } catch(e){} }
Kit.def({ noBestBar:true,
  dom:true, winAt:101,
  scoreText:(s) => s + '🪙',
  how:'Start with 100 chips and play 10 hands. Get closer to 21 than the dealer without going over. Face cards are 10, aces are 1 or 11. Blackjack pays 3:2, DOUBLE doubles your bet for exactly one more card. Your score is your final chip count.',
  init(k){ const d = k.data; d.deck = []; d.chips = 100; d.hand = 0; d.phase = 'bet'; d.ph = []; d.dh = []; d.hist = []; k.set(100); render(k); }
});
})();
