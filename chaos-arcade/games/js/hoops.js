/* Hoop Shot */
(function(){
function resetBall(k){ const d = k.data; d.ball = { x:k.W/2, y:k.H - 70, vx:0, vy:0, r:17, fly:false, scored:false, rim:false, rot:0 }; }
Kit.def({
  aspect:.66, winAt:30,
  how:'Swipe (flick) upward from the ball to shoot. A longer, faster flick throws harder. A clean SWISH (no rim) is worth 3, otherwise 2. Score in a row to catch FIRE (double points). After 5 baskets the hoop starts moving. 60 seconds.',
  init(k){ const d = k.data; d.hx = k.W/2; d.hy = k.H * .3; d.hdir = 1; d.made = 0; d.streak = 0; d.net = 0; resetBall(k); k.timer(60); k.hud('st', '🏀 0'); },
  update(dt, k){
    const d = k.data, b = d.ball, rw = 66;
    if (d.made >= 5){ d.hx += d.hdir * (40 + d.made * 6) * dt; if (d.hx < 60 || d.hx > k.W - 60) d.hdir = -d.hdir; }
    d.net = Math.max(0, d.net - dt);
    if (!b.fly) return;
    b.vy += 1300 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vx * dt * .05;
    [d.hx - rw/2, d.hx + rw/2].forEach(rx => { const dx = b.x - rx, dy = b.y - d.hy, dist = Math.hypot(dx, dy); if (dist < b.r + 4){ const nx = dx / dist, ny = dy / dist, dot = b.vx * nx + b.vy * ny; if (dot < 0){ b.vx -= 1.7 * dot * nx; b.vy -= 1.7 * dot * ny; } b.x = rx + nx * (b.r + 4); b.y = d.hy + ny * (b.r + 4); b.rim = true; k.beep(200, .04, 'square', .06); } });
    if (b.x < b.r || b.x > k.W - b.r){ b.vx = -b.vx * .7; b.x = k.clamp(b.x, b.r, k.W - b.r); }
    if (b.vy < 0 && b.y < 20){ b.vy = Math.abs(b.vy) * .5; }
    if (!b.scored && b.vy > 0 && Math.abs(b.x - d.hx) < rw/2 - 4 && b.y > d.hy - 4 && b.y < d.hy + 16){
      b.scored = true; d.made++; d.streak++; d.net = .4;
      const fire = d.streak >= 3, pts = (b.rim ? 2 : 3) * (fire ? 2 : 1);
      k.add(pts, d.hx, d.hy - 30, fire ? '#ff6a00' : '#ffff55'); k.good(); k.burst(d.hx, d.hy + 10, fire ? ['#ff6a00','#ffd700','#ffffff'] : ['#ffffff','#ffaa00'], 20);
      if (!b.rim) k.pop(d.hx, d.hy - 55, 'SWISH!', '#55ffff');
      if (d.streak === 3){ k.pop(k.W/2, k.H/2, '🔥 ON FIRE!', '#ff6a00'); k.flash('#ff6a00', .15); }
      k.shake(4); k.hud('st', '🏀 ' + d.made + (fire ? ' 🔥' : ''));
    }
    if (b.y > k.H + 40){ if (!b.scored){ d.streak = 0; k.miss(); k.beep(150, .08); k.hud('st', '🏀 ' + d.made); } resetBall(k); }
  },
  draw(ctx, k){
    const d = k.data;
    const g = ctx.createLinearGradient(0, 0, 0, k.H); g.addColorStop(0, '#2a1a4a'); g.addColorStop(1, '#5a2a1a'); ctx.fillStyle = g; ctx.fillRect(0, 0, k.W, k.H);
    ctx.fillStyle = '#b8743a'; ctx.fillRect(0, k.H - 40, k.W, 40); ctx.fillStyle = '#a0622a'; for (let x = 0; x < k.W; x += 30) ctx.fillRect(x, k.H - 40, 2, 40);
    if (!d.ball) return;
    const rw = 66;
    ctx.fillStyle = '#eee'; ctx.fillRect(d.hx - 55, d.hy - 80, 110, 74); ctx.strokeStyle = '#ff3a3a'; ctx.lineWidth = 3; ctx.strokeRect(d.hx - 22, d.hy - 44, 44, 34);
    ctx.fillStyle = '#888'; ctx.fillRect(d.hx - 3, d.hy - 6, 6, 8);
    const sway = d.net > 0 ? Math.sin(d.net * 40) * 4 : 0;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    for (let i=0;i<=6;i++){ ctx.beginPath(); ctx.moveTo(d.hx - rw/2 + i * rw/6, d.hy); ctx.lineTo(d.hx - rw/3 + i * rw/9 + sway, d.hy + 38); ctx.stroke(); }
    const b = d.ball, behind = b.fly && b.vy < 0;
    const drawBall = () => { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.fillStyle = d.streak >= 3 ? '#ff6a00' : '#e8762a'; ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#3a1a0a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-b.r, 0); ctx.lineTo(b.r, 0); ctx.moveTo(0, -b.r); ctx.lineTo(0, b.r); ctx.stroke(); ctx.restore(); };
    if (!behind) drawBall();
    ctx.fillStyle = '#ff3a1a'; ctx.fillRect(d.hx - rw/2 - 4, d.hy - 3, rw + 8, 6);
    if (behind) drawBall();
    if (d.aim){ ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + (d.aim.x - d.aim.sx) * 1.2, b.y + (d.aim.y - d.aim.sy) * 1.2); ctx.stroke(); ctx.setLineDash([]); }
  },
  down(x, y, k){ const d = k.data; if (d.ball.fly) return; d.aim = { sx:x, sy:y, x, y, t:performance.now() }; },
  move(x, y, k, p){ const d = k.data; if (p && d.aim){ d.aim.x = x; d.aim.y = y; } },
  up(x, y, k){
    const d = k.data, a = d.aim; d.aim = null; if (!a || d.ball.fly) return;
    const dx = x - a.sx, dy = y - a.sy; if (dy > -25) return;
    const dt = Math.max(60, performance.now() - a.t), sp = Math.min(1.6, 260 / dt + .55);
    d.ball.vx = dx * 3.2 * sp; d.ball.vy = Math.max(-1250, dy * 4.6 * sp); d.ball.fly = true; k.beep(400, .06);
  },
  timeUp(k){ k.over({ lines:['🏀 ' + k.data.made + ' baskets'] }); }
});
})();
