/* Blade Toss: throw blades into a spinning log without hitting the ones already stuck */
(function(){
const GAP = 0.2;            // min angle (rad) between two blades
function angDist(a, b){ let d = Math.abs(((a - b) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI); return d; }
function stage(k){
  const d = k.data; d.stage++; d.rot = 0; d.stuck = []; d.apples = []; d.need = Math.min(11, 5 + d.stage); d.thrown = 0; d.fly = null; d.clear = 0;
  d.boss = d.stage % 5 === 0;
  const pre = Math.min(d.stage - 1, 4) + (d.boss ? 1 : 0);
  for (let i=0; i<pre; i++){ let a, t = 0; do { a = Math.random() * Math.PI * 2; } while (d.stuck.some(s => angDist(s, a) < GAP * 1.6) && ++t < 50); d.stuck.push(a); }
  const ap = d.stage > 1 && Math.random() < .7 ? 1 + (Math.random() < .3 ? 1 : 0) : 0;
  for (let i=0; i<ap; i++){ let a, t = 0; do { a = Math.random() * Math.PI * 2; } while (d.stuck.concat(d.apples).some(s => angDist(s, a) < GAP * 1.5) && ++t < 50); d.apples.push(a); }
  k.hud('st', (d.boss ? '👹 BOSS ' : '🪵 Stage ') + d.stage);
  if (d.stage > 1) Arcade.bigText(d.boss ? '👹 BOSS LOG!' : 'STAGE ' + d.stage, d.boss ? '#ff5555' : '#ffd23a');
}
function speed(k){ // rad/s, gets trickier each stage; later stages wobble and reverse
  const d = k.data, s = d.stage, base = 1.6 + Math.min(2.2, s * .18);
  if (s < 3) return base;
  if (d.boss) return base * (Math.sin(k.t * 1.3) * 1.4 + .3);
  return s % 2 ? base * (1 + .6 * Math.sin(k.t * 2.1)) : -base * (.9 + .5 * Math.sin(k.t * 1.4));
}
function throwBlade(k){ const d = k.data; if (d.fly || d.dead || d.clear > 0 || d.thrown >= d.need) return; d.fly = { y:k.H - 70 }; d.thrown++; k.beep(520, .04, 'square', .04); }
Kit.def({
  dom:false, aspect:.62, winAt:600, medals:[300, 600, 1200],
  how:'Tap (or press Space) to throw a blade into the spinning log. Every blade you throw stays stuck. If a new blade hits one that is already there, the run is over. Use all the blades to split the log and move on. 🍎 apples give a bonus. Every 5th log is a 👹 boss that changes speed and direction.',
  init(k){ const d = k.data; d.stage = 0; d.total = 0; d.dead = false; d.parts = []; stage(k); },
  update(dt, k){
    const d = k.data;
    if (d.clear > 0){ d.clear -= dt; d.parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; p.r += p.vr * dt; }); if (d.clear <= 0){ d.parts = []; stage(k); } return; }
    if (d.dead){ d.bounce.y += d.bounce.vy * dt; d.bounce.vy += 1400 * dt; d.bounce.r += 12 * dt; return; }
    d.rot += speed(k) * dt;
    if (d.fly){
      d.fly.y -= 1700 * dt;
      const cy = k.H * .32, R = Math.min(k.W, k.H) * .2;
      if (d.fly.y <= cy + R){
        const rel = Math.PI / 2 - d.rot;   // where the blade hits, in log coordinates
        if (d.stuck.some(s => angDist(s, rel) < GAP)){
          d.dead = true; d.bounce = { x:k.W / 2, y:cy + R, vy:-300, r:0 }; d.fly = null; k.boom(); k.shake(10, .3); k.flash('#ff3333', .25);
          setTimeout(() => k.over({ lines:['🪵 Stage ' + d.stage + ' · ' + d.total + ' blades stuck'] }), 900); return;
        }
        d.stuck.push(rel); d.fly = null; d.total = (d.total || 0) + 1; k.hit(10, k.W / 2, cy + R + 20); k.beep(180, .06, 'triangle', .1); k.shake(3, .06);
        const ai = d.apples.findIndex(a => angDist(a, rel) < GAP * 1.1);
        if (ai >= 0){ d.apples.splice(ai, 1); k.add(50, k.W / 2, cy + R - 30, '#ff5555'); k.coin(); k.burst(k.W / 2, cy + R, ['#ff3333','#55ff55','#ffffff'], 14); }
        if (d.thrown >= d.need){
          const bonus = 50 + d.stage * 25 + (d.boss ? 200 : 0); k.add(bonus, k.W / 2, cy, '#55ff55'); k.good(); k.flash('#ffffff', .15);
          d.clear = 1.1; d.parts = [];
          for (let i=0;i<4;i++){ const a = i * Math.PI / 2 + .4; d.parts.push({ x:k.W / 2, y:cy, vx:Math.cos(a) * 260, vy:Math.sin(a) * 260 - 250, r:0, vr:(Math.random() - .5) * 10, a }); }
          k.burst(k.W / 2, cy, ['#a0622a','#d89a5a','#ffffff'], 30);
        }
      }
    }
  },
  draw(ctx, k){
    const d = k.data, W = k.W, H = k.H, cx = W / 2, cy = H * .32, R = Math.min(W, H) * .2;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, d && d.boss ? '#3a0a14' : '#1a1430'); g.addColorStop(1, '#0a0818'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (!d || !d.stuck) return;
    const blade = (len) => { ctx.fillStyle = '#d8dce8'; ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.lineTo(4, -len * .55); ctx.lineTo(0, -len * .62); ctx.lineTo(-4, -len * .55); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#7a3a1a'; ctx.fillRect(-6, 0, 12, len * .38); ctx.strokeRect(-6, 0, 12, len * .38); ctx.fillStyle = '#333'; ctx.fillRect(-9, -2, 18, 5); };
    const L = R * .9;
    if (d.clear > 0){
      d.parts.forEach(p => { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = '#a0622a'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, p.a - .8, p.a + .8); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); });
    } else {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(d.rot);
      d.stuck.forEach(a => { ctx.save(); ctx.rotate(a - Math.PI / 2); ctx.translate(0, R - 6); ctx.rotate(Math.PI); blade(L); ctx.restore(); });
      d.apples.forEach(a => { ctx.save(); ctx.rotate(a); ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🍎', R + 14, 0); ctx.restore(); });
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, R + 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = d.boss ? '#7a2a2a' : '#a0622a'; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = d.boss ? '#4a1414' : '#6a3a14'; ctx.lineWidth = 3; [.75, .5, .25].forEach(f => { ctx.beginPath(); ctx.arc(0, 0, R * f, 0, Math.PI * 2); ctx.stroke(); });
      ctx.fillStyle = d.boss ? '#ff5555' : '#d89a5a'; ctx.beginPath(); ctx.arc(0, 0, R * .1, 0, Math.PI * 2); ctx.fill();
      if (d.boss){ ctx.font = (R * .5) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('👹', 0, 0); }
      ctx.restore();
    }
    if (d.fly){ ctx.save(); ctx.translate(cx, d.fly.y + L * .62); blade(L); ctx.restore(); }
    if (d.dead && d.bounce){ ctx.save(); ctx.translate(d.bounce.x + 20, d.bounce.y + L * .4); ctx.rotate(d.bounce.r); blade(L); ctx.restore(); }
    if (!d.fly && !d.dead && d.clear <= 0 && d.thrown < d.need){ ctx.save(); ctx.translate(cx, H - 70 + L * .62); blade(L); ctx.restore(); }
    // blades left
    const left = d.need - d.thrown; ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'left'; ctx.fillText('BLADES', 10, H - 40 - d.need * 14 - 6);
    for (let i=0;i<d.need;i++){ ctx.fillStyle = i < left ? '#d8dce8' : '#333'; ctx.fillRect(14, H - 40 - i * 14, 18, 8); ctx.strokeStyle = '#000'; ctx.strokeRect(14, H - 40 - i * 14, 18, 8); }
  },
  down(x, y, k){ throwBlade(k); },
  key(key, k){ if (key === ' ' || key === 'ArrowUp' || key === 'Enter') throwBlade(k); }
});
})();
