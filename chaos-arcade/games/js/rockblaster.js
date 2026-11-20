/* Rock Blaster: a turret in the middle of space, rocks split when shot */
(function(){
function spawnRock(k, size, x, y, vx, vy){
  const d = k.data;
  if (x == null){ const side = k.ri(0, 3), m = 40; x = side === 0 ? -m : side === 1 ? k.W + m : k.rand(0, k.W); y = side < 2 ? k.rand(0, k.H) : side === 2 ? -m : k.H + m;
    const a = Math.atan2(k.H / 2 - y, k.W / 2 - x) + k.rand(-.5, .5), sp = k.rand(40, 70) * (1 + d.wave * .08); vx = Math.cos(a) * sp; vy = Math.sin(a) * sp; }
  const r = [0, 14, 24, 38][size], pts = []; for (let i=0;i<10;i++) pts.push(r * k.rand(.75, 1.1));
  const gold = size === 3 && Math.random() < .1;
  d.rocks.push({ x, y, vx, vy, size, r, pts, rot:0, vr:k.rand(-1.5, 1.5), gold, hp:gold ? 3 : 1 });
}
function wave(k){ const d = k.data; d.wave++; d.toSpawn = 3 + d.wave * 2; d.spawnT = 0; k.hud('wv', '🌊 Wave ' + d.wave); if (d.wave > 1){ Arcade.bigText('WAVE ' + d.wave, '#55ffff'); k.add(100 * (d.wave - 1), k.W / 2, k.H / 2 - 40, '#55ff55'); } }
function fire(k){
  const d = k.data; if (d.cool > 0 || d.dead) return; d.cool = d.rapid > 0 ? .08 : .2;
  const sp = 520, a = d.ang; d.shots.push({ x:k.W / 2 + Math.cos(a) * 22, y:k.H / 2 + Math.sin(a) * 22, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp, life:1.3 });
  if (d.spread > 0){ [-.18, .18].forEach(o => d.shots.push({ x:k.W / 2, y:k.H / 2, vx:Math.cos(a + o) * sp, vy:Math.sin(a + o) * sp, life:1.1 })); }
  k.beep(880, .03, 'square', .025);
}
Kit.def({
  dom:false, aspect:.75, winAt:2000, medals:[1000, 2000, 4000],
  how:'Your turret sits in the middle of space. Hold your finger or mouse where you want to shoot (or turn with ←/→ and fire with Space). Big rocks split into smaller ones. You have 3 shields 🛡️. ✨ Golden rocks take 3 hits and drop a power-up: ⚡ rapid fire or 🔱 triple shot.',
  init(k){ const d = k.data; d.rocks = []; d.shots = []; d.parts = []; d.drops = []; d.wave = 0; d.ang = -Math.PI / 2; d.cool = 0; d.shield = 3; d.rapid = 0; d.spread = 0; d.hurt = 0; d.aim = null; d.keys = {}; wave(k); k.hud('sh', '🛡️ 3'); },
  update(dt, k){
    const d = k.data, cx = k.W / 2, cy = k.H / 2;
    d.cool -= dt; d.rapid -= dt; d.spread -= dt; d.hurt -= dt;
    if (d.aim){ const t = Math.atan2(d.aim.y - cy, d.aim.x - cx); let df = t - d.ang; df = Math.atan2(Math.sin(df), Math.cos(df)); d.ang += Math.max(-dt * 12, Math.min(dt * 12, df)); if (d.firing) fire(k); }
    if (d.keys.ArrowLeft) d.ang -= dt * 4; if (d.keys.ArrowRight) d.ang += dt * 4; if (d.keys[' ']) fire(k);
    d.spawnT -= dt; if (d.toSpawn > 0 && d.spawnT <= 0){ spawnRock(k, 3); d.toSpawn--; d.spawnT = Math.max(.5, 1.6 - d.wave * .1); }
    if (!d.toSpawn && !d.rocks.length) wave(k);
    d.shots.forEach(s => { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; });
    d.rocks.forEach(r => { r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.vr * dt; });
    d.parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
    d.drops.forEach(p => { const dx = cx - p.x, dy = cy - p.y, dist = Math.hypot(dx, dy); p.x += dx / dist * 90 * dt; p.y += dy / dist * 90 * dt; p.life -= dt;
      if (dist < 24){ p.life = 0; if (p.t === 'rapid') d.rapid = 6; else d.spread = 6; k.coin(); k.pop(cx, cy - 40, p.t === 'rapid' ? '⚡ RAPID FIRE' : '🔱 TRIPLE SHOT', '#ffd23a'); } });
    for (const s of d.shots){ if (s.life <= 0) continue;
      for (const r of d.rocks){ if (r.dead) continue; if (Math.hypot(s.x - r.x, s.y - r.y) < r.r){ s.life = 0; r.hp--;
        if (r.hp > 0){ k.beep(300, .03); k.burst(s.x, s.y, ['#ffd23a'], 4); break; }
        r.dead = true; k.hit([0, 40, 20, 10][r.size] * (r.gold ? 5 : 1), r.x, r.y); k.beep(140 + r.size * 30, .08, 'sawtooth', .06); k.shake(r.size, .08);
        k.burst(r.x, r.y, r.gold ? ['#ffd23a','#ffffff'] : ['#9a8a7a','#c8b8a8','#ffffff'], 6 + r.size * 4);
        if (r.size > 1) for (let i=0;i<2;i++){ const a = Math.atan2(r.vy, r.vx) + (i ? .7 : -.7), sp = Math.hypot(r.vx, r.vy) * 1.35; spawnRock(k, r.size - 1, r.x, r.y, Math.cos(a) * sp, Math.sin(a) * sp); }
        if (r.gold) d.drops.push({ x:r.x, y:r.y, t:Math.random() < .5 ? 'rapid' : 'spread', life:8 });
        break; } } }
    for (const r of d.rocks){ if (r.dead) continue;
      if (Math.hypot(r.x - cx, r.y - cy) < r.r + 16){ r.dead = true; if (d.hurt > 0) continue; d.shield--; d.hurt = 1.2; k.bad(); k.shake(10, .3); k.flash('#ff3333', .2); k.miss(); k.hud('sh', '🛡️ ' + Math.max(0, d.shield));
        k.burst(r.x, r.y, ['#ff5555','#ffffff'], 16);
        if (d.shield <= 0){ d.dead = true; k.boom(); setTimeout(() => k.over({ lines:['🌊 Reached wave ' + d.wave] }), 700); } } }
    const m = 80; d.rocks = d.rocks.filter(r => !r.dead && r.x > -m * 2 && r.x < k.W + m * 2 && r.y > -m * 2 && r.y < k.H + m * 2);
    d.shots = d.shots.filter(s => s.life > 0); d.parts = d.parts.filter(p => p.life > 0); d.drops = d.drops.filter(p => p.life > 0);
  },
  draw(ctx, k){
    const d = k.data, W = k.W, H = k.H, cx = W / 2, cy = H / 2;
    ctx.fillStyle = '#05050f'; ctx.fillRect(0, 0, W, H);
    for (let i=0;i<60;i++){ const x = (i * 97.3) % W, y = (i * 61.7 + (k.t || 0) * (i % 3 + 1) * 4) % H; ctx.fillStyle = i % 5 ? '#445' : '#aac'; ctx.fillRect(x, y, 2, 2); }
    if (!d || !d.rocks) return;
    d.rocks.forEach(r => { ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rot); ctx.beginPath(); r.pts.forEach((p, i) => { const a = i / r.pts.length * Math.PI * 2; i ? ctx.lineTo(Math.cos(a) * p, Math.sin(a) * p) : ctx.moveTo(Math.cos(a) * p, Math.sin(a) * p); }); ctx.closePath();
      ctx.fillStyle = r.gold ? '#b08a1a' : '#5a5048'; ctx.fill(); ctx.strokeStyle = r.gold ? '#ffd23a' : '#a09080'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); });
    d.drops.forEach(p => { ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.t === 'rapid' ? '⚡' : '🔱', p.x, p.y); });
    ctx.fillStyle = '#ffff88'; d.shots.forEach(s => { ctx.fillRect(s.x - 2, s.y - 2, 4, 4); });
    // turret
    if (d.hurt > 0 && Math.floor(d.hurt * 10) % 2) ctx.globalAlpha = .4;
    ctx.save(); ctx.translate(cx, cy);
    ctx.strokeStyle = d.shield > 0 ? 'rgba(85,255,255,' + (.25 + d.shield * .12) + ')' : '#f55'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.stroke();
    ctx.rotate(d.ang); ctx.fillStyle = d.rapid > 0 ? '#ffd23a' : d.spread > 0 ? '#ff55ff' : '#55ffff'; ctx.fillRect(0, -4, 24, 8); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(0, -4, 24, 8);
    ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1;
    if (d.aim){ ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(d.aim.x, d.aim.y, 10, 0, Math.PI * 2); ctx.stroke(); }
  },
  down(x, y, k){ k.data.aim = { x, y }; k.data.firing = true; },
  move(x, y, k, isDown){ k.data.aim = { x, y }; if (!isDown) k.data.firing = false; },
  up(x, y, k){ k.data.firing = false; },
  key(key, k){ k.data.keys[key] = true; },
  keyup(key, k){ k.data.keys[key] = false; }
});
})();
