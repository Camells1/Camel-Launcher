/* Paper Plane */
(function(){
Kit.def({
  aspect:.8, winAt:300,
  how:'Your paper plane glides forward on its own. Hold the TOP half of the screen (or ↑) to pull up, the BOTTOM half (or ↓) to dive. Fly through the ⭕ rings for points, avoid the buildings and the storm clouds. Wind gusts push you around.',
  init(k){ const d = k.data; d.y = k.H * .4; d.vy = 0; d.ang = 0; d.ctrl = 0; d.obs = []; d.rings = []; d.next = 1; d.rnext = .6; d.speed = 150; d.dist = 0; d.gust = 0; d.gustT = 4; d.trail = []; },
  update(dt, k){
    const d = k.data, px = k.W * .25;
    const ctrl = d.ctrl || ((k.kU ? -1 : 0) + (k.kD ? 1 : 0));
    d.speed = 150 + k.t * 3; d.dist += d.speed * dt;
    if (Math.floor(d.dist / 50) > (d.m || 0)){ d.m = Math.floor(d.dist / 50); k.add(1); }
    d.ang = k.clamp(d.ang + ctrl * 2.6 * dt - d.ang * .8 * dt, -.7, .7);
    d.gustT -= dt; if (d.gustT <= 0){ d.gust = k.rand(-70, 70); d.gustT = k.rand(2, 5); if (Math.abs(d.gust) > 40) k.pop(k.W/2, 40, d.gust < 0 ? '💨 UPDRAFT' : '💨 DOWNDRAFT', '#aaddff'); }
    d.vy = d.ang * 280 + 40 + d.gust; d.y += d.vy * dt;
    d.trail.push({ x:px, y:d.y }); if (d.trail.length > 18) d.trail.shift(); d.trail.forEach(t => t.x -= d.speed * dt);
    d.next -= dt; if (d.next <= 0){ const h = k.rand(k.H * .2, k.H * .5); if (Math.random() < .7) d.obs.push({ x:k.W + 30, w:k.rand(40, 70), h, t:'bld' }); else d.obs.push({ x:k.W + 30, y:k.rand(30, k.H * .45), w:80, h:40, t:'cloud' }); d.next = Math.max(.9, 2 - k.t * .015) * k.rand(.8, 1.3); }
    d.rnext -= dt; if (d.rnext <= 0){ d.rings.push({ x:k.W + 30, y:k.rand(k.H * .15, k.H * .6) }); d.rnext = k.rand(1.2, 2.2); }
    d.obs.forEach(o => o.x -= d.speed * dt); d.rings.forEach(r => r.x -= d.speed * dt);
    const hit = d.y < 0 || d.y > k.H - 20 || d.obs.some(o => o.t === 'bld' ? (px + 12 > o.x && px - 12 < o.x + o.w && d.y + 6 > k.H - o.h) : (Math.abs(px - (o.x + o.w/2)) < o.w/2 && Math.abs(d.y - (o.y + o.h/2)) < o.h/2));
    d.rings.forEach(r => { if (!r.got && Math.abs(r.x - px) < 10 && Math.abs(r.y - d.y) < 24){ r.got = true; k.hit(25, r.x, r.y - 30); k.beep(900 + k.combo * 40, .07, 'triangle', .1); k.burst(r.x, r.y, ['#ffd700','#ffffff'], 12); } if (!r.got && !r.missed && r.x < px - 20){ r.missed = true; k.combo = 0; } });
    d.obs = d.obs.filter(o => o.x > -100); d.rings = d.rings.filter(r => r.x > -40 && !r.got);
    if (hit){ k.boom(); k.shake(10); k.burst(px, d.y, ['#ffffff','#dddddd'], 24); k.over({ lines:['✈️ Glided ' + Math.floor(d.dist / 50) + 'm'] }); }
  },
  draw(ctx, k){
    const d = k.data, g = ctx.createLinearGradient(0, 0, 0, k.H);
    g.addColorStop(0, '#ff9a6a'); g.addColorStop(.6, '#ffd2a0'); g.addColorStop(1, '#a0c8ff'); ctx.fillStyle = g; ctx.fillRect(0, 0, k.W, k.H);
    ctx.fillStyle = 'rgba(80,60,120,.25)'; for (let i=0;i<8;i++){ const x = ((i * 90 - (d.dist || 0) * .2) % (k.W + 100) + k.W + 100) % (k.W + 100) - 50; ctx.fillRect(x, k.H - 80 - (i % 3) * 30, 50, 120); }
    if (!d.obs) return;
    d.obs.forEach(o => {
      if (o.t === 'bld'){ ctx.fillStyle = '#3a3a5a'; ctx.fillRect(o.x, k.H - o.h, o.w, o.h); ctx.fillStyle = '#ffe680'; for (let wy = k.H - o.h + 8; wy < k.H - 8; wy += 16) for (let wx = o.x + 6; wx < o.x + o.w - 8; wx += 14) if ((wx + wy) % 3) ctx.fillRect(wx, wy, 6, 8); }
      else { ctx.fillStyle = '#5a5a6a'; ctx.fillRect(o.x, o.y + 10, o.w, o.h - 10); ctx.fillRect(o.x + 15, o.y, o.w - 30, 20); if (Math.floor(k.t * 4) % 3 === 0){ ctx.fillStyle = '#ffff55'; ctx.fillRect(o.x + o.w/2 - 2, o.y + o.h, 4, 16); } }
    });
    d.rings.forEach(r => { ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(r.x, r.y, 8, 24, 0, 0, Math.PI * 2); ctx.stroke(); });
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); d.trail.forEach((t, i) => ctx[i ? 'lineTo' : 'moveTo'](t.x, t.y)); ctx.stroke();
    ctx.save(); ctx.translate(k.W * .25, d.y); ctx.rotate(d.ang);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-14, -9); ctx.lineTo(-8, 0); ctx.lineTo(-14, 9); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#aab'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  },
  down(x, y, k){ k.data.ctrl = y < k.H/2 ? -1 : 1; }, move(x, y, k, p){ if (p) k.data.ctrl = y < k.H/2 ? -1 : 1; }, up(x, y, k){ k.data.ctrl = 0; },
  key(key, k){ if (key === 'ArrowUp' || key === 'w' || key === ' ') k.kU = true; if (key === 'ArrowDown' || key === 's') k.kD = true; },
  keyup(key, k){ if (key === 'ArrowUp' || key === 'w' || key === ' ') k.kU = false; if (key === 'ArrowDown' || key === 's') k.kD = false; }
});
})();
