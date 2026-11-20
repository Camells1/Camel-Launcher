/* Duck Shoot */
(function(){
const AMMO = 6;
function spawn(k){
  const d = k.data, lane = k.ri(0, 2), dir = Math.random() < .5 ? 1 : -1, r = Math.random();
  const t = r < .1 ? 'gold' : r < .25 ? 'dog' : r < .4 ? 'fast' : 'duck';
  d.t.push({ x:dir > 0 ? -40 : k.W + 40, y:k.H * (.22 + lane * .2), dir, sp:(t === 'fast' ? 220 : t === 'gold' ? 260 : 120) * (1 + k.t / 60), t, bob:Math.random() * 6, hit:0 });
}
Kit.def({
  dom:false, aspect:.8, winAt:600,
  how:'Tap the ducks to shoot them. 🦆 = 10, fast ducks = 25, ✨ golden ducks = 100. Do NOT shoot the 🐶 dogs (−50). You have 6 shots: tap the RELOAD bar at the bottom (or press R) to reload. 45 seconds. Consecutive hits build a combo.',
  init(k){ const d = k.data; d.t = []; d.next = .4; d.ammo = AMMO; d.flash = null; d.reload = 0; d.hits = 0; d.shots = 0; k.timer(45); k.hud('am', '🔫 ' + '▮'.repeat(AMMO)); },
  update(dt, k){
    const d = k.data; d.next -= dt; if (d.next <= 0){ spawn(k); d.next = Math.max(.35, .9 - k.t * .01) * k.rand(.6, 1.3); }
    d.t.forEach(o => { if (o.hit){ o.y += 400 * dt; o.hit += dt; } else { o.x += o.dir * o.sp * dt; o.bob += dt * 8; } });
    d.t = d.t.filter(o => o.x > -60 && o.x < k.W + 60 && o.y < k.H + 40);
    if (d.reload > 0){ d.reload -= dt; if (d.reload <= 0){ d.ammo = AMMO; k.beep(900, .06); } }
    k.hud('am', d.reload > 0 ? '🔫 RELOADING…' : '🔫 ' + '▮'.repeat(d.ammo) + '▯'.repeat(AMMO - d.ammo));
    if (d.flash) { d.flash.t -= dt; if (d.flash.t <= 0) d.flash = null; }
  },
  draw(ctx, k){
    const d = k.data;
    const g = ctx.createLinearGradient(0, 0, 0, k.H); g.addColorStop(0, '#5ab0ff'); g.addColorStop(1, '#c8e8ff'); ctx.fillStyle = g; ctx.fillRect(0, 0, k.W, k.H);
    ctx.fillStyle = '#fff'; for (let i=0;i<4;i++){ const x = ((i * 150 + (k.t || 0) * 10) % (k.W + 120)) - 60; ctx.fillRect(x, 30 + i * 22, 70, 14); }
    ctx.fillStyle = '#3a8a2a'; for (let r=0;r<3;r++){ const y = k.H * (.3 + r * .2); ctx.fillRect(0, y, k.W, 10); ctx.fillStyle = r % 2 ? '#3a8a2a' : '#2f7a22'; }
    ctx.fillStyle = '#7a4a2a'; ctx.fillRect(0, k.H - 50, k.W, 50); ctx.fillStyle = '#a06a3a'; ctx.fillRect(0, k.H - 50, k.W, 6);
    if (!d.t) return;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    d.t.forEach(o => { ctx.save(); ctx.translate(o.x, o.y + Math.sin(o.bob) * 4); if (o.dir < 0) ctx.scale(-1, 1); if (o.hit) ctx.rotate(Math.PI); ctx.font = (o.t === 'gold' ? 34 : 32) + 'px sans-serif'; if (o.t === 'gold'){ ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 16; } ctx.fillText(o.t === 'dog' ? '🐶' : '🦆', 0, 0); ctx.shadowBlur = 0; if (o.t === 'fast'){ ctx.fillStyle = '#ff5555'; ctx.fillRect(-20, -18, 6, 6); } ctx.restore(); });
    ctx.fillStyle = d.reload > 0 ? '#555' : d.ammo === 0 ? '#ff3a3a' : '#2a2a2a'; ctx.fillRect(0, k.H - 36, k.W, 36);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace'; ctx.fillText(d.reload > 0 ? 'RELOADING…' : d.ammo === 0 ? '⟳ TAP HERE TO RELOAD' : '⟳ RELOAD (R)', k.W/2, k.H - 18);
    if (d.flash){ ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(d.flash.x, d.flash.y, 18 * (1 - d.flash.t * 4), 0, Math.PI * 2); ctx.stroke(); }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  },
  down(x, y, k){
    const d = k.data;
    if (y > k.H - 40 || d.ammo === 0){ if (d.reload <= 0 && d.ammo < AMMO){ d.reload = .8; k.beep(300, .1, 'square', .05); } return; }
    if (d.reload > 0) return;
    d.ammo--; d.shots++; d.flash = { x, y, t:.2 }; k.beep(150, .08, 'sawtooth', .08); k.shake(3, .06);
    const hit = d.t.find(o => !o.hit && Math.hypot(o.x - x, o.y - y) < 26);
    if (!hit){ k.miss(); return; }
    hit.hit = .01; d.hits++;
    if (hit.t === 'dog'){ k.add(-50, x, y, '#ff5555'); k.bad(); k.combo = 0; return; }
    k.hit({ duck:10, fast:25, gold:100 }[hit.t], x, y - 20); k.burst(x, y, hit.t === 'gold' ? ['#ffd700','#ffffff'] : ['#ffffff','#c8a060'], 12);
    if (hit.t === 'gold'){ k.coin(); k.flash('#ffd700', .1); }
  },
  key(key, k){ if ((key === 'r' || key === 'R') && k.data.reload <= 0 && k.data.ammo < AMMO){ k.data.reload = .8; } },
  timeUp(k){ const d = k.data; k.over({ lines:['🦆 ' + d.hits + ' hits from ' + d.shots + ' shots'] }); }
});
})();
