/* Lane Racer */
(function(){
const LANES = 4, COLORS = ['#ff5555','#55aaff','#ffff55','#ff55ff','#ffffff','#ffaa00'];
function lx(k, l){ const rw = k.W * .84, x0 = (k.W - rw) / 2; return x0 + (l + .5) * rw / LANES; }
function steer(k, dir){ const d = k.data; d.lane = k.clamp(d.lane + dir, 0, LANES - 1); k.beep(500, .03, 'square', .04); }
Kit.def({
  aspect:.62, winAt:500,
  how:'Swipe or tap left/right (or ←/→) to switch lanes. Dodge traffic, collect 🪙 coins, grab ⚡ nitro for a few seconds of invincible speed. Near misses pay bonus points. 3 crashes and you are out.',
  init(k){ const d = k.data; d.lane = 1; d.x = lx(k, 1); d.cars = []; d.items = []; d.speed = 260; d.next = 1; d.off = 0; d.nitro = 0; d.lives = 3; d.inv = 0; d.dist = 0; k.lives(3); },
  update(dt, k){
    const d = k.data;
    d.speed = Math.min(620, 260 + k.t * 5) * (d.nitro > 0 ? 1.6 : 1); d.nitro -= dt; d.inv -= dt;
    d.x = k.lerp(d.x, lx(k, d.lane), Math.min(1, dt * 14));
    d.off = (d.off + d.speed * dt) % 60; d.dist += d.speed * dt;
    if (Math.floor(d.dist / 100) > (d.m || 0)){ d.m = Math.floor(d.dist / 100); k.add(1); }
    d.next -= dt;
    if (d.next <= 0){
      d.next = Math.max(.35, 1 - k.t * .01) * k.rand(.7, 1.2);
      const used = new Set(); const n = Math.random() < Math.min(.5, k.t / 60) ? 2 : 1;
      for (let i=0;i<n;i++){ let l; do { l = k.ri(0, LANES - 1); } while (used.has(l)); used.add(l); d.cars.push({ l, y:-60, v:k.rand(.25, .55), c:k.pick(COLORS), near:false }); }
      if (Math.random() < .35){ let l; do { l = k.ri(0, LANES - 1); } while (used.has(l)); d.items.push({ l, y:-40, t:Math.random() < .15 ? 'nitro' : 'coin' }); }
    }
    const py = k.H - 90;
    d.cars.forEach(c => {
      c.y += d.speed * (1 - c.v) * dt;
      const hit = Math.abs(lx(k, c.l) - d.x) < k.W * .09 && Math.abs(c.y - py) < 48;
      if (hit && !c.hit){
        if (d.nitro > 0){ c.hit = true; c.fly = 1; k.add(50, lx(k, c.l), c.y, '#55ffff'); k.shake(6); k.burst(lx(k, c.l), c.y, [c.c, '#fff'], 18); k.beep(200, .1, 'sawtooth', .07); }
        else if (d.inv <= 0){ c.hit = true; d.lives--; d.inv = 1.5; k.lives(Math.max(0, d.lives)); k.boom(); k.shake(12, .35); k.flash('#ff3a3a', .2); k.combo = 0; k.burst(d.x, py, ['#ffaa00','#ffffff','#555'], 26); if (d.lives <= 0) return k.over({ lines:['🏎️ Drove ' + Math.floor(d.dist / 100) + ' km'] }); }
      }
      if (!c.near && !c.hit && c.y > py + 40 && Math.abs(c.l - d.lane) === 1 && Math.abs(lx(k, c.l) - d.x) < k.W * .3){ c.near = true; k.hit(15, d.x, py - 40); k.pop(d.x, py - 60, 'CLOSE CALL!', '#ffaa00'); }
    });
    d.items.forEach(it => { it.y += d.speed * dt; if (!it.got && Math.abs(lx(k, it.l) - d.x) < k.W * .09 && Math.abs(it.y - py) < 40){ it.got = true; if (it.t === 'coin'){ k.add(20, d.x, py - 30, '#ffd700'); k.coin(); } else { d.nitro = 3.5; k.pop(k.W/2, k.H/3, '⚡ NITRO!', '#55ffff'); k.flash('#55ffff', .15); k.good(); } } });
    d.cars = d.cars.filter(c => c.y < k.H + 80); d.items = d.items.filter(i => i.y < k.H + 40 && !i.got);
  },
  draw(ctx, k){
    const d = k.data, rw = k.W * .84, x0 = (k.W - rw) / 2;
    ctx.fillStyle = '#2a6a2a'; ctx.fillRect(0, 0, k.W, k.H);
    ctx.fillStyle = '#333'; ctx.fillRect(x0, 0, rw, k.H);
    ctx.fillStyle = '#ddd'; ctx.fillRect(x0, 0, 4, k.H); ctx.fillRect(x0 + rw - 4, 0, 4, k.H);
    for (let l=1;l<LANES;l++) for (let y = -60 + (d.off || 0); y < k.H; y += 60) ctx.fillRect(x0 + l * rw / LANES - 2, y, 4, 30);
    if (!d.cars) return;
    const car = (x, y, c, me) => { ctx.fillStyle = c; ctx.fillRect(x - 16, y - 28, 32, 56); ctx.fillStyle = '#9adfff'; ctx.fillRect(x - 12, y + (me ? -18 : 6), 24, 12); ctx.fillStyle = '#111'; ctx.fillRect(x - 19, y - 22, 4, 12); ctx.fillRect(x + 15, y - 22, 4, 12); ctx.fillRect(x - 19, y + 10, 4, 12); ctx.fillRect(x + 15, y + 10, 4, 12); };
    d.items.forEach(it => { ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(it.t === 'coin' ? '🪙' : '⚡', lx(k, it.l), it.y + 8); ctx.textAlign = 'left'; });
    d.cars.forEach(c => { if (!c.fly) car(lx(k, c.l), c.y, c.c); });
    const py = k.H - 90;
    if (d.nitro > 0){ ctx.fillStyle = 'rgba(85,255,255,.25)'; for (let i=0;i<8;i++) ctx.fillRect(x0 + Math.random() * rw, Math.random() * k.H, 2, 40); ctx.fillStyle = '#ffaa00'; ctx.fillRect(d.x - 8, py + 28, 16, 10 + Math.random() * 14); }
    if (d.inv <= 0 || Math.floor(k.t * 12) % 2) car(d.x, py, d.nitro > 0 ? '#55ffff' : '#55ff55', true);
  },
  down(x, y, k){ k.data.tap = { x, t:performance.now() }; },
  up(x, y, k){ const t = k.data.tap; if (t && Math.abs(x - t.x) < 25) steer(k, x < k.W/2 ? -1 : 1); k.data.tap = null; },
  swipe(dir, k){ k.data.tap = null; if (dir === 'left') steer(k, -1); if (dir === 'right') steer(k, 1); },
  key(key, k){ if (key === 'ArrowLeft' || key === 'a') steer(k, -1); if (key === 'ArrowRight' || key === 'd') steer(k, 1); }
});
})();
