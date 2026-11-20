/* Gem Mines */
(function(){
const N = 25, ROUNDS = 8;
function mult(mines, picks){ let m = 1; for (let i=0;i<picks;i++) m *= (N - i) / (N - mines - i); return Math.floor(m * .97 * 100) / 100; }
function round(k){ const d = k.data; d.board = k.shuffle(Array(N).fill(0).map((_, i) => i < d.mines ? 1 : 0)); d.open = Array(N).fill(false); d.picks = 0; d.state = 'bet'; render(k); }
function render(k){
  const d = k.data, cur = mult(d.mines, d.picks), nxt = mult(d.mines, d.picks + 1);
  let h = '<div class="kmsg">Round ' + (d.r + 1) + '/' + ROUNDS + (d.state === 'play' ? ' · multiplier <b style="color:#55ff55">' + cur + 'x</b> → next ' + nxt + 'x' : '') + '</div>';
  if (d.state === 'bet') h += '<div class="krow">Mines: ' + [3, 5, 10].map(m => '<button class="btn small' + (d.mines === m ? ' on' : '') + '" data-m="' + m + '">💣 ' + m + '</button>').join('') + '</div><div class="krow">Bet: ' + [10, 25, 50].map(v => '<button class="btn small' + (d.bet === v ? ' on' : '') + '" data-b="' + v + '"' + (v > d.bank ? ' disabled' : '') + '>' + v + '</button>').join('') + '</div>';
  h += '<div class="kgrid" style="grid-template-columns:repeat(5,1fr);width:min(100%,360px)">';
  for (let i=0;i<N;i++){ const o = d.open[i], show = o || d.state === 'done'; h += '<button class="kcell" data-i="' + i + '" style="aspect-ratio:1;font-size:clamp(22px,7vw,32px);background:' + (o ? (d.board[i] ? '#a52a24' : '#1f6a3a') : show ? '#2a2244' : '#3a3a5a') + ';opacity:' + (show && !o ? .5 : 1) + '">' + (show ? (d.board[i] ? '💣' : '💎') : '') + '</button>'; }
  h += '</div>';
  if (d.state === 'bet') h += '<button class="btn green big block" id="gmGo"' + (d.bet > d.bank ? ' disabled' : '') + '>⛏️ START DIGGING (' + d.bet + ')</button>';
  else if (d.state === 'play') h += '<button class="btn gold big block" id="gmCash"' + (d.picks ? '' : ' disabled') + '>💰 CASH OUT ' + Math.floor(d.bet * cur) + '</button>';
  else h += '<div class="kmsg">' + d.msg + '</div>';
  k.root.innerHTML = h;
  k.root.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => { d.mines = +b.dataset.m; round(k); }));
  k.root.querySelectorAll('[data-b]').forEach(b => b.addEventListener('click', () => { d.bet = +b.dataset.b; render(k); }));
  k.root.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => pick(k, +b.dataset.i, b)));
  const go = k.root.querySelector('#gmGo'); if (go) go.addEventListener('click', () => { if (d.bet > d.bank) return; d.bank -= d.bet; k.set(d.bank); d.state = 'play'; k.beep(400, .06); render(k); });
  const cash = k.root.querySelector('#gmCash'); if (cash) cash.addEventListener('click', () => cashOut(k));
}
function pick(k, i, el){
  const d = k.data; if (d.state !== 'play' || d.open[i] || !k.running) return;
  d.open[i] = true;
  if (d.board[i]){ d.state = 'done'; d.msg = '💥 BOOM! Lost ' + d.bet; d.hist.push('💥'); k.boom(); k.shake(10); k.flash('#ff3a3a', .2); render(k); return next(k); }
  d.picks++; k.beep(600 + d.picks * 60, .05, 'triangle', .1); k.burstEl(el, ['#55ffff','#ffffff'], 6);
  if (d.picks === N - d.mines){ render(k); return cashOut(k); }
  render(k);
}
function cashOut(k){ const d = k.data; if (d.state !== 'play' || !d.picks) return; const win = Math.floor(d.bet * mult(d.mines, d.picks)); d.bank += win; k.set(d.bank); d.state = 'done'; d.msg = '💰 Cashed out ' + win + ' (' + mult(d.mines, d.picks) + 'x)'; d.hist.push(mult(d.mines, d.picks) >= 3 ? '💰' : '🟩'); k.good(); k.flash('#55ff55', .15); render(k); next(k); }
function next(k){ const d = k.data; d.r++; setTimeout(() => { if (!k.running) return; if (d.r >= ROUNDS || d.bank < 10) return k.over({ score:d.bank, win:d.bank > 100, title:d.bank > 100 ? '💎 GEM TYCOON' : d.bank < 10 ? '🪦 BROKE' : '⛏️ MINED OUT', lines:[d.hist.join('') + ' · ended with ' + d.bank + ' coins'] }); if (d.bet > d.bank) d.bet = 10; round(k); }, 1500); }
Kit.def({
  dom:true, noBestBar:true, winAt:101, scoreText:(s) => s + '🪙',
  how:'Choose how many 💣 mines hide in the 5×5 field and your bet, then tap tiles. Every 💎 gem raises your multiplier; more mines = faster growth. Cash out any time to bank bet × multiplier, but hit a mine and you lose the bet. 8 rounds from 100 coins.',
  init(k){ const d = k.data; d.bank = 100; d.bet = 10; d.mines = 3; d.r = 0; d.hist = []; k.set(100); round(k); }
});
})();
