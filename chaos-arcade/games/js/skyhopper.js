/* Sky Hopper */
(function(){
function plat(k, y){
  const h = -y / 100, r = Math.random();
  const type = h > 15 && r < .18 ? 'break' : h > 8 && r < .35 ? 'move' : 'norm';
  return { x:k.rand(10, k.W - 70), y, w:60, type, vx:type === 'move' ? k.rand(40, 90) * (Math.random() < .5 ? -1 : 1) : 0, spring:Math.random() < .08, coin:Math.random() < .2, broken:false };
}
Kit.def({
  aspect:.6, winAt:2000,
  how:'You bounce automatically. Hold the left or right side of the screen (or ←/→) to steer. You wrap around the edges. 🌀 Springs launch you sky-high, cracked platforms break, 🪙 coins are +50. Fall off the bottom and it is over.',
  init(k){ const d = k.data; d.x = k.W/2; d.y = k.H - 80; d.vy = -620; d.cam = 0; d.dir = 0; d.max = 0; d.plats = []; for (let y = k.H - 30; y > -k.H; y -= 70) d.plats.push(plat(k, y)); d.plats[0].x = k.W/2 - 30; d.plats[0].type = 'norm'; d.face = 1; },
  update(dt, k){
    const d = k.data, kd = (k.kL ? -1 : 0) + (k.kR ? 1 : 0);
    const steer = kd || d.dir;
    d.x += steer * 330 * dt; if (steer) d.face = steer;
    if (d.x < -15) d.x = k.W + 15; if (d.x > k.W + 15) d.x = -15;
    d.vy += 1300 * dt; const oy = d.y; d.y += d.vy * dt;
    d.plats.forEach(p => {
      if (p.type === 'move'){ p.x += p.vx * dt; if (p.x < 0 || p.x > k.W - p.w) p.vx = -p.vx; }
      if (p.broken){ p.y += 400 * dt; return; }
      if (d.vy > 0 && oy + 14 <= p.y && d.y + 14 >= p.y && d.x > p.x - 10 && d.x < p.x + p.w + 10){
        if (p.type === 'break'){ p.broken = true; k.beep(200, .08, 'sawtooth', .05); k.burst(p.x + p.w/2, p.y - d.cam, ['#a07a4a','#7a5a3a'], 10); return; }
        d.y = p.y - 14;
        if (p.spring && d.x > p.x + p.w/2 - 14 && d.x < p.x + p.w/2 + 14){ d.vy = -1150; k.beep(300, .2, 'triangle', .1); k.pop(d.x, d.y - d.cam - 20, 'BOING!', '#55ffff'); k.shake(4); }
        else { d.vy = -620; k.beep(420 + Math.min(400, -d.y / 20), .04, 'square', .04); }
      }
      if (p.coin && Math.hypot(p.x + p.w/2 - d.x, p.y - 30 - d.y) < 22){ p.coin = false; k.add(50, d.x, d.y - d.cam - 30, '#ffd700'); k.coin(); }
    });
    const h = Math.floor(Math.max(0, (k.H - 80 - d.y) / 10));
    if (h > d.max){ k.add(h - d.max); d.max = h; }
    d.cam = Math.min(d.cam, d.y - k.H * .4);
    const topY = Math.min.apply(null, d.plats.map(p => p.y));
    if (topY > d.cam - 80){ d.plats.push(plat(k, topY - k.rand(60, 95 + Math.min(40, d.max / 30)))); }
    d.plats = d.plats.filter(p => p.y - d.cam < k.H + 40);
    if (d.y - d.cam > k.H + 30){ k.bad(); k.shake(8); k.over({ lines:['🦘 Height ' + d.max + 'm'] }); }
  },
  draw(ctx, k){
    const d = k.data, h = d.max || 0;
    const g = ctx.createLinearGradient(0, 0, 0, k.H); const t = Math.min(1, h / 3000);
    g.addColorStop(0, 'rgb(' + Math.round(80 - 70*t) + ',' + Math.round(140 - 120*t) + ',' + Math.round(230 - 160*t) + ')'); g.addColorStop(1, 'rgb(' + Math.round(170 - 120*t) + ',' + Math.round(210 - 150*t) + ',255)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, k.W, k.H);
    if (t > .3){ ctx.fillStyle = 'rgba(255,255,255,' + (t - .3) + ')'; for (let i=0;i<40;i++) ctx.fillRect((i * 97) % k.W, (i * 61 - (d.cam || 0) * .1) % k.H, 2, 2); }
    ctx.fillStyle = 'rgba(255,255,255,.6)'; for (let i=0;i<5;i++){ const cy = ((i * 170 - (d.cam || 0) * .3) % (k.H + 60) + k.H + 60) % (k.H + 60) - 30; ctx.fillRect((i * 113) % (k.W - 60), cy, 70, 14); }
    if (!d.plats) return;
    d.plats.forEach(p => {
      const y = p.y - d.cam;
      ctx.fillStyle = p.type === 'break' ? '#a07a4a' : p.type === 'move' ? '#55aaff' : '#5fd03a';
      ctx.fillRect(p.x, y, p.w, 12); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(p.x, y, p.w, 3);
      if (p.type === 'break'){ ctx.fillStyle = '#5a3a1a'; ctx.fillRect(p.x + 20, y + 3, 3, 8); ctx.fillRect(p.x + 38, y + 2, 3, 9); }
      if (p.spring){ ctx.fillStyle = '#ccc'; ctx.fillRect(p.x + p.w/2 - 7, y - 10, 14, 10); ctx.fillStyle = '#ff55ff'; ctx.fillRect(p.x + p.w/2 - 9, y - 13, 18, 4); }
      if (p.coin){ const w = Math.abs(Math.sin(k.t * 5)) * 12 + 3; ctx.fillStyle = '#ffd700'; ctx.fillRect(p.x + p.w/2 - w/2, y - 38, w, 16); }
    });
    const py = d.y - d.cam;
    ctx.save(); ctx.translate(d.x, py); ctx.scale(d.face, 1);
    ctx.fillStyle = '#ffaa33'; ctx.fillRect(-12, -14, 24, 24); ctx.fillStyle = '#fff'; ctx.fillRect(2, -9, 8, 8); ctx.fillStyle = '#000'; ctx.fillRect(6, -7, 4, 4);
    ctx.fillStyle = '#c86a1a'; ctx.fillRect(-12, 10, 8, 6); ctx.fillRect(4, 10, 8, 6); ctx.fillStyle = '#ff6a6a'; ctx.fillRect(12, -2, 6, 4);
    ctx.restore();
  },
  down(x, y, k){ k.data.dir = x < k.W/2 ? -1 : 1; },
  move(x, y, k, pressed){ if (pressed) k.data.dir = x < k.W/2 ? -1 : 1; },
  up(x, y, k){ k.data.dir = 0; },
  key(key, k){ if (key === 'ArrowLeft' || key === 'a') k.kL = true; if (key === 'ArrowRight' || key === 'd') k.kR = true; },
  keyup(key, k){ if (key === 'ArrowLeft' || key === 'a') k.kL = false; if (key === 'ArrowRight' || key === 'd') k.kR = false; }
});
})();
