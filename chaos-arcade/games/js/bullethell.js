/* Bullet Hell */
(function(){
const PATTERNS = ['spiral','ring','aimed','flower','rain','cross'];
function emit(k){
  const d = k.data, cx = k.W/2, cy = k.H * .22, p = d.pat, lv = 1 + k.t / 25, sp = 110 + lv * 18;
  const b = (a, s, c) => d.b.push({ x:cx, y:cy, vx:Math.cos(a) * (s || sp), vy:Math.sin(a) * (s || sp), c:c || '#ff55ff', r:5, graze:false });
  if (p === 'spiral'){ for (let i=0;i<3;i++) b(d.ang + i * Math.PI * 2 / 3, sp, '#ff55ff'); d.ang += .28; d.emitT = .08; }
  else if (p === 'ring'){ const n = 16 + Math.floor(lv * 3); for (let i=0;i<n;i++) b(i * Math.PI * 2 / n + d.ang, sp * .9, '#55ffff'); d.ang += .2; d.emitT = .7; }
  else if (p === 'aimed'){ const a = Math.atan2(d.py - cy, d.px - cx); for (let i=-2;i<=2;i++) b(a + i * .12, sp * 1.3, '#ffaa00'); d.emitT = .45; }
  else if (p === 'flower'){ for (let i=0;i<6;i++) b(d.ang + i * Math.PI / 3, sp, '#55ff55'); for (let i=0;i<6;i++) b(-d.ang + i * Math.PI / 3, sp * .7, '#ffff55'); d.ang += .15; d.emitT = .16; }
  else if (p === 'rain'){ for (let i=0;i<2;i++) d.b.push({ x:k.rand(0, k.W), y:-6, vx:k.rand(-20, 20), vy:sp * k.rand(.8, 1.4), c:'#5577ff', r:4 }); d.emitT = .07; }
  else { for (let i=0;i<4;i++) b(d.ang + i * Math.PI / 2, sp * 1.1, '#ff5555'); d.ang += .07; d.emitT = .05; }
}
Kit.def({
  aspect:.7, winAt:600,
  how:'Drag anywhere to steer your tiny ship (it moves with your finger, offset above it so you can see). Only the glowing core is your hitbox. Brushing past bullets = GRAZE points. Patterns change every few seconds and get denser. 3 lives.',
  init(k){ const d = k.data; d.px = k.W/2; d.py = k.H * .8; d.b = []; d.ang = 0; d.emitT = .5; d.pat = 'spiral'; d.patT = 6; d.lives = 3; d.inv = 2; d.grazes = 0; k.lives(3); },
  update(dt, k){
    const d = k.data;
    if (k.k){ d.px += ((k.k.R ? 1 : 0) - (k.k.L ? 1 : 0)) * 260 * dt; d.py += ((k.k.D ? 1 : 0) - (k.k.U ? 1 : 0)) * 260 * dt; }
    d.px = k.clamp(d.px, 6, k.W - 6); d.py = k.clamp(d.py, 6, k.H - 6); d.inv -= dt;
    d.patT -= dt; if (d.patT <= 0){ d.pat = k.pick(PATTERNS.filter(p => p !== d.pat)); d.patT = 6; k.beep(300, .2, 'triangle', .06); k.pop(k.W/2, k.H * .4, d.pat.toUpperCase() + '!', '#ff55ff'); }
    d.emitT -= dt; if (d.emitT <= 0) emit(k);
    d.b.forEach(b => {
      b.x += b.vx * dt; b.y += b.vy * dt;
      const dist = Math.hypot(b.x - d.px, b.y - d.py);
      if (dist < b.r + 3 && d.inv <= 0){ b.dead = true; d.lives--; d.inv = 2; k.lives(Math.max(0, d.lives)); k.boom(); k.shake(12, .3); k.flash('#ff3a3a', .2); k.combo = 0; d.b.forEach(o => { if (Math.hypot(o.x - d.px, o.y - d.py) < 90) o.dead = true; }); if (d.lives <= 0) return k.over({ lines:['🌀 Survived ' + Math.floor(k.t) + 's · ' + d.grazes + ' grazes'] }); }
      else if (!b.graze && dist < b.r + 16 && d.inv <= 0){ b.graze = true; d.grazes++; k.hit(3); if (d.grazes % 25 === 0) k.pop(d.px, d.py - 30, d.grazes + ' GRAZES!', '#55ffff'); }
    });
    d.b = d.b.filter(b => !b.dead && b.x > -20 && b.x < k.W + 20 && b.y > -20 && b.y < k.H + 20);
    if (Math.floor(k.t) > (d.sec || 0)){ d.sec = Math.floor(k.t); k.add(10); }
  },
  draw(ctx, k){
    const d = k.data;
    ctx.fillStyle = '#07040f'; ctx.fillRect(0, 0, k.W, k.H);
    for (let i=0;i<40;i++){ ctx.fillStyle = '#333'; ctx.fillRect((i * 83) % k.W, ((i * 71) + (k.t || 0) * 30) % k.H, 2, 2); }
    if (!d.b) return;
    ctx.fillStyle = '#c03ac0'; ctx.beginPath(); ctx.arc(k.W/2, k.H * .22, 18 + Math.sin(k.t * 6) * 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(k.W/2 - 8, k.H * .22 - 4, 5, 5); ctx.fillRect(k.W/2 + 3, k.H * .22 - 4, 5, 5);
    d.b.forEach(b => { ctx.fillStyle = b.c; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * .45, 0, Math.PI * 2); ctx.fill(); });
    if (d.inv <= 0 || Math.floor(k.t * 12) % 2){
      ctx.fillStyle = '#55ffff'; ctx.beginPath(); ctx.moveTo(d.px, d.py - 12); ctx.lineTo(d.px + 9, d.py + 9); ctx.lineTo(d.px - 9, d.py + 9); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(d.px, d.py, 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
  },
  down(x, y, k){ const d = k.data; d.drag = { x, y, px:d.px, py:d.py }; },
  move(x, y, k, p){ const d = k.data; if (p && d.drag){ d.px = d.drag.px + (x - d.drag.x) * 1.2; d.py = d.drag.py + (y - d.drag.y) * 1.2; } },
  up(x, y, k){ k.data.drag = null; },
  key(key, k){ k.k = k.k || {}; if (/Left|^a$/.test(key)) k.k.L = 1; if (/Right|^d$/.test(key)) k.k.R = 1; if (/Up|^w$/.test(key)) k.k.U = 1; if (/Down|^s$/.test(key)) k.k.D = 1; },
  keyup(key, k){ k.k = k.k || {}; if (/Left|^a$/.test(key)) k.k.L = 0; if (/Right|^d$/.test(key)) k.k.R = 0; if (/Up|^w$/.test(key)) k.k.U = 0; if (/Down|^s$/.test(key)) k.k.D = 0; }
});
})();
