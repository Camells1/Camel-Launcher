/* Rocket Cashout */
(function(){
const ROUNDS = 10;
function newRound(k){
  const d = k.data, u = Math.random();
  d.crash = Math.max(1, Math.floor(97 / (1 - u * .99)) / 100);
  if (Math.random() < .04) d.crash = 1;
  d.m = 1; d.phase = 'bet'; d.cashed = false; d.pts = []; d.bet = Math.min(d.bank, d.betSize);
  k.hud('rd', '🚀 round ' + (d.round + 1) + '/' + ROUNDS);
  ui(k);
}
function ui(k){
  const d = k.data, pad = document.getElementById('kitPad');
  pad.style.gridTemplateColumns = '1fr 1fr 1fr';
  if (d.phase === 'bet') pad.innerHTML = '<button class="btn" data-b="-">BET −</button><button class="btn green" data-b="go">🚀 LAUNCH (' + d.bet + ')</button><button class="btn" data-b="+">BET +</button>';
  else if (d.phase === 'fly') pad.innerHTML = '<button class="btn gold" style="grid-column:1/-1;font-size:22px" data-b="cash">💰 CASH OUT ' + Math.floor(d.bet * d.m) + '</button>';
  else pad.innerHTML = '<div class="kmsg" style="grid-column:1/-1">' + (d.msg || '') + '</div>';
  pad.querySelectorAll('[data-b]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); act(k, b.dataset.b); }));
}
function act(k, b){
  const d = k.data; if (!k.running) return;
  if (d.phase === 'bet'){
    if (b === '-') d.betSize = Math.max(5, d.betSize - 10); if (b === '+') d.betSize = Math.min(d.bank, d.betSize + 10);
    d.bet = Math.min(d.bank, d.betSize);
    if (b === 'go'){ d.bank -= d.bet; k.set(d.bank); d.phase = 'fly'; d.t0 = k.t; k.beep(200, .3, 'sawtooth', .06); }
    ui(k);
  } else if (d.phase === 'fly' && b === 'cash') cash(k);
}
function cash(k){
  const d = k.data; if (d.phase !== 'fly') return;
  const win = Math.floor(d.bet * d.m); d.bank += win; d.cashed = true; d.phase = 'done'; d.msg = '💰 Cashed out at ' + d.m.toFixed(2) + 'x: +' + (win - d.bet);
  d.hist.push(d.m >= 2 ? '🟩' : '🟨'); k.set(d.bank); k.good(); k.flash('#55ff55', .15); k.pop(k.W/2, k.H/2, '+' + win, '#55ff55');
  if (d.m >= 5){ k.shake(6); k.pop(k.W/2, k.H/2 - 30, 'DIAMOND HANDS!', '#55ffff'); }
  ui(k); setTimeout(() => endRound(k), 1500);
}
function endRound(k){ const d = k.data; if (!k.running) return; d.round++; if (d.round >= ROUNDS || d.bank < 5) return k.over({ score:d.bank, win:d.bank > 100, title:d.bank > 100 ? '🚀 TO THE MOON!' : d.bank < 5 ? '💥 REKT' : '🙃 GRAVITY WINS', lines:[d.hist.join('') + ' · bank ' + d.bank] }); newRound(k); }
Kit.def({
  aspect:.9, winAt:101,
  scoreText:(s) => s + '🪙',
  how:'Start with 100 coins. Pick a bet and LAUNCH. The multiplier climbs while the rocket flies… and it can explode at ANY moment. Cash out before it blows to win bet × multiplier. 10 rounds. Your score is your final bank. Space = launch / cash out.',
  init(k){ const d = k.data; d.bank = 100; d.round = 0; d.betSize = 20; d.hist = []; d.stars = Array.from({length:40}, () => [Math.random(), Math.random()]); k.set(100); newRound(k); },
  update(dt, k){
    const d = k.data;
    if (d.phase !== 'fly') return;
    const t = k.t - d.t0; d.m = Math.pow(Math.E, .22 * t); d.pts.push(d.m);
    if (Math.floor(d.m * 10) !== Math.floor((d.m - .01) * 10)) k.beep(300 + d.m * 60, .02, 'square', .02);
    const btn = document.querySelector('[data-b="cash"]'); if (btn) btn.textContent = '💰 CASH OUT ' + Math.floor(d.bet * d.m);
    if (d.m >= d.crash){
      d.phase = 'done'; d.msg = '💥 Crashed at ' + d.crash.toFixed(2) + 'x. Lost ' + d.bet; d.hist.push('🟥');
      k.boom(); k.shake(14, .5); k.flash('#ff6a00', .3); k.burst(d.rx || k.W/2, d.ry || k.H/2, ['#ff6a00','#ffd700','#ffffff','#555555'], 40, 360);
      ui(k); setTimeout(() => endRound(k), 1600);
    }
  },
  draw(ctx, k){
    const d = k.data;
    ctx.fillStyle = '#070418'; ctx.fillRect(0, 0, k.W, k.H);
    if (!d.stars) return;
    const t = d.phase === 'fly' ? k.t - d.t0 : 0;
    d.stars.forEach(([x, y], i) => { ctx.fillStyle = '#556'; ctx.fillRect(x * k.W, ((y * k.H + t * 40 * (1 + i % 3)) % k.H), 2, 2); });
    const maxM = Math.max(2, d.m * 1.15), n = d.pts.length;
    ctx.strokeStyle = '#55ff55'; ctx.lineWidth = 3; ctx.beginPath();
    d.pts.forEach((m, i) => { const x = 20 + (i / Math.max(1, n)) * (k.W * .7), y = k.H - 30 - (m - 1) / (maxM - 1) * (k.H - 80); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
    const rx = 20 + k.W * .7, ry = k.H - 30 - (d.m - 1) / (maxM - 1) * (k.H - 80); d.rx = rx; d.ry = ry;
    if (!(d.phase === 'done' && !d.cashed)){ ctx.font = '34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.save(); ctx.translate(rx, ry); ctx.rotate(-.6); ctx.fillText('🚀', 0, 0); ctx.restore(); if (d.phase === 'fly'){ ctx.fillStyle = '#ffaa00'; ctx.fillRect(rx - 26 - Math.random() * 8, ry + 10, 10, 6); } }
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold ' + Math.min(64, k.W * .16) + 'px monospace';
    ctx.fillStyle = d.phase === 'done' && !d.cashed ? '#ff3a3a' : d.cashed ? '#55ff55' : '#ffffff';
    ctx.fillText(d.m.toFixed(2) + 'x', k.W/2, k.H * .32);
    ctx.font = 'bold 13px monospace'; ctx.fillStyle = '#aaa';
    ctx.fillText(d.phase === 'bet' ? 'Bet ' + d.bet + ' · bank ' + d.bank : d.phase === 'fly' ? 'Potential: ' + Math.floor(d.bet * d.m) : '', k.W/2, k.H * .32 + 26);
    ctx.textAlign = 'left';
  },
  key(key, k){ if (key === ' ' || key === 'Enter'){ const d = k.data; act(k, d.phase === 'bet' ? 'go' : 'cash'); } }
});
})();
