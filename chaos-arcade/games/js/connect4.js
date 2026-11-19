/* Connect Four */
(function(){
const C = 7, R = 6;
function winner(b){
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r=0;r<R;r++) for (let c=0;c<C;c++){ const v = b[r][c]; if (!v) continue; for (const [dr, dc] of dirs){ let n = 1; while (n < 4){ const rr = r + dr*n, cc = c + dc*n; if (rr < 0 || cc < 0 || rr >= R || cc >= C || b[rr][cc] !== v) break; n++; } if (n === 4) return { v, cells:[0,1,2,3].map(i => [r + dr*i, c + dc*i]) }; } }
  return null;
}
function drop(b, c, v){ for (let r=R-1;r>=0;r--) if (!b[r][c]){ b[r][c] = v; return r; } return -1; }
function evalBoard(b){
  let s = 0; for (let r=0;r<R;r++) if (b[r][3] === 2) s += 3; else if (b[r][3] === 1) s -= 3;
  const lines = [];
  for (let r=0;r<R;r++) for (let c=0;c<C;c++) [[0,1],[1,0],[1,1],[1,-1]].forEach(([dr, dc]) => { const w = []; for (let i=0;i<4;i++){ const rr = r + dr*i, cc = c + dc*i; if (rr < 0 || cc < 0 || rr >= R || cc >= C) return; w.push(b[rr][cc]); } lines.push(w); });
  lines.forEach(w => { const a = w.filter(x => x === 2).length, h = w.filter(x => x === 1).length, e = w.filter(x => !x).length; if (a === 3 && e === 1) s += 6; else if (a === 2 && e === 2) s += 2; if (h === 3 && e === 1) s -= 8; else if (h === 2 && e === 2) s -= 2; });
  return s;
}
function minimax(b, depth, alpha, beta, max){
  const w = winner(b); if (w) return w.v === 2 ? 10000 + depth : -10000 - depth;
  const moves = [3,2,4,1,5,0,6].filter(c => !b[0][c]); if (!moves.length || !depth) return evalBoard(b);
  let best = max ? -Infinity : Infinity;
  for (const c of moves){ const r = drop(b, c, max ? 2 : 1); const v = minimax(b, depth - 1, alpha, beta, !max); b[r][c] = 0; if (max){ best = Math.max(best, v); alpha = Math.max(alpha, v); } else { best = Math.min(best, v); beta = Math.min(beta, v); } if (beta <= alpha) break; }
  return best;
}
function render(k, win){
  const d = k.data;
  let h = '<div class="krow" style="margin:0 auto;width:min(100%,420px);display:grid;grid-template-columns:repeat(7,1fr);gap:4px">';
  for (let c=0;c<C;c++) h += '<button class="kcell" data-c="' + c + '" style="height:34px;font-size:16px;background:#2a2244">⬇</button>';
  h += '</div><div style="width:min(100%,420px);margin:0 auto;background:#1f4ad0;border:4px solid #000;padding:6px;display:grid;grid-template-columns:repeat(7,1fr);gap:5px">';
  for (let r=0;r<R;r++) for (let c=0;c<C;c++){ const v = d.b[r][c], hl = win && win.cells.some(([rr, cc]) => rr === r && cc === c); h += '<div style="aspect-ratio:1;border-radius:50%;border:3px solid #0a2a80;background:' + (v === 1 ? '#ff3a3a' : v === 2 ? '#ffd23a' : '#0a1a50') + ';' + (hl ? 'box-shadow:0 0 14px #fff;transform:scale(1.08);' : '') + (d.last && d.last[0] === r && d.last[1] === c ? 'animation:pop .25s steps(3);' : '') + '"></div>'; }
  h += '</div><div class="kmsg" id="c4Msg">' + (d.msg || '') + '</div>';
  k.root.innerHTML = h;
  k.root.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => play(k, +b.dataset.c)));
}
function play(k, c){
  const d = k.data; if (!k.running || d.busy || d.b[0][c]) return;
  const r = drop(d.b, c, 1); d.last = [r, c]; d.moves++; k.beep(300, .06); d.msg = '🤖 Thinking…'; render(k);
  if (end(k)) return;
  d.busy = true;
  setTimeout(() => {
    let best = null, bv = -Infinity;
    [3,2,4,1,5,0,6].forEach(cc => { if (d.b[0][cc]) return; const rr = drop(d.b, cc, 2); const v = minimax(d.b, d.depth, -Infinity, Infinity, false) + Math.random() * d.noise; d.b[rr][cc] = 0; if (v > bv){ bv = v; best = cc; } });
    const rr = drop(d.b, best, 2); d.last = [rr, best]; k.beep(200, .06); d.busy = false; d.msg = 'Your move (🔴)'; render(k); end(k);
  }, 350);
}
function end(k){
  const d = k.data, w = winner(d.b);
  if (w){ render(k, w); if (w.v === 1){ k.good(); k.flash('#ffffff', .2); k.over({ score:1000 - d.moves * 15, title:'🏆 FOUR IN A ROW!', lines:['🔴 Won in ' + d.moves + ' moves'] }); } else { k.bad(); k.over({ score:d.moves * 5, win:false, title:'🤖 THE ROBOT WINS', lines:['🔴 Lasted ' + d.moves + ' moves'] }); } return true; }
  if (d.b[0].every(Boolean)){ k.over({ score:300, title:'🤝 DRAW', lines:['🔴 Board full'] }); return true; }
  return false;
}
Kit.def({
  dom:true, winAt:500,
  how:'Tap a column (or press 1–7) to drop your 🔴 disc. Get four in a row horizontally, vertically or diagonally before the 🟡 robot. Win fast for more points.',
  init(k){ const d = k.data; d.b = Array.from({length:R}, () => Array(C).fill(0)); d.moves = 0; d.busy = false; d.depth = 4; d.noise = 3; d.msg = 'Your move (🔴)'; d.last = null; render(k); },
  key(key, k){ const n = parseInt(key, 10); if (n >= 1 && n <= 7) play(k, n - 1); }
});
})();
