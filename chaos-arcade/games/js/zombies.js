/* Zombie Siege */
(function(){
const TYPES = { walker:{ hp:1, sp:38, r:16, c:'#5a9a4a', pts:10 }, runner:{ hp:1, sp:80, r:13, c:'#9aca4a', pts:20 }, brute:{ hp:4, sp:24, r:24, c:'#3a6a2a', pts:50 }, boomer:{ hp:2, sp:34, r:19, c:'#aa6a2a', pts:30 } };
function spawn(k){
  const d = k.data, a = Math.random() * Math.PI * 2, R = Math.hypot(k.W, k.H) / 2 + 30;
  const roll = Math.random(), t = d.wave > 3 && roll < .12 ? 'brute' : d.wave > 1 && roll < .35 ? 'runner' : d.wave > 2 && roll < .45 ? 'boomer' : 'walker';
  const T = TYPES[t]; d.z.push({ t, x:k.W/2 + Math.cos(a) * R, y:k.H/2 + Math.sin(a) * R, hp:T.hp, wob:Math.random() * 6 });
}
Kit.def({
  aspect:.8, winAt:800,
  how:'Zombies shamble toward your barricade in the middle. Tap them to shoot. 🟢 walkers, 💨 runners are fast, 🟫 brutes take 4 shots, 🟠 boomers explode and take out nearby zombies (tap them when they are in a crowd!). Survive the waves. 5 lives.',
  init(k){ const d = k.data; d.z = []; d.shots = []; d.blood = []; d.lives = 5; d.wave = 1; d.left = 8; d.spawnT = 1; d.between = 0; d.kills = 0; k.lives(5); k.hud('wv', '🧟 wave 1'); },
  update(dt, k){
    const d = k.data, cx = k.W/2, cy = k.H/2;
    if (d.between > 0){ d.between -= dt; if (d.between <= 0){ d.wave++; d.left = 8 + d.wave * 4; k.hud('wv', '🧟 wave ' + d.wave); } }
    else if (d.left > 0){ d.spawnT -= dt; if (d.spawnT <= 0){ spawn(k); d.left--; d.spawnT = Math.max(.25, 1.1 - d.wave * .08) * k.rand(.6, 1.3); } }
    else if (!d.z.length){ k.add(100 * d.wave, cx, cy - 60, '#55ff55'); k.pop(cx, cy - 90, 'WAVE ' + d.wave + ' SURVIVED!', '#55ffff'); k.good(); d.between = 2; }
    d.z.forEach(z => {
      const T = TYPES[z.t], dx = cx - z.x, dy = cy - z.y, L = Math.hypot(dx, dy);
      z.wob += dt * 6; const sp = T.sp * (1 + d.wave * .04);
      z.x += dx / L * sp * dt + Math.cos(z.wob) * 10 * dt; z.y += dy / L * sp * dt + Math.sin(z.wob) * 10 * dt;
      if (L < 34){ z.dead = true; d.lives--; k.lives(Math.max(0, d.lives)); k.bad(); k.shake(10); k.flash('#ff0000', .2); k.combo = 0; }
    });
    d.z = d.z.filter(z => !z.dead);
    d.shots.forEach(s => s.t += dt); d.shots = d.shots.filter(s => s.t < .1);
    d.blood.forEach(b => b.t += dt); d.blood = d.blood.filter(b => b.t < 6);
    if (d.lives <= 0) k.over({ lines:['🧟 Survived to wave ' + d.wave + ' · ' + d.kills + ' zombies'] });
  },
  draw(ctx, k){
    const d = k.data, cx = k.W/2, cy = k.H/2;
    ctx.fillStyle = '#3a3a2a'; ctx.fillRect(0, 0, k.W, k.H);
    ctx.fillStyle = '#44442f'; for (let i=0;i<30;i++) ctx.fillRect((i * 97) % k.W, (i * 61) % k.H, 20, 12);
    if (!d.z) return;
    d.blood.forEach(b => { ctx.globalAlpha = Math.max(0, .6 - b.t / 10); ctx.fillStyle = '#5a1a1a'; ctx.fillRect(b.x - b.r, b.y - b.r * .6, b.r * 2, b.r * 1.2); }); ctx.globalAlpha = 1;
    ctx.fillStyle = '#8a6a3a'; ctx.fillRect(cx - 30, cy - 30, 60, 60); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(cx - 30, cy - 8, 60, 6); ctx.fillRect(cx - 30, cy + 10, 60, 6);
    ctx.fillStyle = '#ffd23a'; ctx.fillRect(cx - 9, cy - 12, 18, 18); ctx.fillStyle = '#e0b08a'; ctx.fillRect(cx - 6, cy - 22, 12, 10);
    d.shots.forEach(s => { ctx.strokeStyle = '#ffff88'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(s.x, s.y); ctx.stroke(); });
    d.z.forEach(z => {
      const T = TYPES[z.t]; ctx.fillStyle = T.c; ctx.fillRect(z.x - T.r, z.y - T.r, T.r * 2, T.r * 2);
      ctx.fillStyle = '#ff2020'; ctx.fillRect(z.x - T.r * .5, z.y - T.r * .4, 4, 4); ctx.fillRect(z.x + T.r * .3, z.y - T.r * .4, 4, 4);
      ctx.fillStyle = '#222'; ctx.fillRect(z.x - T.r * .4, z.y + T.r * .2, T.r * .8, 3);
      if (z.t === 'boomer'){ ctx.fillStyle = Math.floor(k.t * 6) % 2 ? '#ffaa00' : '#ff5500'; ctx.fillRect(z.x - 4, z.y - T.r - 6, 8, 6); }
      if (T.hp > 1){ ctx.fillStyle = '#000'; ctx.fillRect(z.x - T.r, z.y - T.r - 8, T.r * 2, 4); ctx.fillStyle = '#55ff55'; ctx.fillRect(z.x - T.r, z.y - T.r - 8, T.r * 2 * z.hp / T.hp, 4); }
    });
    if (d.between > 0){ ctx.fillStyle = '#fff'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center'; ctx.fillText('WAVE ' + (d.wave + 1) + ' INCOMING…', cx, cy + 70); ctx.textAlign = 'left'; }
  },
  down(x, y, k){
    const d = k.data; d.shots.push({ x, y, t:0 }); k.beep(180, .05, 'square', .07);
    let hit = null, bd = 999;
    d.z.forEach(z => { const r = TYPES[z.t].r + 10, dist = Math.hypot(z.x - x, z.y - y); if (dist < r && dist < bd){ bd = dist; hit = z; } });
    if (!hit){ k.miss(); return; }
    hit.hp--; k.burst(hit.x, hit.y, ['#5a1a1a','#8a2a2a','#9aca4a'], 6);
    if (hit.hp > 0){ k.beep(120, .04); return; }
    const kill = (z) => { if (z.dead) return; z.dead = true; d.kills++; d.blood.push({ x:z.x, y:z.y, r:TYPES[z.t].r, t:0 }); k.hit(TYPES[z.t].pts, z.x, z.y - 20); };
    kill(hit); k.shake(2, .05);
    if (hit.t === 'boomer'){ k.boom(); k.shake(10); k.burst(hit.x, hit.y, ['#ffaa00','#ff5500','#ffff55'], 30, 320); let chain = 0; d.z.forEach(z => { if (!z.dead && Math.hypot(z.x - hit.x, z.y - hit.y) < 90){ kill(z); chain++; } }); if (chain) k.pop(hit.x, hit.y - 40, chain + 'x CHAIN!', '#ff55ff'); }
    d.z = d.z.filter(z => !z.dead);
  }
});
})();
