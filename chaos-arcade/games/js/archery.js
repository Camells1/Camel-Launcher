/* Archery */
(function(){
const ARROWS = 12;
function newEnd(k){
  const d = k.data, n = d.shot;
  d.dist = 30 + Math.floor(n / 3) * 15;           // meters: 30, 45, 60, 75
  d.wind = k.rand(-1, 1) * (0.4 + n * .08);       // m/s, + = right
  d.tr = Math.max(34, 92 - n * 5);                 // target radius px
  d.tx = k.W / 2; d.ty = k.H * .38;
  d.aim = { x:d.tx + k.rand(-40, 40), y:d.ty + k.rand(-30, 30) };
  d.draw = 0; d.holding = false; d.hold = 0; d.arrow = null;
}
function release(k){
  const d = k.data; if (!d.holding) return; d.holding = false;
  if (d.draw < .25){ d.draw = 0; return; }
  const p = Math.min(1, d.draw), sway = swayAt(k);
  const drop = (1 - p) * 140 + d.dist * .25;       // under-drawn arrows drop more
  const drift = d.wind * d.dist * .9;
  const ex = d.aim.x + sway.x + drift, ey = d.aim.y + sway.y + drop - d.dist * .25;
  d.arrow = { sx:k.W / 2, sy:k.H - 30, ex, ey, t:0 };
  d.draw = 0; k.beep(220, .12, 'triangle', .07); setTimeout(() => k.beep(900, .03), 60);
}
function swayAt(k){ const d = k.data, amp = 3 + Math.max(0, d.hold - 2.2) * 22; return { x:Math.sin(k.t * 2.1) * amp + Math.sin(k.t * 5.3) * amp * .3, y:Math.cos(k.t * 1.7) * amp * .8 }; }
function land(k){
  const d = k.data, a = d.arrow, dist = Math.hypot(a.ex - d.tx, a.ey - d.ty), ring = 10 - Math.floor(dist / (d.tr / 10));
  let pts = Math.max(0, ring), label;
  d.holes.push({ x:a.ex - d.tx, y:a.ey - d.ty, s:d.tr });
  if (pts >= 10 && dist < d.tr * .05){ pts = 15; label = '🎯 X! BULLSEYE'; k.flash('#ffd700', .2); k.coin(); k.burst(a.ex, a.ey, ['#ffd700','#ffffff'], 30); Arcade.bigText('🎯 BULLSEYE!', '#ffd700'); }
  else if (pts >= 10){ label = '10!'; k.good(); k.burst(a.ex, a.ey, ['#ffd700','#ff5555'], 18); }
  else if (pts > 0){ label = String(pts); k.beep(400 + pts * 40, .06); }
  else { label = 'MISS'; k.bad(); k.miss(); }
  if (pts > 0){ const mult = 1 + Math.floor(d.dist / 30) * .5; if (pts >= 9) k.hit(Math.round(pts * mult), a.ex, a.ey - 20); else { k.combo = 0; k.add(Math.round(pts * mult), a.ex, a.ey - 20); } }
  k.pop(k.W / 2, k.H * .72, label, pts >= 10 ? '#ffd700' : '#ffffff');
  d.shot++; d.total += pts; d.log.push(pts >= 15 ? 'X' : pts);
  k.hud('ar', '🏹 ' + Math.min(d.shot + 1, ARROWS) + '/' + ARROWS);
  d.arrow = null; d.phase = 'wait';
  setTimeout(() => { if (!k.running) return; if (d.shot >= ARROWS) return k.over({ lines:['🏹 ' + d.log.join(' · ')] }); if (d.shot % 3 === 0) d.holes = []; newEnd(k); d.phase = 'aim'; }, 900);
}
Kit.def({
  dom:false, aspect:.7, winAt:150, medals:[80, 150, 220],
  how:'Press and HOLD to draw the bow, drag to aim, release to shoot. A full draw flies straight, a weak draw drops low. Watch the wind flag and aim against it. Holding too long makes your arms shake! 12 arrows; every 3 the target moves further away, which is worth more points. Keyboard: arrows aim, hold Space.',
  init(k){ const d = k.data; d.shot = 0; d.total = 0; d.log = []; d.holes = []; d.phase = 'aim'; d.keys = {}; newEnd(k); k.hud('ar', '🏹 1/' + ARROWS); },
  update(dt, k){
    const d = k.data;
    if (d.holding){ d.draw = Math.min(1.15, d.draw + dt * 1.25); d.hold += dt; } else d.hold = 0;
    const kx = (d.keys.ArrowRight ? 1 : 0) - (d.keys.ArrowLeft ? 1 : 0), ky = (d.keys.ArrowDown ? 1 : 0) - (d.keys.ArrowUp ? 1 : 0);
    if (d.aim){ d.aim.x = Math.max(0, Math.min(k.W, d.aim.x + kx * 160 * dt)); d.aim.y = Math.max(0, Math.min(k.H * .8, d.aim.y + ky * 160 * dt)); }
    if (d.arrow){ d.arrow.t += dt / .45; if (d.arrow.t >= 1){ d.arrow.t = 1; land(k); } }
  },
  draw(ctx, k){
    const d = k.data;
    const g = ctx.createLinearGradient(0, 0, 0, k.H); g.addColorStop(0, '#7ac8ff'); g.addColorStop(.55, '#d8f0ff'); g.addColorStop(.55, '#5aa83a'); g.addColorStop(1, '#2f6a1e'); ctx.fillStyle = g; ctx.fillRect(0, 0, k.W, k.H);
    if (!d.aim) return;
    // wind flag
    const fx = 34, fy = 40; ctx.fillStyle = '#555'; ctx.fillRect(fx - 2, fy, 4, 60); const wl = d.wind * 30; ctx.fillStyle = '#ff3a3a'; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + wl + Math.sin(k.t * 8) * 3, fy + 9); ctx.lineTo(fx, fy + 18); ctx.fill();
    ctx.fillStyle = '#000'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left'; ctx.fillText('WIND ' + (d.wind > 0 ? '→ ' : '← ') + Math.abs(d.wind).toFixed(1), 10, fy + 76);
    ctx.textAlign = 'right'; ctx.fillText(d.dist + ' m', k.W - 10, 30);
    // target stand
    ctx.fillStyle = '#6a4a2a'; ctx.fillRect(d.tx - d.tr * .7, d.ty, 6, d.tr * 1.6); ctx.fillRect(d.tx + d.tr * .7 - 6, d.ty, 6, d.tr * 1.6);
    const cols = ['#fff','#fff','#222','#222','#3a8aff','#3a8aff','#ff3a3a','#ff3a3a','#ffd23a','#ffd23a'];
    for (let i=0;i<10;i++){ ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.arc(d.tx, d.ty, d.tr * (10 - i) / 10, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = i === 2 || i === 3 ? '#888' : '#000'; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(d.tx - 3, d.ty); ctx.lineTo(d.tx + 3, d.ty); ctx.moveTo(d.tx, d.ty - 3); ctx.lineTo(d.tx, d.ty + 3); ctx.stroke();
    d.holes.forEach(h => { const s = d.tr / h.s, x = d.tx + h.x * s, y = d.ty + h.y * s; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#7a4a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 6, y + 8); ctx.stroke(); });
    if (d.arrow){ const a = d.arrow, t = a.t, x = a.sx + (a.ex - a.sx) * t, y = a.sy + (a.ey - a.sy) * t - Math.sin(t * Math.PI) * 60, sc = 1 - t * .7;
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.fillStyle = '#7a4a1a'; ctx.fillRect(-2, 0, 4, 40); ctx.fillStyle = '#ff3a3a'; ctx.fillRect(-6, 32, 12, 8); ctx.fillStyle = '#aaa'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(-5, 2); ctx.lineTo(5, 2); ctx.fill(); ctx.restore(); }
    else if (d.phase === 'aim'){
      const s = swayAt(k), x = d.aim.x + s.x, y = d.aim.y + s.y, shaky = d.hold > 2.2;
      ctx.strokeStyle = shaky ? '#ff3a3a' : '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.moveTo(x - 20, y); ctx.lineTo(x + 20, y); ctx.moveTo(x, y - 20); ctx.lineTo(x, y + 20); ctx.stroke();
      // bow
      const bx = k.W / 2, by = k.H - 40, pull = Math.min(1, d.draw) * 34;
      ctx.strokeStyle = '#7a4a1a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(bx, by + 30, 70, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
      const lx = bx + Math.cos(Math.PI * 1.2) * 70, ly = by + 30 + Math.sin(Math.PI * 1.2) * 70, rx = bx + Math.cos(Math.PI * 1.8) * 70;
      ctx.strokeStyle = '#eee'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(bx, ly + pull); ctx.lineTo(rx, ly); ctx.stroke();
      if (d.holding){ ctx.fillStyle = '#7a4a1a'; ctx.fillRect(bx - 2, ly - 50 + pull, 4, 50); }
      const mw = 120; ctx.fillStyle = '#000'; ctx.fillRect(bx - mw/2 - 2, k.H - 14, mw + 4, 10); ctx.fillStyle = d.draw >= .95 ? '#55ff55' : '#ffaa00'; ctx.fillRect(bx - mw/2, k.H - 12, mw * Math.min(1, d.draw), 6);
      if (!d.holding){ ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 13px monospace'; ctx.fillText('HOLD to draw · drag to aim', k.W / 2, k.H * .66); }
    }
    ctx.textAlign = 'left';
  },
  down(x, y, k){ const d = k.data; if (d.phase !== 'aim' || d.arrow) return; d.holding = true; d.grab = { x, y, ax:d.aim.x, ay:d.aim.y }; k.beep(160, .2, 'triangle', .03); },
  move(x, y, k, isDown){ const d = k.data; if (!isDown || !d.grab || !d.holding) return; d.aim.x = Math.max(0, Math.min(k.W, d.grab.ax + (x - d.grab.x) * .8)); d.aim.y = Math.max(0, Math.min(k.H * .8, d.grab.ay + (y - d.grab.y) * .8)); },
  up(x, y, k){ release(k); k.data.grab = null; },
  key(key, k){ const d = k.data; if (key === ' '){ if (!d.holding && d.phase === 'aim' && !d.arrow){ d.holding = true; } } else d.keys[key] = true; },
  keyup(key, k){ const d = k.data; if (key === ' ') release(k); else d.keys[key] = false; }
});
})();
