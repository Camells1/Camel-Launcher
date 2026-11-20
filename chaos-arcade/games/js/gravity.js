/* Gravity Flip */
(function(){
const PAD = 40;
function obstacle(k){
  const d = k.data, r = Math.random(), x = k.W + 20;
  if (r < .4) d.obs.push({ x, w:28, side:Math.random() < .5 ? 0 : 1, h:k.rand(26, 46) });
  else if (r < .7){ d.obs.push({ x, w:24, side:0, h:k.rand(24, 40) }); d.obs.push({ x:x + 150, w:24, side:1, h:k.rand(24, 40) }); }
  else d.obs.push({ x, w:60, side:Math.random() < .5 ? 0 : 1, h:k.rand(20, 30) });
  if (Math.random() < .35) d.gems.push({ x:x + 70, y:k.rand(PAD + 30, k.H - PAD - 30) });
}
function flip(k){ const d = k.data; if (d.dead) return; d.g = -d.g; d.vy *= .3; k.beep(d.g > 0 ? 300 : 600, .05, 'square', .05); d.flips++; }
Kit.def({ waitInput:true,
  aspect:.75, winAt:500,
  how:'Your cube runs on its own. Tap, click or press SPACE to flip gravity between the floor and ceiling. Dodge the spikes, grab 💎 for +25. It speeds up the longer you survive.',
  init(k){ const d = k.data; d.y = k.H - PAD - 14; d.vy = 0; d.g = 1; d.obs = []; d.gems = []; d.next = 1.2; d.speed = 220; d.dist = 0; d.dead = false; d.flips = 0; d.trail = []; },
  update(dt, k){
    const d = k.data, px = k.W * .25;
    d.speed = 220 + k.t * 6; d.dist += d.speed * dt;
    const before = Math.floor(d.dist / 50); d.newm = before;
    if (Math.floor(d.dist / 50) > (d.lastm || 0)){ k.add(Math.floor(d.dist / 50) - (d.lastm || 0)); d.lastm = Math.floor(d.dist / 50); }
    d.vy += d.g * 2600 * dt; d.y += d.vy * dt;
    const top = PAD + 14, bot = k.H - PAD - 14;
    if (d.y > bot){ d.y = bot; d.vy = 0; } if (d.y < top){ d.y = top; d.vy = 0; }
    d.trail.push({ x:px, y:d.y }); if (d.trail.length > 12) d.trail.shift();
    d.trail.forEach(t => t.x -= d.speed * dt);
    d.next -= dt; if (d.next <= 0){ obstacle(k); d.next = Math.max(.55, 1.3 - k.t * .015) * k.rand(.8, 1.3); }
    d.obs.forEach(o => o.x -= d.speed * dt); d.gems.forEach(g => g.x -= d.speed * dt);
    for (const o of d.obs){
      const oy = o.side === 0 ? k.H - PAD - o.h : PAD;
      if (px + 12 > o.x + 4 && px - 12 < o.x + o.w - 4 && d.y + 12 > oy + 4 && d.y - 12 < oy + o.h - 4){ d.dead = true; k.boom(); k.shake(14, .4); k.flash('#ff3a3a', .25); k.burst(px, d.y, ['#55ffff','#ffffff','#ff55ff'], 30, 320); return k.over({ lines:['🔄 ' + Math.floor(d.dist / 50) + 'm · ' + d.flips + ' flips'] }); }
    }
    d.gems.forEach(g => { if (!g.got && Math.hypot(g.x - px, g.y - d.y) < 22){ g.got = true; k.hit(25, g.x, g.y); k.coin(); k.burst(g.x, g.y, ['#55ffff','#ffffff'], 10); } });
    d.obs = d.obs.filter(o => o.x > -80); d.gems = d.gems.filter(g => g.x > -20 && !g.got);
  },
  draw(ctx, k){
    const d = k.data, hue = ((k.t || 0) * 8) % 360;
    ctx.fillStyle = 'hsl(' + hue + ',40%,10%)'; ctx.fillRect(0, 0, k.W, k.H);
    ctx.fillStyle = 'hsl(' + hue + ',70%,45%)'; ctx.fillRect(0, 0, k.W, PAD); ctx.fillRect(0, k.H - PAD, k.W, PAD);
    const off = ((d.dist || 0) % 40);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let x = -off; x < k.W; x += 40){ ctx.fillRect(x, 0, 20, PAD); ctx.fillRect(x + 20, k.H - PAD, 20, PAD); }
    if (!d.obs) return;
    d.obs.forEach(o => {
      ctx.fillStyle = '#ff3a6a';
      const n = Math.max(1, Math.floor(o.w / 14));
      for (let i=0;i<n;i++){
        const sx = o.x + i * o.w / n, sw = o.w / n;
        ctx.beginPath();
        if (o.side === 0){ ctx.moveTo(sx, k.H - PAD); ctx.lineTo(sx + sw/2, k.H - PAD - o.h); ctx.lineTo(sx + sw, k.H - PAD); }
        else { ctx.moveTo(sx, PAD); ctx.lineTo(sx + sw/2, PAD + o.h); ctx.lineTo(sx + sw, PAD); }
        ctx.fill();
      }
    });
    ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    d.gems.forEach(g => ctx.fillText('💎', g.x, g.y + Math.sin(k.t * 6 + g.x) * 3));
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    d.trail.forEach((t, i) => { ctx.globalAlpha = i / 24; ctx.fillStyle = '#55ffff'; ctx.fillRect(t.x - 10, t.y - 10, 20, 20); }); ctx.globalAlpha = 1;
    const px = k.W * .25;
    ctx.save(); ctx.translate(px, d.y); ctx.rotate((d.dist || 0) / 30 * (d.g || 1));
    ctx.shadowColor = '#55ffff'; ctx.shadowBlur = 14; ctx.fillStyle = '#55ffff'; ctx.fillRect(-12, -12, 24, 24); ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a2a3a'; ctx.fillRect(-6, -6, 12, 12); ctx.restore();
  },
  down(x, y, k){ flip(k); },
  key(key, k){ if (key === ' ' || key === 'ArrowUp' || key === 'ArrowDown' || key === 'w' || key === 's') flip(k); }
});
})();
