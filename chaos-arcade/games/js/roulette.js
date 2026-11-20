/* Roulette (European wheel, single zero) */
(function(){
const ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]), SPINS = 10;
const BETS = { red:['🔴 RED',2,n => RED.has(n)], black:['⚫ BLACK',2,n => n && !RED.has(n)], odd:['ODD',2,n => n % 2 === 1], even:['EVEN',2,n => n && n % 2 === 0], low:['1–18',2,n => n >= 1 && n <= 18], high:['19–36',2,n => n >= 19], d1:['1st 12',3,n => n >= 1 && n <= 12], d2:['2nd 12',3,n => n >= 13 && n <= 24], d3:['3rd 12',3,n => n >= 25] };
const col = (n) => n === 0 ? '#1f9a3a' : RED.has(n) ? '#c0202a' : '#151515';
function wheelSvg(){
  let s = '<svg viewBox="-110 -110 220 220" style="width:100%;height:100%">', a = 360 / ORDER.length;
  ORDER.forEach((n, i) => { const a0 = (i * a - 90 - a/2) * Math.PI / 180, a1 = a0 + a * Math.PI / 180; s += '<path d="M0 0 L' + (100 * Math.cos(a0)).toFixed(2) + ' ' + (100 * Math.sin(a0)).toFixed(2) + ' A100 100 0 0 1 ' + (100 * Math.cos(a1)).toFixed(2) + ' ' + (100 * Math.sin(a1)).toFixed(2) + 'Z" fill="' + col(n) + '" stroke="#d8b040" stroke-width=".6"/>'; const am = (a0 + a1) / 2; s += '<text x="' + (86 * Math.cos(am)).toFixed(1) + '" y="' + (86 * Math.sin(am)).toFixed(1) + '" fill="#fff" font-size="8" font-weight="bold" text-anchor="middle" dominant-baseline="middle" transform="rotate(' + (am * 180 / Math.PI + 90).toFixed(1) + ' ' + (86 * Math.cos(am)).toFixed(1) + ' ' + (86 * Math.sin(am)).toFixed(1) + ')">' + n + '</text>'; });
  return s + '<circle r="52" fill="#5a3a1a" stroke="#d8b040" stroke-width="3"/><circle r="10" fill="#d8b040"/></svg>';
}
function render(k){
  const d = k.data;
  let h = '<div style="display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap"><div style="position:relative;width:min(44vw,230px,23vh);aspect-ratio:1"><div id="rlW" style="width:100%;height:100%;transition:transform 4s cubic-bezier(.15,.85,.25,1);transform:rotate(' + d.rot + 'deg)">' + wheelSvg() + '</div><div style="position:absolute;left:50%;top:-6px;margin-left:-8px;width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:16px solid #ffff55"></div></div>' +
    '<div class="kmsg" style="min-width:120px">' + (d.last != null ? 'Last: <b style="color:#fff;background:' + col(d.last) + ';padding:2px 8px;border:2px solid #000">' + d.last + '</b><br>' : '') + (d.msg || '') + '<br>Spin ' + Math.min(SPINS, d.spin + 1) + '/' + SPINS + '</div></div>';
  h += '<div class="kmsg">Bet: ' + [10, 25, 50, 100].map(v => '<button class="btn small' + (d.amt === v ? ' on' : '') + '" data-amt="' + v + '"' + (v > d.bank ? ' disabled' : '') + '>' + v + '</button>').join(' ') + '</div>';
  h += '<div class="kgrid" style="grid-template-columns:repeat(3,1fr);width:min(100%,440px)">' + Object.keys(BETS).map(b => '<button class="btn small' + (d.bet === b ? ' gold' : '') + '" data-b="' + b + '">' + BETS[b][0] + ' <small>' + (BETS[b][1] - 1) + ':1</small></button>').join('') + '</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(10,1fr);gap:3px;width:min(100%,440px);margin:6px auto">' + [...Array(37).keys()].map(n => '<button data-n="' + n + '" style="font:inherit;font-size:13px;min-height:32px;padding:4px 0;border:2px solid ' + (d.bet === 'n' + n ? '#ffff55' : '#000') + ';background:' + col(n) + ';color:#fff;cursor:pointer">' + n + '</button>').join('') + '</div>';
  h += '<button class="btn green big block" id="rlS"' + (d.spinning || !d.bet || d.amt > d.bank ? ' disabled' : '') + '>🎡 SPIN (' + d.amt + ' on ' + (d.bet ? (d.bet[0] === 'n' ? 'number ' + d.bet.slice(1) : BETS[d.bet][0]) : '…') + ')</button>';
  k.root.innerHTML = h;
  k.root.querySelectorAll('[data-amt]').forEach(b => b.addEventListener('click', () => { d.amt = +b.dataset.amt; render(k); }));
  k.root.querySelectorAll('[data-b]').forEach(b => b.addEventListener('click', () => { d.bet = b.dataset.b; k.beep(500, .03); render(k); }));
  k.root.querySelectorAll('[data-n]').forEach(b => b.addEventListener('click', () => { d.bet = 'n' + b.dataset.n; k.beep(500, .03); render(k); }));
  k.root.querySelector('#rlS').addEventListener('click', () => spin(k));
}
function spin(k){
  const d = k.data; if (d.spinning || !d.bet || d.amt > d.bank || !k.running) return;
  d.spinning = true; d.bank -= d.amt; k.set(d.bank);
  const n = ORDER[Math.floor(Math.random() * ORDER.length)], idx = ORDER.indexOf(n), seg = 360 / ORDER.length;
  d.rot = d.rot - (d.rot % 360) + 360 * 5 + (360 - idx * seg);
  render(k);
  let ticks = 0; const tk = setInterval(() => { k.beep(1200 - ticks * 25, .02, 'square', .03); if (++ticks > 30) clearInterval(tk); }, 120);
  setTimeout(() => {
    d.last = n; d.spinning = false; d.spin++;
    const win = d.bet[0] === 'n' ? (+d.bet.slice(1) === n ? 36 : 0) : (BETS[d.bet][2](n) ? BETS[d.bet][1] : 0);
    if (win){ d.bank += d.amt * win; d.msg = '🎉 WIN +' + d.amt * (win - 1); k.good(); k.flash('#ffd700', .15); if (win === 36){ try { Arcade.confetti(); } catch(e){} Arcade.bigText('💰 STRAIGHT UP x35!'); } d.hist.push(win === 36 ? '💰' : '🟩'); }
    else { d.msg = '💀 Lost ' + d.amt; k.bad(); d.hist.push('🟥'); }
    k.set(d.bank); if (d.amt > d.bank) d.amt = [100, 50, 25, 10].find(v => v <= d.bank) || 10;
    render(k);
    if (d.spin >= SPINS || d.bank < 10) setTimeout(() => k.over({ score:d.bank, win:d.bank > 100, title:d.bank > 100 ? '💰 THE HOUSE LOSES' : d.bank < 10 ? '🪦 BROKE' : '🎡 THE HOUSE WINS', lines:[d.hist.join('') + ' · bank ' + d.bank] }), 900);
  }, 4100);
}
Kit.def({
  dom:true, noBestBar:true, winAt:101, scoreText:(s) => s + '🪙',
  how:'Start with 100 coins and 10 spins. Pick a bet size, pick what to bet on (red/black, odd/even, halves, dozens, or a single number for a 35:1 payout), then spin. Your score is the coins you end with.',
  init(k){ const d = k.data; d.bank = 100; d.amt = 10; d.bet = 'red'; d.spin = 0; d.rot = 0; d.hist = []; d.last = null; d.msg = ''; k.set(100); render(k); },
  key(key, k){ if (key === ' ' || key === 'Enter') spin(k); }
});
})();
