/* Jetpack Bird */
(function(){
function flap(k){ const d = k.data; if (d.dead) return; d.vy = -330; k.beep(520, .05, 'square', .05); for (let i=0;i<4;i++) d.puffs.push({ x:d.x - 10, y:d.y + 10, t:0 }); }
Kit.def({
  aspect:.66, winAt:10,
  how:'Tap, click or press SPACE to fire your jetpack. Fly through the gaps. Grab 🪙 coins for +5. Every 10 pipes the world speeds up. One touch and it is over.',
  scoreText:(s) => s,
  init(k){ const d = k.data; d.x = k.W * .3; d.y = k.H * .4; d.vy = 0; d.pipes = []; d.coins = []; d.next = 0; d.speed = 150; d.puffs = []; d.dead = false; d.passed = 0; d.ground = 0; },
  update(dt, k){
    const d = k.data;
    d.vy += 900 * dt; d.y += d.vy * dt; d.ground = (d.ground + d.speed * dt) % 24;
    d.puffs.forEach(p => { p.t += dt; p.x -= d.speed * dt * .6; p.y += 30 * dt; }); d.puffs = d.puffs.filter(p => p.t < .5);
    d.next -= dt;
    if (d.next <= 0){
      const gap = Math.max(118, 165 - d.passed * 2), top = k.rand(50, k.H - 90 - gap);
      d.pipes.push({ x:k.W + 30, top, gap, w:56, scored:false });
      if (Math.random() < .5) d.coins.push({ x:k.W + 58, y:top + gap/2, got:false });
      d.next = Math.max(1.05, 1.6 - d.passed * .015);
    }
    d.pipes.forEach(p => {
      p.x -= d.speed * dt;
      if (!p.scored && p.x + p.w < d.x){ p.scored = true; d.passed++; k.add(1, d.x, d.y - 30, '#ffff55'); k.beep(880, .06); if (d.passed % 10 === 0){ d.speed += 20; k.pop(k.W/2, k.H/3, 'SPEED UP!', '#ff55ff'); k.flash('#ff55ff', .1); } }
      const r = 13;
      if (d.x + r > p.x && d.x - r < p.x + p.w && (d.y - r < p.top || d.y + r > p.top + p.gap)) crash(k);
    });
    d.coins.forEach(c => { c.x -= d.speed * dt; if (!c.got && Math.hypot(c.x - d.x, c.y - d.y) < 22){ c.got = true; k.add(5, c.x, c.y, '#ffd700'); k.coin(); k.burst(c.x, c.y, ['#ffd700','#fff39a'], 10); } });
    d.pipes = d.pipes.filter(p => p.x > -80); d.coins = d.coins.filter(c => c.x > -30 && !c.got);
    if (d.y > k.H - 40 || d.y < -40) crash(k);
  },
  draw(ctx, k){
    const d = k.data;
    const g = ctx.createLinearGradient(0, 0, 0, k.H); g.addColorStop(0, '#3a1f7a'); g.addColorStop(1, '#ff7a8a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, k.W, k.H);
    ctx.fillStyle = 'rgba(255,255,255,.12)'; for (let i=0;i<6;i++){ const bx = ((i * 97 - k.t * 20) % (k.W + 120) + k.W + 120) % (k.W + 120) - 60; ctx.fillRect(bx, k.H - 160 - (i % 3) * 40, 60, 200); }
    if (!d.pipes) return;
    d.pipes.forEach(p => {
      ctx.fillStyle = '#2ac24a'; ctx.fillRect(p.x, 0, p.w, p.top); ctx.fillRect(p.x, p.top + p.gap, p.w, k.H);
      ctx.fillStyle = '#1a8a2a'; ctx.fillRect(p.x - 4, p.top - 18, p.w + 8, 18); ctx.fillRect(p.x - 4, p.top + p.gap, p.w + 8, 18);
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(p.x + 6, 0, 6, p.top - 18); ctx.fillRect(p.x + 6, p.top + p.gap + 18, 6, k.H);
    });
    d.coins.forEach(c => { const w = Math.abs(Math.sin(k.t * 6)) * 14 + 3; ctx.fillStyle = '#ffd700'; ctx.fillRect(c.x - w/2, c.y - 9, w, 18); });
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(0, k.H - 40, k.W, 40); ctx.fillStyle = '#7ac24a'; ctx.fillRect(0, k.H - 40, k.W, 8);
    ctx.fillStyle = '#5aa23a'; for (let x = -d.ground; x < k.W; x += 24) ctx.fillRect(x, k.H - 40, 12, 8);
    d.puffs.forEach(p => { ctx.globalAlpha = 1 - p.t * 2; ctx.fillStyle = p.t < .15 ? '#ffaa00' : '#ccc'; ctx.fillRect(p.x - 4, p.y - 4, 8, 8); }); ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(Math.max(-.5, Math.min(1.2, d.vy / 500)));
    ctx.fillStyle = '#ffd23a'; ctx.fillRect(-14, -11, 28, 22); ctx.fillStyle = '#ff8a1a'; ctx.fillRect(10, -2, 10, 7);
    ctx.fillStyle = '#fff'; ctx.fillRect(2, -8, 8, 8); ctx.fillStyle = '#000'; ctx.fillRect(6, -6, 4, 4);
    ctx.fillStyle = '#e0b020'; ctx.fillRect(-12, Math.sin(k.t * 30) * 4 - 2, 12, 7);
    ctx.fillStyle = '#777'; ctx.fillRect(-20, -6, 7, 14);
    ctx.restore();
    if (k.running && k.t < 1.2){ ctx.fillStyle = '#fff'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center'; ctx.fillText('TAP TO FLY!', k.W/2, k.H * .25); ctx.textAlign = 'left'; }
  },
  down(x, y, k){ flap(k); },
  key(key, k){ if (key === ' ' || key === 'ArrowUp' || key === 'w') flap(k); }
});
function crash(k){
  const d = k.data; if (d.dead) return; d.dead = true;
  k.boom(); k.shake(12, .4); k.flash('#ffffff', .25); k.burst(d.x, d.y, ['#ffd23a','#ff8a1a','#ffffff'], 30, 300);
  k.over({ lines:['🐤 ' + d.passed + ' pipes cleared'], label:k.score + ' pts (' + d.passed + ' pipes)' });
}
})();
