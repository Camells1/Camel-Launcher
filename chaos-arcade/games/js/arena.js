/* Snake Arena */
(function(){
const N = 30, DIRS = [[0,-1],[1,0],[0,1],[-1,0]];
const AI_COLORS = ['#ff5577','#ffaa33','#aa66ff'];
function occ(d){ const s = new Set(); d.snakes.forEach(sn => { if (sn.alive) sn.body.forEach(p => s.add(p.x + ',' + p.y)); }); return s; }
function freeCell(d){ const o = occ(d); let p; do { p = { x:Math.floor(Math.random() * N), y:Math.floor(Math.random() * N) }; } while (o.has(p.x + ',' + p.y)); return p; }
function mkSnake(x, y, dir, c, ai){ const body = []; for (let i=0;i<4;i++) body.push({ x:x - DIRS[dir][0] * i, y:y - DIRS[dir][1] * i }); return { body, dir, c, ai, alive:true, grow:0, kills:0 }; }
function spawnAI(k){ const d = k.data, spots = [[5, 5, 1], [24, 5, 2], [24, 24, 3], [5, 24, 0]]; d.snakes = d.snakes.filter(s => !s.ai || s.alive); for (let i=0;i<3;i++){ const sp = spots[(i + d.wave) % 4]; d.snakes.push(mkSnake(sp[0], sp[1], sp[2], AI_COLORS[i], true)); } }
function reach(d, x, y, o, lim){ const seen = new Set(), q = [[x, y]]; let n = 0; while (q.length && n < lim){ const [a, b] = q.pop(), key = a + ',' + b; if (seen.has(key) || a < 0 || b < 0 || a >= N || b >= N || o.has(key)) continue; seen.add(key); n++; DIRS.forEach(([dx, dy]) => q.push([a + dx, b + dy])); } return n; }
function think(d, sn){
  const o = occ(d), h = sn.body[0];
  const target = d.food.reduce((best, f) => { const dist = Math.abs(f.x - h.x) + Math.abs(f.y - h.y); return !best || dist < best.d ? { f, d:dist } : best; }, null);
  let bestDir = sn.dir, bs = -1e9;
  [sn.dir, (sn.dir + 1) % 4, (sn.dir + 3) % 4].forEach(dir => {
    const nx = h.x + DIRS[dir][0], ny = h.y + DIRS[dir][1];
    if (nx < 0 || ny < 0 || nx >= N || ny >= N || o.has(nx + ',' + ny)) return;
    const space = reach(d, nx, ny, o, 60);
    let s = space * 2 - (target ? (Math.abs(target.f.x - nx) + Math.abs(target.f.y - ny)) * 3 : 0) + Math.random() * 4;
    if (space < sn.body.length) s -= 500;
    if (s > bs){ bs = s; bestDir = dir; }
  });
  sn.dir = bestDir;
}
Kit.def({ waitInput:true, waitText:'👆 SWIPE TO GO', waitHint:'or press an arrow key / WASD',
  aspect:1, winAt:500,
  how:'You are the 🟩 green snake. Three AI snakes compete for the same food. Steer with swipes or arrows / WASD. If any snake hits your body, it dies and turns into a pile of food. Kill them all to start the next wave. Do not crash yourself!',
  init(k){ const d = k.data; d.snakes = [mkSnake(15, 15, 1, '#55ff55', false)]; d.wave = 0; spawnAI(k); d.food = []; for (let i=0;i<6;i++) d.food.push(freeCell(d)); d.q = []; d.step = 0; d.rate = .12; k.hud('wv', '🐉 wave 1'); },
  update(dt, k){
    const d = k.data; d.step += dt; if (d.step < d.rate) return; d.step = 0;
    const me = d.snakes[0];
    if (d.q.length){ const nd = d.q.shift(); if ((nd + 2) % 4 !== me.dir) me.dir = nd; }
    d.snakes.forEach(sn => { if (sn.alive && sn.ai) think(d, sn); });
    const heads = d.snakes.map(sn => sn.alive ? { x:sn.body[0].x + DIRS[sn.dir][0], y:sn.body[0].y + DIRS[sn.dir][1] } : null);
    const o = occ(d);
    d.snakes.forEach((sn, i) => {
      if (!sn.alive) return; const h = heads[i];
      let dead = h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || o.has(h.x + ',' + h.y) || heads.some((h2, j) => j !== i && h2 && h2.x === h.x && h2.y === h.y);
      if (dead){
        sn.alive = false; const c = k.W / N;
        sn.body.forEach((p, n) => { if (n % 2 === 0) d.food.push({ x:p.x, y:p.y }); });
        k.burst((sn.body[0].x + .5) * c, (sn.body[0].y + .5) * c, [sn.c, '#ffffff'], 20);
        if (i === 0){ k.boom(); k.shake(12); return; }
        const killer = d.snakes.find(o2 => o2 !== sn && o2.alive && o2.body.some(p => p.x === h.x && p.y === h.y));
        if (killer === me){ me.kills++; k.hit(100, (h.x + .5) * c, h.y * c); k.pop(k.W/2, k.H/3, 'SNAKE DOWN!', '#55ff55'); k.good(); } else k.beep(200, .1);
      }
    });
    if (!me.alive) return k.over({ lines:['🐉 Length ' + me.body.length + ' · ' + me.kills + ' snakes taken down · wave ' + (d.wave + 1)] });
    d.snakes.forEach((sn, i) => {
      if (!sn.alive) return; const h = heads[i]; sn.body.unshift(h);
      const fi = d.food.findIndex(f => f.x === h.x && f.y === h.y);
      if (fi >= 0){ d.food.splice(fi, 1); sn.grow += 1; if (i === 0){ k.add(10, (h.x + .5) * k.W / N, h.y * k.W / N); k.beep(600 + sn.body.length * 6, .04); } }
      if (sn.grow > 0) sn.grow--; else sn.body.pop();
    });
    while (d.food.length < 5) d.food.push(freeCell(d));
    if (!d.snakes.some(s => s.ai && s.alive)){ d.wave++; k.add(200 * d.wave, k.W/2, k.H/2, '#55ffff'); k.flash('#55ff55', .15); d.rate = Math.max(.07, d.rate - .01); spawnAI(k); k.hud('wv', '🐉 wave ' + (d.wave + 1)); }
  },
  draw(ctx, k){
    const d = k.data, c = k.W / N;
    ctx.fillStyle = '#0d1018'; ctx.fillRect(0, 0, k.W, k.H);
    ctx.fillStyle = '#121828'; for (let y=0;y<N;y++) for (let x=0;x<N;x++) if ((x + y) % 2) ctx.fillRect(x * c, y * c, c, c);
    if (!d.snakes) return;
    d.food.forEach(f => { ctx.fillStyle = '#ffd23a'; ctx.fillRect(f.x * c + c * .25, f.y * c + c * .25, c * .5, c * .5); });
    d.snakes.forEach(sn => { if (!sn.alive) return; sn.body.forEach((p, i) => { ctx.globalAlpha = 1 - i / sn.body.length * .5; ctx.fillStyle = sn.c; ctx.fillRect(p.x * c + 1, p.y * c + 1, c - 2, c - 2); }); ctx.globalAlpha = 1; const h = sn.body[0]; ctx.fillStyle = '#000'; ctx.fillRect(h.x * c + c * .3, h.y * c + c * .3, c * .15, c * .15); ctx.fillRect(h.x * c + c * .6, h.y * c + c * .3, c * .15, c * .15); });
  },
  key(key, k){ const m = { ArrowUp:0, w:0, ArrowRight:1, d:1, ArrowDown:2, s:2, ArrowLeft:3, a:3 }[key]; if (m != null && k.data.q.length < 3) k.data.q.push(m); },
  swipe(dir, k){ if (k.data.q.length < 3) k.data.q.push({ up:0, right:1, down:2, left:3 }[dir]); }
});
})();
