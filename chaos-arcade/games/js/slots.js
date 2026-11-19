/* Chaos Slots */
(function(){
const SYM = [['🍒',30],['🍋',25],['🔔',18],['🍉',14],['⭐',8],['💎',4],['7️⃣',2]];
const PAY = { '🍒':5, '🍋':8, '🔔':12, '🍉':16, '⭐':30, '💎':75, '7️⃣':250 };
const TOTAL = SYM.reduce((a, s) => a + s[1], 0), COST = 10, SPINS = 25;
function roll(){ let r = Math.random() * TOTAL; for (const [s, w] of SYM){ if ((r -= w) < 0) return s; } return '🍒'; }
function render(k){
  const d = k.data;
  k.root.innerHTML = '<div style="background:linear-gradient(#5a1a7a,#2a0a3a);border:5px solid #ffd700;box-shadow:0 0 30px rgba(255,215,0,.35), inset 0 0 20px rgba(0,0,0,.6);padding:14px;text-align:center">' +
    '<div style="font-size:18px;color:#ffd700;letter-spacing:3px;text-shadow:2px 2px 0 #000">★ CHAOS SLOTS ★</div>' +
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0">' + d.reels.map((s, i) => '<div class="srl" style="aspect-ratio:3/4;background:#fff;border:4px solid #000;display:flex;align-items:center;justify-content:center;font-size:clamp(40px,14vw,68px);box-shadow:inset 0 8px 12px rgba(0,0,0,.25);' + (d.win && d.win.includes(i) ? 'background:#fff6a0;' : '') + '">' + s + '</div>').join('') + '</div>' +
    '<div class="kmsg" style="color:#ffff55;min-height:22px">' + (d.msg || 'Pull the lever!') + '</div>' +
    '<button class="btn gold big block" id="slSpin"' + (d.spinning || d.coins < COST ? ' disabled' : '') + '>🎰 SPIN (' + COST + ')</button>' +
    '<div class="kmsg" style="font-size:11px">' + Object.entries(PAY).map(([s, p]) => s + 'x3=' + p * COST).join(' · ') + ' · 🍒🍒 = ' + COST + '</div></div>';
  const b = k.root.querySelector('#slSpin'); if (b) b.addEventListener('click', () => spin(k));
  k.hud('sp', '🎰 ' + d.left + ' spins');
}
function spin(k){
  const d = k.data; if (d.spinning || d.coins < COST || !k.running) return;
  d.coins -= COST; d.left--; d.spinning = true; d.win = null; d.msg = ''; k.set(d.coins);
  const final = [roll(), roll(), roll()];
  if (Math.random() < .04) final[1] = final[2] = final[0];
  let ticks = 0; const stopAt = [10, 16, 22];
  const iv = setInterval(() => {
    ticks++;
    for (let i=0;i<3;i++) if (ticks < stopAt[i]) d.reels[i] = SYM[Math.floor(Math.random() * SYM.length)][0]; else if (ticks === stopAt[i]){ d.reels[i] = final[i]; k.beep(300 + i * 100, .08); k.shake(2, .05); }
    k.beep(900 + Math.random() * 300, .02, 'square', .02);
    render(k);
    if (ticks >= stopAt[2]){ clearInterval(iv); payout(k, final); }
  }, 60);
}
function payout(k, r){
  const d = k.data; let win = 0;
  if (r[0] === r[1] && r[1] === r[2]){ win = PAY[r[0]] * COST; d.win = [0, 1, 2]; }
  else if (r.filter(s => s === '🍒').length === 2){ win = COST; d.win = r.map((s, i) => s === '🍒' ? i : -1).filter(i => i >= 0); }
  if (win){
    d.coins += win; d.msg = (win >= 300 ? '💥 JACKPOT! ' : '🎉 WIN ') + '+' + win; k.good(); k.flash('#ffd700', .2); k.combo++;
    if (win >= 300){ try { Arcade.confetti(); } catch(e){} Arcade.bigText('💰 JACKPOT x' + (win / COST), '#ffd700'); k.shake(12, .5); }
  } else { d.msg = Math.random() < .3 ? 'So close…' : 'Nothing. The machine laughs.'; k.combo = 0; k.beep(150, .1, 'sawtooth', .05); }
  if (Math.random() < .07 && d.coins >= COST){
    const good = Math.random() < .55; const amt = Math.round(d.coins * (good ? .5 : -.3));
    d.coins = Math.max(0, d.coins + amt); d.msg += ' · 🌀 CHAOS EVENT: ' + (good ? 'coins +50%!' : 'a goblin stole 30%!'); k.flash(good ? '#55ff55' : '#ff3a3a', .2);
  }
  d.spinning = false; k.set(d.coins); render(k);
  if (d.coins < COST || d.left <= 0) setTimeout(() => k.over({ score:d.coins, win:d.coins > 100, title:d.coins > 100 ? '💰 YOU BEAT THE HOUSE' : d.coins < COST ? '🪦 BROKE' : '🎰 OUT OF SPINS', lines:['Ended with ' + d.coins + ' coins'] }), 900);
}
Kit.def({
  dom:true, winAt:101,
  scoreText:(s) => s + '🪙',
  how:'Start with 100 coins and 25 spins. Each spin costs 10. Three of a kind pays out (7️⃣7️⃣7️⃣ = 2500!), two cherries refunds your spin. Sometimes a 🌀 chaos event boosts or robs your stack. Your score is the coins you end with. Space = spin.',
  init(k){ const d = k.data; d.coins = 100; d.left = SPINS; d.reels = ['7️⃣','7️⃣','7️⃣']; d.spinning = false; d.msg = ''; k.set(100); render(k); },
  key(key, k){ if (key === ' ' || key === 'Enter') spin(k); }
});
})();
