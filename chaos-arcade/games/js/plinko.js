/* Plinko Drop */
(function(){
const MULT = [10, 4, 2, 1, .5, .2, .5, 1, 2, 4, 10], ROWS = 11, BALLS = 15, COST = 10;
function layout(k){ const d = k.data, sp = k.W / (MULT.length + 1); d.sp = sp; d.pegs = []; for (let r=0;r<ROWS;r++){ const n = r + 3; for (let i=0;i<n;i++) d.pegs.push({ x:k.W/2 + (i - (n - 1)/2) * sp, y:70 + r * sp * .82, lit:0 }); } d.binY = 70 + ROWS * sp * .82 + 6; }
Kit.def({ noBestBar:true,
  aspect:.78, winAt:151,
  scoreText:(s) => s + '🪙',
  how:'Start with 150 coins and 15 balls. Each drop costs 10. Tap anywhere along the top to drop a ball from there. It bounces through the pegs into a multiplier slot: the edges pay 10x, the middle only 0.2x. Your score is the coins you end with.',
  init(k){ const d = k.data; d.coins = 150; d.left = BALLS; d.balls = []; d.flashBin = {}; layout(k); k.set(d.coins); k.hud('bl', '🟡 ' + d.left + ' balls'); },
  resize(k){ layout(k); },
  update(dt, k){
    const d = k.data, steps = 3;
    d.balls.forEach(b => {
      for (let s=0;s<steps;s++){
        const h = dt / steps; b.vy += 700 * h; b.x += b.vx * h; b.y += b.vy * h;
        for (const p of d.pegs){ const dx = b.x - p.x, dy = b.y - p.y, dist = Math.hypot(dx, dy), min = 6 + 4; if (dist < min){ const nx = dx / dist, ny = dy / dist; b.x = p.x + nx * min; b.y = p.y + ny * min; const dot = b.vx * nx + b.vy * ny; b.vx = (b.vx - 1.6 * dot * nx) * .7 + (Math.random() - .5) * 40; b.vy = (b.vy - 1.6 * dot * ny) * .55; p.lit = .25; if (Math.random() < .5) k.beep(900 + Math.random() * 600, .02, 'triangle', .03); } }
        if (b.x < 8){ b.x = 8; b.vx = Math.abs(b.vx); } if (b.x > k.W - 8){ b.x = k.W - 8; b.vx = -Math.abs(b.vx); }
      }
      if (b.y > d.binY && !b.done){
        b.done = true; const slot = k.clamp(Math.floor((b.x - (k.W/2 - MULT.length * d.sp / 2)) / d.sp), 0, MULT.length - 1), m = MULT[slot], win = Math.round(COST * m);
        d.coins += win; k.set(d.coins); d.flashBin[slot] = .6;
        k.pop(b.x, d.binY - 20, m + 'x', m >= 4 ? '#ffd700' : m >= 1 ? '#55ff55' : '#ff7a7a');
        if (m >= 4){ k.good(); k.flash('#ffd700', .15); k.burst(b.x, d.binY, ['#ffd700','#ffffff'], 20); k.shake(5); } else k.beep(m >= 1 ? 700 : 250, .08);
      }
    });
    d.balls = d.balls.filter(b => !b.done);
    d.pegs.forEach(p => p.lit = Math.max(0, p.lit - dt)); Object.keys(d.flashBin).forEach(s => d.flashBin[s] -= dt);
    if (d.left <= 0 && !d.balls.length && !d.ending){ d.ending = true; k.over({ score:d.coins, win:d.coins > 150, title:d.coins > 150 ? '💰 PROFIT!' : '🙃 THE PEGS WIN', lines:['Ended with ' + d.coins + ' coins'] }); }
  },
  draw(ctx, k){
    const d = k.data;
    ctx.fillStyle = '#140a2a'; ctx.fillRect(0, 0, k.W, k.H);
    if (!d.pegs) return;
    ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(0, 0, k.W, 50);
    ctx.fillStyle = '#aaa'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillText('▼ TAP HERE TO DROP ▼', k.W/2, 30);
    d.pegs.forEach(p => { ctx.fillStyle = p.lit > 0 ? '#ffff55' : '#e0d8ff'; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); });
    const x0 = k.W/2 - MULT.length * d.sp / 2;
    MULT.forEach((m, i) => { const hue = m >= 4 ? '#ff3a6a' : m >= 2 ? '#ff9a1a' : m >= 1 ? '#ffd23a' : '#3a8a5a'; ctx.fillStyle = d.flashBin[i] > 0 ? '#ffffff' : hue; ctx.fillRect(x0 + i * d.sp + 2, d.binY, d.sp - 4, 26); ctx.fillStyle = '#000'; ctx.font = 'bold ' + Math.max(9, d.sp * .3) + 'px monospace'; ctx.fillText(m + 'x', x0 + i * d.sp + d.sp/2, d.binY + 17); });
    d.balls.forEach(b => { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10; ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; });
    ctx.textAlign = 'left';
  },
  down(x, y, k){
    const d = k.data; if (d.left <= 0 || d.coins < COST) return;
    if (d.balls.length >= 4) return;
    d.left--; d.coins -= COST; k.set(d.coins); k.hud('bl', '🟡 ' + d.left + ' balls');
    d.balls.push({ x:k.clamp(x, k.W * .2, k.W * .8) + (Math.random() - .5) * 4, y:20, vx:0, vy:0 }); k.beep(500, .05);
  },
  key(key, k){ if (key === ' ') this.down(k.W/2 + (Math.random() - .5) * 40, 20, k); }
});
})();
