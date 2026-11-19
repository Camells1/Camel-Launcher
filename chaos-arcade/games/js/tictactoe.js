/* Tic-Tac-Boom */
(function(){
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const MOODS = [['😴','Sleepy Bot',.55],['🙂','Casual Bot',.25],['😈','Evil Bot',0]];
function win(b){ for (const l of LINES) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return l; return null; }
function mm(b, me){ const w = win(b); if (w) return b[w[0]] === 'O' ? 10 : -10; if (b.every(Boolean)) return 0; let best = me ? -99 : 99; b.forEach((v, i) => { if (v) return; b[i] = me ? 'O' : 'X'; const s = mm(b, !me); b[i] = null; best = me ? Math.max(best, s) : Math.min(best, s); }); return best; }
function bot(d){ const free = d.b.map((v, i) => v ? -1 : i).filter(i => i >= 0); if (Math.random() < MOODS[d.mood][2]) return free[Math.floor(Math.random() * free.length)]; let bi = free[0], bs = -99; free.forEach(i => { d.b[i] = 'O'; const s = mm(d.b, false); d.b[i] = null; if (s > bs){ bs = s; bi = i; } }); return bi; }
function render(k, line){
  const d = k.data, m = MOODS[d.mood];
  let h = '<div class="kmsg">Round ' + (d.round + 1) + ' of 5 vs ' + m[0] + ' ' + m[1] + '</div><div class="kgrid" style="grid-template-columns:repeat(3,1fr);width:min(100%,330px)">';
  d.b.forEach((v, i) => { h += '<button class="kcell" data-i="' + i + '" style="aspect-ratio:1;font-size:clamp(40px,14vw,64px);' + (line && line.includes(i) ? 'background:#2f6a1f;' : '') + '">' + (v === 'X' ? '❌' : v === 'O' ? '⭕' : '') + '</button>'; });
  h += '</div><div class="kmsg">' + (d.msg || '') + '</div>';
  k.root.innerHTML = h;
  k.root.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => move(k, +b.dataset.i)));
}
function move(k, i){
  const d = k.data; if (!k.running || d.busy || d.b[i]) return;
  d.b[i] = 'X'; k.beep(500, .05); render(k);
  if (check(k)) return;
  d.busy = true;
  setTimeout(() => { d.b[bot(d)] = 'O'; k.beep(300, .05); d.busy = false; render(k); check(k); }, 380);
}
function check(k){
  const d = k.data, l = win(d.b);
  if (!l && !d.b.every(Boolean)) return false;
  let res;
  if (l && d.b[l[0]] === 'X'){ res = 'win'; d.w++; k.hit(200 * (d.mood + 1)); k.good(); k.flash('#55ff55', .2); d.msg = '🏆 You win the round!'; }
  else if (l){ res = 'loss'; d.l++; k.bad(); k.shake(6); k.combo = 0; d.msg = '💥 The bot wins this one.'; }
  else { res = 'draw'; d.t++; k.add(50); d.msg = '🤝 Draw.'; }
  d.hist.push(res === 'win' ? '🟩' : res === 'loss' ? '🟥' : '⬜');
  render(k, l); d.busy = true; d.round++;
  k.hud('sc', 'W' + d.w + ' D' + d.t + ' L' + d.l);
  setTimeout(() => {
    if (d.round >= 5) return k.over({ win:d.w > d.l, title:d.w > d.l ? '🏆 SERIES WON' : d.w === d.l ? '🤝 SERIES TIED' : '🤖 SERIES LOST', lines:[d.hist.join('') + ' · ' + d.w + ' wins, ' + d.t + ' draws, ' + d.l + ' losses'] });
    d.mood = Math.min(2, d.w); d.b = Array(9).fill(null); d.busy = false; d.msg = d.round % 2 ? 'The bot starts this round' : 'You start'; render(k);
    if (d.round % 2){ d.busy = true; setTimeout(() => { d.b[bot(d)] = 'O'; d.busy = false; render(k); }, 400); }
  }, 1000);
  return true;
}
Kit.def({
  dom:true, winAt:600,
  how:'Five rounds of tic-tac-toe against a robot. Every round you win makes it meaner: 😴 Sleepy → 🙂 Casual → 😈 Evil (it never loses). Wins against tougher moods are worth more. Keys 1–9 work too.',
  init(k){ const d = k.data; d.b = Array(9).fill(null); d.round = 0; d.w = 0; d.l = 0; d.t = 0; d.mood = 0; d.hist = []; d.busy = false; d.msg = 'You start (❌)'; render(k); k.hud('sc', 'W0 D0 L0'); },
  key(key, k){ const n = parseInt(key, 10); if (n >= 1 && n <= 9) move(k, n - 1); }
});
})();
