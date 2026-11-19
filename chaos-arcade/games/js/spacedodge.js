/* Rock Blaster */
(function(){
function rock(k, size, x, y){
  const r = [0, 12, 20, 32][size], pts = [];
  for (let i=0;i<9;i++) pts.push(.75 + Math.random() * .35);
  return { x:x != null ? x : k.rand(r, k.W - r), y:y != null ? y : -r, vx:k.rand(-50, 50), vy:k.rand(60, 110) + k.data.lvl * 8, r, size, rot:0, vr:k.rand(-2, 2), pts, hp:size };
}
Kit.def({
  aspect:.7, winAt:1500,
  how:'Drag (or move the mouse / arrow keys) to steer your ship. It fires on its own. Big rocks split into smaller ones. Grab ⭐ for triple shot. You have 3 shields.',
  init(k){ const d = k.data; d.x = k.W/2; d.y = k.H - 60; d.tx = d.x; d.ty = d.y; d.shots = []; d.rocks = []; d.cool = 0; d.spawn = 0; d.lives = 3; d.inv = 0; d.triple = 0; d.stars = []; d.lvl = 1; k.lives(3); },
  update(dt, k){
    const d = k.data;
    if (k.k){ if (k.k.L) d.tx -= 360*dt; if (k.k.R) d.tx += 360*dt; if (k.k.U) d.ty -= 360*dt; if (k.k.D) d.ty += 360*dt; }
    d.tx = k.clamp(d.tx, 16, k.W - 16); d.ty = k.clamp(d.ty, k.H * .35, k.H - 20);
    d.x = k.lerp(d.x, d.tx, Math.min(1, dt * 12)); d.y = k.lerp(d.y, d.ty, Math.min(1, dt * 12));
    d.inv -= dt; d.triple -= dt; d.lvl = 1 + Math.floor(k.t / 20);
    d.cool -= dt;
    if (d.cool <= 0){ d.cool = .18; d.shots.push({ x:d.x, y:d.y - 16, vx:0 }); if (d.triple > 0){ d.shots.push({ x:d.x, y:d.y - 16, vx:-120 }, { x:d.x, y:d.y - 16, vx:120 }); } k.beep(1100, .02, 'square', .02); }
    d.shots.forEach(s => { s.y -= 520 * dt; s.x += s.vx * dt; }); d.shots = d.shots.filter(s => s.y > -10);
    d.spawn -= dt; if (d.spawn <= 0){ d.rocks.push(rock(k, k.pick([1,2,2,3,3]))); d.spawn = Math.max(.35, 1.2 - k.t * .012); }
    d.rocks.forEach(r => { r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.vr * dt; if (r.x < r.r || r.x > k.W - r.r) r.vx = -r.vx; });
    const born = [];
    d.rocks.forEach(r => {
      for (const s of d.shots){
        if (s.y > -5 && Math.hypot(s.x - r.x, s.y - r.y) < r.r){
          s.y = -99; r.hp--;
          if (r.hp <= 0){
            r.dead = true; k.hit(r.size * 15, r.x, r.y); k.burst(r.x, r.y, ['#c8b090','#8a7a6a','#ffffff'], 8 + r.size * 5); k.beep(140 + r.size * 40, .08, 'sawtooth', .05); k.shake(r.size * 1.5, .1);
            if (r.size > 1) for (let i=0;i<2;i++) born.push(rock(k, r.size - 1, r.x, r.y));
            if (Math.random() < .06) d.stars.push({ x:r.x, y:r.y });
          }
          break;
        }
      }
      if (!r.dead && d.inv <= 0 && Math.hypot(r.x - d.x, r.y - d.y) < r.r + 10){
        r.dead = true; d.lives--; d.inv = 2; k.lives(Math.max(0, d.lives)); k.boom(); k.shake(12, .35); k.flash('#ff3a3a', .2); k.combo = 0;
        k.burst(d.x, d.y, ['#55ffff','#ffffff','#ff5555'], 26, 300);
        if (d.lives <= 0) return k.over({ lines:['☄️ Survived ' + Math.floor(k.t) + ' seconds'] });
      }
    });
    d.rocks = d.rocks.filter(r => !r.dead && r.y < k.H + 40).concat(born);
    d.stars.forEach(s => { s.y += 90 * dt; if (Math.hypot(s.x - d.x, s.y - d.y) < 22){ s.got = true; d.triple = 8; k.coin(); k.pop(s.x, s.y, 'TRIPLE SHOT!', '#ffff55'); } });
    d.stars = d.stars.filter(s => !s.got && s.y < k.H);
  },
  draw(ctx, k){
    const d = k.data;
    ctx.fillStyle = '#04020c'; ctx.fillRect(0, 0, k.W, k.H);
    for (let i=0;i<60;i++){ const sp = 1 + i % 3; ctx.fillStyle = ['#333','#666','#aaa'][i % 3]; ctx.fillRect((i * 89) % k.W, ((i * 157) + k.t * 40 * sp) % k.H, sp, sp * 2); }
    if (!d.rocks) return;
    d.rocks.forEach(r => {
      ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rot);
      ctx.beginPath(); r.pts.forEach((p, i) => { const a = i / r.pts.length * Math.PI * 2; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r.r * p, Math.sin(a) * r.r * p); }); ctx.closePath();
      ctx.fillStyle = ['', '#9a8a7a', '#8a7a6a', '#7a6a5a'][r.size]; ctx.fill(); ctx.strokeStyle = '#c8b090'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    });
    d.stars.forEach(s => { ctx.fillStyle = '#ffff55'; ctx.font = '18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⭐', s.x, s.y + 6); ctx.textAlign = 'left'; });
    ctx.fillStyle = d.triple > 0 ? '#ffff55' : '#ffffff'; d.shots.forEach(s => ctx.fillRect(s.x - 1.5, s.y, 3, 10));
    if (d.inv <= 0 || Math.floor(k.t * 12) % 2){
      ctx.save(); ctx.translate(d.x, d.y);
      ctx.fillStyle = '#ff7a1a'; ctx.fillRect(-4, 10, 8, 6 + Math.random() * 8);
      ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(13, 12); ctx.lineTo(-13, 12); ctx.closePath(); ctx.fillStyle = '#55ffff'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(-3, -4, 6, 6); ctx.restore();
    }
  },
  down(x, y, k){ k.data.tx = x; k.data.ty = y - 40; },
  move(x, y, k, pressed){ k.data.tx = x; k.data.ty = y - (pressed ? 40 : 0); },
  key(key, k){ k.k = k.k || {}; if (/Left|^a$/.test(key)) k.k.L = 1; if (/Right|^d$/.test(key)) k.k.R = 1; if (/Up|^w$/.test(key)) k.k.U = 1; if (/Down|^s$/.test(key)) k.k.D = 1; },
  keyup(key, k){ k.k = k.k || {}; if (/Left|^a$/.test(key)) k.k.L = 0; if (/Right|^d$/.test(key)) k.k.R = 0; if (/Up|^w$/.test(key)) k.k.U = 0; if (/Down|^s$/.test(key)) k.k.D = 0; }
});
})();
