/* Light Cycle */
(function(){
const N = 36, WIN = 3;
const DIRS = [[0,-1],[1,0],[0,1],[-1,0]];
function round(k){
  const d = k.data; d.g = Array.from({length:N}, () => new Uint8Array(N));
  d.p = { x:8, y:N - 8, dir:0, q:[] }; d.a = { x:N - 9, y:7, dir:2 };
  d.g[d.p.y][d.p.x] = 1; d.g[d.a.y][d.a.x] = 2; d.step = 0; d.wait = 1; d.rate = Math.max(.045, .085 - d.round * .006);
}
function freeArea(d, x, y, limit){
  const seen = new Set(), q = [[x, y]]; let n = 0;
  while (q.length && n < limit){ const [cx, cy] = q.pop(); const key = cy * N + cx; if (seen.has(key) || cx < 0 || cy < 0 || cx >= N || cy >= N || d.g[cy][cx]) continue; seen.add(key); n++; DIRS.forEach(([dx, dy]) => q.push([cx + dx, cy + dy])); }
  return n;
}
function aiTurn(k){
  const d = k.data, a = d.a;
  let best = a.dir, bestScore = -1;
  [a.dir, (a.dir + 1) % 4, (a.dir + 3) % 4].forEach(dir => {
    const nx = a.x + DIRS[dir][0], ny = a.y + DIRS[dir][1];
    if (nx < 0 || ny < 0 || nx >= N || ny >= N || d.g[ny][nx]) return;
    let s = freeArea(d, nx, ny, 300) + (dir === a.dir ? 3 : 0) + Math.random() * 4;
    s -= Math.hypot(nx - d.p.x, ny - d.p.y) * (d.round > 1 ? .3 : 0);
    if (s > bestScore){ bestScore = s; best = dir; }
  });
  a.dir = best;
}
Kit.def({
  aspect:1, winAt:300,
  how:'Swipe or use the arrow keys / WASD to turn your cyan cycle. Never hit a wall or any trail, and trap the pink robot inside yours. First to win ' + WIN + ' rounds wins. The cycles get faster every round.',
  init(k){ const d = k.data; d.me = 0; d.ai = 0; d.round = 0; round(k); k.hud('sc', 'YOU 0 : 0 BOT'); },
  update(dt, k){
    const d = k.data; if (d.wait > 0){ d.wait -= dt; return; }
    d.step += dt; if (d.step < d.rate) return; d.step = 0;
    if (d.p.q.length){ const nd = d.p.q.shift(); if ((nd + 2) % 4 !== d.p.dir) d.p.dir = nd; }
    aiTurn(k);
    const pn = { x:d.p.x + DIRS[d.p.dir][0], y:d.p.y + DIRS[d.p.dir][1] }, an = { x:d.a.x + DIRS[d.a.dir][0], y:d.a.y + DIRS[d.a.dir][1] };
    const bad = (p) => p.x < 0 || p.y < 0 || p.x >= N || p.y >= N || d.g[p.y][p.x];
    let pDead = bad(pn), aDead = bad(an);
    if (pn.x === an.x && pn.y === an.y){ pDead = aDead = true; }
    if (pDead || aDead){
      const c = k.W / N;
      if (pDead) k.burst((d.p.x + .5) * c, (d.p.y + .5) * c, ['#55ffff','#ffffff'], 24, 260);
      if (aDead) k.burst((d.a.x + .5) * c, (d.a.y + .5) * c, ['#ff55ff','#ffffff'], 24, 260);
      k.shake(10, .3); k.boom();
      if (aDead && !pDead){ d.me++; k.add(100 + d.round * 20, k.W/2, k.H/2, '#55ff55'); k.flash('#55ffff', .2); }
      else if (pDead && !aDead){ d.ai++; k.flash('#ff55ff', .2); }
      else k.pop(k.W/2, k.H/2, 'DRAW!', '#ffff55');
      d.round++; k.hud('sc', 'YOU ' + d.me + ' : ' + d.ai + ' BOT');
      if (d.me >= WIN) return k.over({ win:true, title:'🏆 YOU OUT-DROVE THE BOT', lines:['🏍️ ' + d.me + ' – ' + d.ai] });
      if (d.ai >= WIN) return k.over({ win:false, title:'🤖 TRAPPED!', lines:['🏍️ ' + d.me + ' – ' + d.ai] });
      return round(k);
    }
    d.p.x = pn.x; d.p.y = pn.y; d.a.x = an.x; d.a.y = an.y; d.g[pn.y][pn.x] = 1; d.g[an.y][an.x] = 2;
    if (Math.random() < .03) k.add(1);
  },
  draw(ctx, k){
    const d = k.data, c = k.W / N;
    ctx.fillStyle = '#05050f'; ctx.fillRect(0, 0, k.W, k.H);
    ctx.strokeStyle = '#111a33'; ctx.lineWidth = 1;
    for (let i=0;i<=N;i+=3){ ctx.beginPath(); ctx.moveTo(i*c, 0); ctx.lineTo(i*c, k.H); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i*c); ctx.lineTo(k.W, i*c); ctx.stroke(); }
    if (!d.g) return;
    for (let y=0;y<N;y++) for (let x=0;x<N;x++){ const v = d.g[y][x]; if (v){ ctx.fillStyle = v === 1 ? '#1aa0b0' : '#b02aa0'; ctx.fillRect(x*c, y*c, c, c); } }
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#55ffff'; ctx.fillStyle = '#aaffff'; ctx.fillRect(d.p.x*c - 1, d.p.y*c - 1, c + 2, c + 2);
    ctx.shadowColor = '#ff55ff'; ctx.fillStyle = '#ffaaff'; ctx.fillRect(d.a.x*c - 1, d.a.y*c - 1, c + 2, c + 2);
    ctx.shadowBlur = 0;
    if (d.wait > 0){ ctx.fillStyle = '#fff'; ctx.font = 'bold 26px monospace'; ctx.textAlign = 'center'; ctx.fillText(d.wait > .5 ? 'ROUND ' + (d.round + 1) : 'GO!', k.W/2, k.H/2); ctx.textAlign = 'left'; }
  },
  key(key, k){ const m = { ArrowUp:0, w:0, ArrowRight:1, d:1, ArrowDown:2, s:2, ArrowLeft:3, a:3 }[key]; if (m != null && k.data.p.q.length < 3) k.data.p.q.push(m); },
  swipe(dir, k){ if (k.data.p.q.length < 3) k.data.p.q.push({ up:0, right:1, down:2, left:3 }[dir]); }
});
})();
