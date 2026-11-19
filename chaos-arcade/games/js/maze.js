/* Maze Escape */
(function(){
function gen(n){
  const walls = Array.from({length:n*n}, () => [1,1,1,1]); // top right bottom left
  const seen = new Uint8Array(n*n), st = [0]; seen[0] = 1;
  while (st.length){
    const c = st[st.length - 1], x = c % n, y = Math.floor(c / n);
    const nb = [[0,-1,0,2],[1,0,1,3],[0,1,2,0],[-1,0,3,1]].filter(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < n && ny < n && !seen[ny*n + nx]; });
    if (!nb.length){ st.pop(); continue; }
    const [dx, dy, w, ow] = nb[Math.floor(Math.random() * nb.length)], ni = (y + dy) * n + x + dx;
    walls[c][w] = 0; walls[ni][ow] = 0; seen[ni] = 1; st.push(ni);
  }
  return walls;
}
function level(k){ const d = k.data; d.n = Math.min(18, 6 + d.lvl * 2); d.walls = gen(d.n); d.px = 0; d.py = 0; d.vx = 0; d.vy = 0; d.trail = [[0,0]]; d.coins = []; for (let i=0;i<Math.floor(d.n / 3);i++) d.coins.push([k.ri(1, d.n - 1), k.ri(1, d.n - 1)]); k.hud('lv', '🌀 MAZE ' + d.lvl); }
function step(k, dx, dy){
  const d = k.data, i = d.py * d.n + d.px, w = dx === 1 ? 1 : dx === -1 ? 3 : dy === 1 ? 2 : 0;
  if (d.walls[i][w]){ k.beep(120, .03); return false; }
  d.px += dx; d.py += dy; d.trail.push([d.px, d.py]); if (d.trail.length > 400) d.trail.shift();
  k.beep(600, .015, 'square', .03);
  d.coins = d.coins.filter(([cx, cy]) => { if (cx === d.px && cy === d.py){ const c = k.W / d.n; k.add(15, (cx + .5) * c, cy * c, '#ffd700'); k.coin(); return false; } return true; });
  if (d.px === d.n - 1 && d.py === d.n - 1){ const c = k.W / d.n; k.add(100 * d.lvl, k.W/2, k.H/2, '#55ff55'); k.good(); k.flash('#55ff55', .2); k.burst((d.px + .5) * c, (d.py + .5) * c, ['#55ff55','#ffff55','#ffffff'], 30, 300); k.addTime(8 + d.lvl); d.lvl++; level(k); }
  return true;
}
function run(k, dx, dy){ let n = 0; while (n < 40 && step(k, dx, dy)){ n++; const d = k.data, i = d.py * d.n + d.px, open = d.walls[i].filter(w => !w).length; if (open !== 2 || (d.px === 0 && d.py === 0)) break; const back = dx === 1 ? 3 : dx === -1 ? 1 : dy === 1 ? 0 : 2; const fw = [0,1,2,3].find(w => !d.walls[i][w] && w !== back); if (fw == null) break; [dx, dy] = [[0,-1],[1,0],[0,1],[-1,0]][fw]; } }
Kit.def({
  aspect:1, winAt:500,
  how:'Swipe or use the arrow keys / WASD to run through the maze. You keep sliding along corridors until you reach a junction. Reach the 🏁 flag in the corner. Each escape adds time, and the mazes keep growing. Grab 🪙 coins on the way.',
  init(k){ k.data.lvl = 1; level(k); k.timer(45); },
  draw(ctx, k){
    const d = k.data;
    ctx.fillStyle = '#10142a'; ctx.fillRect(0, 0, k.W, k.H);
    if (!d.walls) return;
    const c = k.W / d.n;
    ctx.fillStyle = 'rgba(85,255,255,.12)'; d.trail.forEach(([x, y]) => ctx.fillRect(x * c + c*.3, y * c + c*.3, c*.4, c*.4));
    ctx.fillStyle = '#2fb03a'; ctx.fillRect((d.n - 1) * c + 2, (d.n - 1) * c + 2, c - 4, c - 4);
    ctx.font = (c * .7) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🏁', (d.n - .5) * c, (d.n - .5) * c);
    d.coins.forEach(([x, y]) => { ctx.fillStyle = '#ffd700'; ctx.fillRect(x * c + c*.35, y * c + c*.3, c*.3, c*.4); });
    ctx.strokeStyle = '#a07aff'; ctx.lineWidth = Math.max(2, c * .12); ctx.lineCap = 'square';
    ctx.beginPath();
    for (let y=0;y<d.n;y++) for (let x=0;x<d.n;x++){ const w = d.walls[y*d.n + x], X = x*c, Y = y*c; if (w[0]){ ctx.moveTo(X, Y); ctx.lineTo(X + c, Y); } if (w[1]){ ctx.moveTo(X + c, Y); ctx.lineTo(X + c, Y + c); } if (w[2]){ ctx.moveTo(X, Y + c); ctx.lineTo(X + c, Y + c); } if (w[3]){ ctx.moveTo(X, Y); ctx.lineTo(X, Y + c); } }
    ctx.stroke();
    ctx.shadowColor = '#ffff55'; ctx.shadowBlur = 12; ctx.fillStyle = '#ffff55'; ctx.fillRect(d.px * c + c*.2, d.py * c + c*.2, c*.6, c*.6); ctx.shadowBlur = 0;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  },
  key(key, k){ const m = { ArrowUp:[0,-1], w:[0,-1], ArrowDown:[0,1], s:[0,1], ArrowLeft:[-1,0], a:[-1,0], ArrowRight:[1,0], d:[1,0] }[key]; if (m) run(k, m[0], m[1]); },
  swipe(dir, k){ const m = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] }[dir]; run(k, m[0], m[1]); },
  timeUp(k){ k.over({ lines:['🌀 Escaped ' + (k.data.lvl - 1) + ' mazes'] }); }
});
})();
