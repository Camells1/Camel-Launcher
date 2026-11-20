/* Cave Copter */
(function(){
Kit.def({
  aspect:.75, winAt:400,
  how:'Hold (tap and hold, or hold SPACE) to lift the copter. Let go to drop. Stay inside the cave and dodge the rock pillars. The cave narrows and speeds up the further you fly. 💎 crystals are +20.',
  init(k){ const d = k.data; d.y = k.H/2; d.vy = 0; d.hold = false; d.segs = []; d.x0 = 0; d.speed = 170; d.gap = k.H * .62; d.mid = k.H/2; d.pillars = []; d.gems = []; d.smoke = []; d.dist = 0;
    for (let x = 0; x < k.W + 40; x += 20) d.segs.push({ x, top:d.mid - d.gap/2, bot:d.mid + d.gap/2 }); },
  update(dt, k){
    const d = k.data, px = k.W * .25;
    d.speed = 170 + k.t * 4; d.gap = Math.max(k.H * .32, k.H * .62 - k.t * 2.2);
    d.vy += (d.hold ? -900 : 700) * dt; d.vy = k.clamp(d.vy, -360, 420); d.y += d.vy * dt;
    const dx = d.speed * dt; d.dist += dx;
    if (Math.floor(d.dist / 30) > (d.m || 0)){ d.m = Math.floor(d.dist / 30); k.add(1); }
    d.segs.forEach(s => s.x -= dx); d.pillars.forEach(p => p.x -= dx); d.gems.forEach(g => g.x -= dx); d.smoke.forEach(s => { s.x -= dx; s.t += dt; });
    while (d.segs[0].x < -20) d.segs.shift();
    while (d.segs[d.segs.length - 1].x < k.W + 20){
      const last = d.segs[d.segs.length - 1]; d.mid = k.clamp(d.mid + k.rand(-28, 28), d.gap/2 + 10, k.H - d.gap/2 - 10);
      d.segs.push({ x:last.x + 20, top:d.mid - d.gap/2, bot:d.mid + d.gap/2 });
      if (Math.random() < .06 && k.t > 2) d.pillars.push({ x:last.x + 20, y:d.mid + k.rand(-d.gap * .25, d.gap * .25), h:k.rand(30, 60) });
      if (Math.random() < .05) d.gems.push({ x:last.x + 20, y:d.mid + k.rand(-d.gap * .3, d.gap * .3) });
    }
    d.pillars = d.pillars.filter(p => p.x > -30); d.gems = d.gems.filter(g => g.x > -20 && !g.got);
    if (Math.random() < .6) d.smoke.push({ x:px - 18, y:d.y + 4, t:0 }); d.smoke = d.smoke.filter(s => s.t < .8);
    const seg = d.segs.find(s => s.x >= px - 10) || d.segs[0];
    const crash = d.y - 9 < seg.top || d.y + 9 > seg.bot || d.pillars.some(p => Math.abs(p.x - px) < 18 && Math.abs(p.y - d.y) < p.h/2 + 8);
    d.gems.forEach(g => { if (Math.hypot(g.x - px, g.y - d.y) < 20){ g.got = true; k.hit(20, g.x, g.y); k.coin(); k.burst(g.x, g.y, ['#55ffff','#ffffff'], 10); } });
    if (crash){ k.boom(); k.shake(14, .4); k.flash('#ffaa00', .25); k.burst(px, d.y, ['#ffaa00','#ff5555','#ffffff','#555555'], 34, 340); k.over({ lines:['🚁 Flew ' + Math.floor(d.dist / 30) + 'm'] }); }
  },
  draw(ctx, k){
    const d = k.data;
    ctx.fillStyle = '#0d1420'; ctx.fillRect(0, 0, k.W, k.H);
    if (!d.segs) return;
    ctx.fillStyle = '#3a5a3a';
    ctx.beginPath(); ctx.moveTo(0, 0); d.segs.forEach(s => ctx.lineTo(s.x, s.top)); ctx.lineTo(k.W + 40, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, k.H); d.segs.forEach(s => ctx.lineTo(s.x, s.bot)); ctx.lineTo(k.W + 40, k.H); ctx.fill();
    ctx.strokeStyle = '#7aca5a'; ctx.lineWidth = 3;
    ctx.beginPath(); d.segs.forEach((s, i) => ctx[i ? 'lineTo' : 'moveTo'](s.x, s.top)); ctx.stroke();
    ctx.beginPath(); d.segs.forEach((s, i) => ctx[i ? 'lineTo' : 'moveTo'](s.x, s.bot)); ctx.stroke();
    ctx.fillStyle = '#6a5a4a'; d.pillars.forEach(p => { ctx.fillRect(p.x - 10, p.y - p.h/2, 20, p.h); ctx.fillStyle = '#8a7a6a'; ctx.fillRect(p.x - 10, p.y - p.h/2, 20, 4); ctx.fillStyle = '#6a5a4a'; });
    d.gems.forEach(g => { ctx.fillStyle = '#55ffff'; ctx.beginPath(); ctx.moveTo(g.x, g.y - 9); ctx.lineTo(g.x + 7, g.y); ctx.lineTo(g.x, g.y + 9); ctx.lineTo(g.x - 7, g.y); ctx.fill(); });
    d.smoke.forEach(s => { ctx.globalAlpha = .5 - s.t * .6; ctx.fillStyle = '#aaa'; ctx.fillRect(s.x - 4, s.y - 4 - s.t * 10, 8, 8); }); ctx.globalAlpha = 1;
    const px = k.W * .25; ctx.save(); ctx.translate(px, d.y); ctx.rotate(d.vy / 900);
    ctx.fillStyle = '#ffd23a'; ctx.fillRect(-14, -8, 26, 16); ctx.fillStyle = '#9adfff'; ctx.fillRect(4, -6, 8, 8); ctx.fillStyle = '#ffd23a'; ctx.fillRect(-26, -4, 14, 5);
    ctx.fillStyle = '#ccc'; const bl = Math.sin(k.t * 50) * 16; ctx.fillRect(-bl, -13, bl * 2 || 2, 3); ctx.fillRect(-2, -12, 4, 4);
    ctx.fillStyle = '#555'; ctx.fillRect(-10, 8, 20, 3);
    ctx.restore();
    if (k.t < 1.5 && k.running){ ctx.fillStyle = '#fff'; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center'; ctx.fillText('HOLD TO RISE', k.W/2, 30); ctx.textAlign = 'left'; }
  },
  down(x, y, k){ k.data.hold = true; }, up(x, y, k){ k.data.hold = false; },
  key(key, k){ if (key === ' ' || key === 'ArrowUp') k.data.hold = true; }, keyup(key, k){ if (key === ' ' || key === 'ArrowUp') k.data.hold = false; }
});
})();
