/* Meteor Miner */
(function(){
function spawn(k){
  const d = k.data, size = k.pick([1, 1, 2, 2, 3]), r = 12 + size * 8;
  const special = Math.random() < .08 ? 'gold' : Math.random() < .06 ? 'ice' : null;
  d.m.push({ x:k.rand(r, k.W - r), y:-r, vx:k.rand(-40, 40), vy:k.rand(50, 90) * (1 + k.t / 70), r, hp:size, max:size, rot:0, vr:k.rand(-2, 2), special });
}
Kit.def({
  aspect:.7, winAt:800,
  how:'Meteors are falling toward your planet. Tap a meteor to drill it: big ones need several taps. Shattered meteors drop ore points. 🟡 gold meteors pay 5x, 🔵 ice meteors freeze all meteors for 3 seconds. Your planet has 5 shields.',
  init(k){ const d = k.data; d.m = []; d.next = .5; d.lives = 5; d.freeze = 0; d.mined = 0; d.cracks = []; k.lives(5); },
  update(dt, k){
    const d = k.data, gy = k.H - 50;
    d.freeze -= dt; const sl = d.freeze > 0 ? .15 : 1;
    d.next -= dt; if (d.next <= 0){ spawn(k); d.next = Math.max(.35, 1.2 - k.t * .015) * k.rand(.6, 1.3); }
    d.m.forEach(m => { m.x += m.vx * dt * sl; m.y += m.vy * dt * sl; m.rot += m.vr * dt * sl; if (m.x < m.r || m.x > k.W - m.r) m.vx = -m.vx;
      if (m.y + m.r > gy){ m.dead = true; d.lives--; k.lives(Math.max(0, d.lives)); k.boom(); k.shake(12); k.flash('#ff6a00', .2); k.combo = 0; k.burst(m.x, gy, ['#ff6a00','#ffaa00','#8a6a4a'], 24, 300); d.cracks.push(m.x); } });
    d.m = d.m.filter(m => !m.dead);
    if (d.lives <= 0) k.over({ lines:['⛏️ Mined ' + d.mined + ' meteors'] });
  },
  draw(ctx, k){
    const d = k.data, gy = k.H - 50;
    ctx.fillStyle = '#05030f'; ctx.fillRect(0, 0, k.W, k.H);
    for (let i=0;i<50;i++){ ctx.fillStyle = i % 5 ? '#334' : '#99a'; ctx.fillRect((i * 79) % k.W, (i * 53) % (gy - 10), 2, 2); }
    ctx.fillStyle = '#3a6ad0'; ctx.beginPath(); ctx.ellipse(k.W/2, gy + k.W * 1.2, k.W * 1.3, k.W * 1.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3ab04a'; for (let i=0;i<6;i++) ctx.fillRect((i * 97) % k.W, gy + 6 + (i % 3) * 8, 40, 8);
    if (!d.m) return;
    ctx.fillStyle = '#222'; d.cracks.forEach(x => { ctx.fillRect(x - 10, gy + 2, 20, 4); ctx.fillRect(x - 4, gy + 6, 8, 6); });
    if (d.lives > 0){ ctx.strokeStyle = 'rgba(85,255,255,' + (.15 + d.lives * .06) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(k.W/2, gy + k.W * 1.2, k.W * 1.3 + 8, k.W * 1.25 + 8, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    d.m.forEach(m => {
      ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.rot);
      ctx.fillStyle = 'rgba(255,120,0,.3)'; ctx.beginPath(); ctx.arc(0, -m.r * .6, m.r * .9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = m.special === 'gold' ? '#d8a820' : m.special === 'ice' ? '#7ad0ff' : '#7a6a5a'; ctx.fillRect(-m.r, -m.r, m.r * 2, m.r * 2);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-m.r * .5, -m.r * .4, m.r * .4, m.r * .4); ctx.fillRect(m.r * .1, m.r * .2, m.r * .5, m.r * .4);
      if (m.hp < m.max){ ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-m.r, 0); ctx.lineTo(0, m.r * .3); ctx.lineTo(m.r * .6, -m.r); ctx.stroke(); }
      ctx.restore();
    });
    if (d.freeze > 0){ ctx.fillStyle = 'rgba(120,200,255,.12)'; ctx.fillRect(0, 0, k.W, k.H); }
  },
  down(x, y, k){
    const d = k.data, m = d.m.find(o => Math.hypot(o.x - x, o.y - y) < o.r + 10);
    if (!m){ k.miss(); k.beep(120, .03); return; }
    m.hp--; k.beep(220 + m.hp * 80, .05, 'square', .07); k.burst(x, y, ['#c8b090','#ffaa00'], 6); k.shake(2, .05);
    if (m.hp > 0) return;
    m.dead = true; d.mined++; d.m = d.m.filter(o => !o.dead);
    const pts = m.max * 10 * (m.special === 'gold' ? 5 : 1);
    k.hit(pts, m.x, m.y - 20); k.burst(m.x, m.y, m.special === 'gold' ? ['#ffd700','#fff39a'] : ['#c8b090','#8a7a6a','#55ffff'], 16 + m.max * 4, 280);
    if (m.special === 'ice'){ d.freeze = 3; k.pop(k.W/2, k.H/3, '❄️ FREEZE!', '#7ad0ff'); k.good(); }
    if (m.special === 'gold') k.coin();
  }
});
})();
