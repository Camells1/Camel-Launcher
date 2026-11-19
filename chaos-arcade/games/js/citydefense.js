/* City Defense */
(function(){
function wave(k){
  const d = k.data; d.toSpawn = 8 + d.wave * 4; d.spawnT = 1; d.sp = 40 + d.wave * 9;
  k.hud('wave', '🌊 ' + d.wave);
}
function boom(k, x, y, r, chain){ k.data.blasts.push({ x, y, r:0, max:r, t:0, chain }); }
Kit.def({
  aspect:.75, winAt:2000,
  how:'Tap anywhere in the sky to launch an interceptor. Its blast destroys every missile it touches, and destroyed missiles explode too, so set up CHAIN REACTIONS. Protect your 6 cities. Lose them all and it is game over.',
  init(k){ const d = k.data; d.cities = []; for (let i=0;i<6;i++) d.cities.push({ x:(i + .5) * k.W / 6 + (i < 3 ? -12 : 12), alive:true }); d.miss = []; d.shots = []; d.blasts = []; d.wave = 1; wave(k); d.between = 0; },
  update(dt, k){
    const d = k.data, gy = k.H - 30;
    if (d.between > 0){ d.between -= dt; if (d.between <= 0){ d.wave++; wave(k); } }
    else if (d.toSpawn > 0){ d.spawnT -= dt; if (d.spawnT <= 0){ d.toSpawn--; d.spawnT = Math.max(.25, 1.3 - d.wave * .1) * k.rand(.5, 1.3); const tg = k.pick(d.cities.filter(c => c.alive).concat([{ x:k.rand(0, k.W) }])); const sx = k.rand(0, k.W); const split = d.wave > 2 && Math.random() < .2; d.miss.push({ sx, sy:0, x:sx, y:0, tx:tg.x, ty:gy, sp:d.sp * k.rand(.8, 1.3), split }); } }
    else if (!d.miss.length && !d.blasts.length && d.between <= 0){
      const alive = d.cities.filter(c => c.alive).length;
      k.add(alive * 100 * d.wave, k.W/2, k.H/2, '#55ff55'); k.pop(k.W/2, k.H/2 - 30, 'WAVE ' + d.wave + ' CLEARED!', '#55ffff'); k.good(); d.between = 2.2;
    }
    d.miss.forEach(m => {
      const dx = m.tx - m.sx, dy = m.ty - m.sy, L = Math.hypot(dx, dy);
      m.x += dx / L * m.sp * dt; m.y += dy / L * m.sp * dt;
      if (m.split && m.y > k.H * .35){ m.split = false; for (let i=0;i<2;i++){ const tx = k.rand(0, k.W); d.miss.push({ sx:m.x, sy:m.y, x:m.x, y:m.y, tx, ty:gy, sp:m.sp, split:false }); } }
      if (m.y >= gy){ m.dead = true; boom(k, m.x, gy, 30, false); k.shake(8, .3); k.boom(); d.cities.forEach(c => { if (c.alive && Math.abs(c.x - m.x) < 24){ c.alive = false; k.flash('#ff3a3a', .2); } }); }
    });
    d.shots.forEach(s => { const dx = s.tx - s.x, dy = s.ty - s.y, L = Math.hypot(dx, dy); if (L < 10){ s.dead = true; boom(k, s.tx, s.ty, 42, false); k.beep(160, .15, 'sawtooth', .06); } else { s.x += dx / L * 650 * dt; s.y += dy / L * 650 * dt; } });
    d.blasts.forEach(b => {
      b.t += dt; b.r = b.max * Math.sin(Math.min(1, b.t / .9) * Math.PI);
      d.miss.forEach(m => { if (!m.dead && Math.hypot(m.x - b.x, m.y - b.y) < b.r){ m.dead = true; const n = k.hit(25, m.x, m.y); k.burst(m.x, m.y, ['#ffaa00','#ff5555','#ffff55'], 10); boom(k, m.x, m.y, 34, true); k.beep(300 + k.combo * 40, .05); } });
    });
    d.miss = d.miss.filter(m => !m.dead); d.shots = d.shots.filter(s => !s.dead); d.blasts = d.blasts.filter(b => b.t < .9);
    if (!d.miss.length && !d.blasts.length) k.combo = 0;
    if (!d.cities.some(c => c.alive)) k.over({ lines:['🏙️ Survived until wave ' + d.wave] });
  },
  draw(ctx, k){
    const d = k.data, gy = k.H - 30;
    const g = ctx.createLinearGradient(0, 0, 0, k.H); g.addColorStop(0, '#05051a'); g.addColorStop(1, '#2a1040');
    ctx.fillStyle = g; ctx.fillRect(0, 0, k.W, k.H);
    for (let i=0;i<40;i++){ ctx.fillStyle = '#556'; ctx.fillRect((i * 83) % k.W, (i * 47) % (k.H * .6), 2, 2); }
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(0, gy, k.W, 30);
    if (!d.cities) return;
    d.cities.forEach(c => {
      if (c.alive){ ctx.fillStyle = '#55aaff'; ctx.fillRect(c.x - 18, gy - 14, 36, 14); ctx.fillRect(c.x - 10, gy - 26, 9, 12); ctx.fillRect(c.x + 3, gy - 20, 8, 6); ctx.fillStyle = '#ffff88'; for (let i=0;i<4;i++) ctx.fillRect(c.x - 14 + i * 8, gy - 10, 3, 3); }
      else { ctx.fillStyle = '#442'; ctx.fillRect(c.x - 16, gy - 5, 32, 5); }
    });
    ctx.fillStyle = '#aaa'; ctx.fillRect(k.W/2 - 10, gy - 16, 20, 16);
    d.miss.forEach(m => { ctx.strokeStyle = 'rgba(255,90,90,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(m.sx, m.sy); ctx.lineTo(m.x, m.y); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillRect(m.x - 2, m.y - 2, 4, 4); });
    d.shots.forEach(s => { ctx.strokeStyle = '#55ffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(k.W/2, gy - 16); ctx.lineTo(s.x, s.y); ctx.stroke(); ctx.fillStyle = '#55ffff'; ctx.fillRect(s.tx - 3, s.ty - 3, 6, 6); });
    d.blasts.forEach(b => { ctx.fillStyle = b.chain ? 'rgba(255,170,0,.75)' : 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(b.x, b.y, Math.max(0, b.r), 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,80,80,.5)'; ctx.beginPath(); ctx.arc(b.x, b.y, Math.max(0, b.r * .6), 0, Math.PI * 2); ctx.fill(); });
    if (d.between > 0){ ctx.fillStyle = '#fff'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center'; ctx.fillText('WAVE ' + (d.wave + 1) + ' INCOMING', k.W/2, k.H/2 + 30); ctx.textAlign = 'left'; }
  },
  down(x, y, k){ const d = k.data; if (y > k.H - 50) return; if (d.shots.length >= 4){ k.beep(120, .05); return; } d.shots.push({ x:k.W/2, y:k.H - 46, tx:x, ty:y }); k.beep(700, .05, 'square', .05); }
});
})();
