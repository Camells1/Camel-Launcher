/* Code Breaker */
(function(){
const COLORS = ['#ff3a3a','#ffaa00','#ffee33','#3ad03a','#3a8aff','#c050ff'], LEN = 4, TRIES = 8;
function render(k){
  const d = k.data;
  let h = '<div style="display:flex;flex-direction:column;gap:4px;width:min(100%,300px);margin:0 auto">';
  for (let r=0;r<TRIES;r++){
    const g = d.rows[r], cur = r === d.rows.length && !d.done;
    const pegs = (g || (cur ? d.cur : [])).concat(Array(LEN).fill(null)).slice(0, LEN);
    h += '<div style="display:grid;grid-template-columns:repeat(4,min(11vw,30px,4.6vh)) 30px;justify-content:center;gap:8px;align-items:center;padding:3px;background:' + (cur ? 'rgba(85,255,255,.12)' : 'rgba(0,0,0,.3)') + ';border:2px solid ' + (cur ? '#55ffff' : '#000') + '">';
    pegs.forEach(c => { h += '<div style="aspect-ratio:1;border:3px solid #000;border-radius:50%;background:' + (c == null ? '#222' : COLORS[c]) + ';box-shadow:inset 3px 3px 0 rgba(255,255,255,.3)"></div>'; });
    const fb = d.fb[r];
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;width:28px">';
    for (let i=0;i<LEN;i++){ const col = fb ? (i < fb[0] ? '#111' : i < fb[0] + fb[1] ? '#fff' : '#444') : '#333'; h += '<div style="aspect-ratio:1;border-radius:50%;background:' + col + ';border:2px solid #000"></div>'; }
    h += '</div></div>';
  }
  h += '</div><div class="krow" id="cbPad">' + COLORS.map((c, i) => '<button class="kcell" data-c="' + i + '" style="width:44px;height:44px;border-radius:50%;background:' + c + '"></button>').join('') + '</div>' +
    '<div class="krow"><button class="btn" id="cbDel">⌫ UNDO</button><button class="btn green" id="cbGo">✔ GUESS</button></div><div class="kmsg">⚫ right color, right spot · ⚪ right color, wrong spot</div>';
  k.root.innerHTML = h;
  k.root.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => { if (d.cur.length < LEN && !d.done){ d.cur.push(+b.dataset.c); k.beep(400 + +b.dataset.c * 80, .04); render(k); } }));
  k.root.querySelector('#cbDel').addEventListener('click', () => { d.cur.pop(); render(k); });
  k.root.querySelector('#cbGo').addEventListener('click', () => guess(k));
}
function guess(k){
  const d = k.data; if (d.done) return;
  if (d.cur.length < LEN){ k.toast ? 0 : 0; k.bad(); return; }
  let black = 0, white = 0; const sc = {}, gc = {};
  d.cur.forEach((c, i) => { if (c === d.code[i]) black++; else { sc[d.code[i]] = (sc[d.code[i]] || 0) + 1; gc[c] = (gc[c] || 0) + 1; } });
  Object.keys(gc).forEach(c => white += Math.min(gc[c], sc[c] || 0));
  d.rows.push(d.cur.slice()); d.fb.push([black, white]); d.cur = [];
  k.beep(300 + black * 150, .08);
  if (black === LEN){ d.done = true; render(k); const secs = Math.round(k.t), score = (TRIES + 1 - d.rows.length) * 250 + Math.max(0, 300 - secs * 2); k.good(); k.flash('#55ff55', .2); return k.over({ score, title:'🔓 CRACKED!', lines:['🔐 Solved in ' + d.rows.length + ' guesses · ' + secs + 's'] }); }
  if (d.rows.length >= TRIES){ d.done = true; render(k); k.bad(); return k.over({ score:0, win:false, title:'🔒 LOCKED OUT', lines:['The code was ' + d.code.map(c => ['🔴','🟠','🟡','🟢','🔵','🟣'][c]).join('')] }); }
  render(k);
}
Kit.def({
  dom:true, winAt:1,
  how:'A secret code of 4 colors is hidden (colors can repeat). Tap colors to build a guess, then press GUESS. ⚫ = right color in the right spot, ⚪ = right color in the wrong spot. Crack it in 8 guesses. Fewer guesses = more points.',
  init(k){ const d = k.data; d.code = Array.from({length:LEN}, () => k.ri(0, COLORS.length - 1)); d.rows = []; d.fb = []; d.cur = []; d.done = false; render(k); },
  key(key, k){ const d = k.data; const n = parseInt(key, 10); if (n >= 1 && n <= 6 && d.cur.length < LEN){ d.cur.push(n - 1); render(k); } else if (key === 'Backspace'){ d.cur.pop(); render(k); } else if (key === 'Enter') guess(k); }
});
})();
