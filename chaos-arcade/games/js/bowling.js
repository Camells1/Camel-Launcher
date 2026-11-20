/* Bowling */
(function(){
const BR = 13, PR = 8;
function rack(k){
  const d = k.data, cx = k.W / 2, top = k.H * .12, gap = 24, out = [];
  for (let row=0; row<4; row++) for (let i=0; i<=row; i++) out.push({ x:cx + (i - row/2) * gap, y:top + (3 - row) * gap * .9, vx:0, vy:0, down:false, gone:false });
  return out;
}
function laneX(k){ const w = Math.min(k.W * .62, 240); return [k.W/2 - w/2, k.W/2 + w/2]; }
function score(rolls){
  let s = 0, i = 0, frames = [];
  for (let f=0; f<10 && i < rolls.length; f++){
    if (rolls[i] === 10){ if (rolls[i+2] == null) break; s += 10 + rolls[i+1] + rolls[i+2]; i++; }
    else { if (rolls[i+1] == null) break; if (rolls[i] + rolls[i+1] === 10){ if (rolls[i+2] == null) break; s += 10 + rolls[i+2]; } else s += rolls[i] + rolls[i+1]; i += 2; }
    frames.push(s);
  }
  return { s, frames };
}
function frameInfo(rolls){ // returns {frame, ball} of the NEXT roll, or null if game over
  let i = 0;
  for (let f=0; f<9; f++){ if (i >= rolls.length) return { f, b:0 }; if (rolls[i] === 10){ i++; continue; } if (i + 1 >= rolls.length) return { f, b:1 }; i += 2; }
  const t = rolls.slice(i);
  if (t.length < 2) return { f:9, b:t.length };
  if (t.length === 2 && (t[0] === 10 || t[0] + t[1] === 10)) return { f:9, b:2 };
  return null;
}
function newBall(k, fresh){
  const d = k.data; d.phase = 'pos'; d.ball = { x:k.W/2, y:k.H - 50, vx:0, vy:0, spin:0 }; d.osc = 0; d.ang = 0; d.rollT = 0;
  if (fresh) d.pins = rack(k);
  d.pins.forEach(p => { if (p.down) p.gone = true; p.vx = p.vy = 0; });
}
function tap(k){
  const d = k.data;
  if (d.phase === 'pos'){ d.phase = 'aim'; k.beep(600, .04); }
  else if (d.phase === 'aim'){ d.phase = 'spin'; k.beep(700, .04); }
  else if (d.phase === 'spin'){
    d.phase = 'roll'; const sp = 520; d.ball.vx = Math.sin(d.ang) * sp; d.ball.vy = -Math.cos(d.ang) * sp; d.ball.spin = d.spinV;
    k.beep(120, .3, 'triangle', .06); d.rolled = true;
  }
}
function finishRoll(k){
  const d = k.data, standing = d.pins.filter(p => !p.gone), fallen = standing.filter(p => p.down).length;
  d.rolls.push(fallen);
  const info = frameInfo(d.rolls), sc = score(d.rolls);
  k.set(sc.s);
  const prevBall = d.ballNo; d.ballNo = info ? info.b : 0;
  const allDown = standing.every(p => p.down);
  let msg = fallen + ' pins';
  if (allDown && prevBall === 0 || (allDown && d.frame === 9 && fallen === 10)) { msg = '💥 STRIKE!'; d.strikes++; k.flash('#ffd700', .25); k.coin(); Arcade.bigText('💥 STRIKE!', '#ffd700'); k.burst(k.W/2, k.H * .15, ['#ffd700','#ffffff','#ff5555'], 40); }
  else if (allDown){ msg = '✨ SPARE!'; d.spares++; k.good(); Arcade.bigText('✨ SPARE!', '#55ffff'); }
  else if (fallen === 0) { msg = d.gutter ? '😬 GUTTER BALL' : '😶 MISS'; k.bad(); }
  else k.beep(500 + fallen * 40, .08);
  k.pop(k.W/2, k.H * .45, msg, allDown ? '#ffd700' : '#ffffff');
  if (!info){ d.phase = 'done'; setTimeout(() => k.over({ lines:['🎳 ' + sc.s + ' pts · ' + d.strikes + ' strikes · ' + d.spares + ' spares'] }), 1200); return; }
  const freshRack = info.f !== d.frame || allDown;
  d.frame = info.f; d.phase = 'wait';
  k.hud('fr', '🎳 Frame ' + (d.frame + 1) + '/10 · ball ' + (d.ballNo + 1));
  setTimeout(() => { if (k.running) newBall(k, freshRack); }, 1000);
}
Kit.def({
  dom:false, aspect:.62, winAt:120, medals:[60, 120, 180],
  how:'Real 10-frame bowling with proper strike and spare scoring. Tap 3 times: 1) stop the sliding ball to pick your position, 2) stop the swinging arrow to aim, 3) stop the spin meter to add hook. Hit the pocket just beside the head pin for strikes. Space works too.',
  init(k){ const d = k.data; d.rolls = []; d.frame = 0; d.ballNo = 0; d.strikes = 0; d.spares = 0; d.spinV = 0; newBall(k, true); k.hud('fr', '🎳 Frame 1/10 · ball 1'); },
  update(dt, k){
    const d = k.data, b = d.ball, [L, R] = laneX(k);
    d.osc += dt;
    if (d.phase === 'pos') b.x = k.W/2 + Math.sin(d.osc * 2.4) * (R - L) / 2 * .7;
    if (d.phase === 'aim') d.ang = Math.sin(d.osc * 2.8) * .1;
    if (d.phase === 'spin') d.spinV = Math.sin(d.osc * 3.4) * 100;
    if (d.phase !== 'roll') return;
    d.rollT += dt;
    const steps = 4, h = dt / steps;
    for (let s=0; s<steps; s++){
      if (!d.gutter){ b.vx += b.spin * h * (b.y < k.H * .55 ? 1.6 : .4); }
      b.x += b.vx * h; b.y += b.vy * h;
      if (!d.gutter && (b.x < L + BR * .4 || b.x > R - BR * .4)){ d.gutter = true; b.x = b.x < L + BR ? L - 8 : R + 8; b.vx = 0; k.beep(90, .2, 'sawtooth', .05); }
      for (const p of d.pins){ if (p.gone) continue;
        if (!d.gutter){ const dx = p.x - b.x, dy = p.y - b.y, dist = Math.hypot(dx, dy);
          if (dist < BR + PR && dist > 0){ const nx = dx / dist, ny = dy / dist, rel = b.vx * nx + b.vy * ny;
            if (rel > 0){ p.vx += nx * rel * 1.25 + k.rand(-30, 30); p.vy += ny * rel * 1.25; b.vx -= nx * rel * .25; b.vy -= ny * rel * .25; if (!p.down){ p.down = true; k.beep(300 + Math.random() * 300, .04, 'square', .05); k.shake(2, .05); } } } }
        p.x += p.vx * h; p.y += p.vy * h; p.vx *= .995; p.vy *= .995;
        if (p.x < L || p.x > R || p.y < 0) { if (Math.hypot(p.vx, p.vy) > 20) p.down = true; }
      }
      for (let i=0;i<d.pins.length;i++) for (let j=i+1;j<d.pins.length;j++){
        const a = d.pins[i], c = d.pins[j]; if (a.gone || c.gone) continue;
        const dx = c.x - a.x, dy = c.y - a.y, dist = Math.hypot(dx, dy);
        if (dist < PR * 2 && dist > 0){ const nx = dx / dist, ny = dy / dist, rel = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny;
          if (rel > 0){ c.vx += nx * rel * .9; c.vy += ny * rel * .9; a.vx -= nx * rel * .45; a.vy -= ny * rel * .45; if (!c.down && rel > 25){ c.down = true; k.beep(400 + Math.random() * 300, .03, 'square', .04); } if (!a.down && rel > 25) a.down = true; }
          const o = (PR * 2 - dist) / 2; a.x -= nx * o; a.y -= ny * o; c.x += nx * o; c.y += ny * o; }
      }
    }
    const moving = d.pins.some(p => !p.gone && Math.hypot(p.vx, p.vy) > 8);
    if ((b.y < -30 && !moving) || d.rollT > 5){ d.phase = 'settle'; d.gutter = false; setTimeout(() => finishRoll(k), 450); }
  },
  draw(ctx, k){
    const d = k.data, [L, R] = laneX(k);
    ctx.fillStyle = '#1a1424'; ctx.fillRect(0, 0, k.W, k.H);
    ctx.fillStyle = '#333'; ctx.fillRect(L - 14, 0, 14, k.H); ctx.fillRect(R, 0, 14, k.H);
    const g = ctx.createLinearGradient(L, 0, R, 0); g.addColorStop(0, '#c8904a'); g.addColorStop(.5, '#e6b070'); g.addColorStop(1, '#c8904a'); ctx.fillStyle = g; ctx.fillRect(L, 0, R - L, k.H);
    ctx.strokeStyle = 'rgba(120,70,20,.25)'; ctx.lineWidth = 1; for (let x=L; x<R; x += (R - L) / 12){ ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, k.H); ctx.stroke(); }
    ctx.fillStyle = '#6a3a1a'; for (let i=1;i<=7;i++){ const x = L + (R - L) * i / 8, y = k.H * .62; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x - 5, y + 6); ctx.lineTo(x + 5, y + 6); ctx.fill(); }
    ctx.fillStyle = '#a33'; ctx.fillRect(L, k.H - 80, R - L, 3);
    if (!d.pins) return;
    d.pins.forEach(p => { if (p.gone) return; ctx.save(); ctx.translate(p.x, p.y); if (p.down) ctx.rotate(Math.atan2(p.vy, p.vx) + Math.PI/2); ctx.globalAlpha = p.down ? .7 : 1;
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, 0, PR + 2, p.down ? PR * 1.8 : PR + 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 0, PR, p.down ? PR * 1.6 : PR, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e33'; ctx.fillRect(-PR + 1, -2, PR * 2 - 2, 3); ctx.restore(); });
    const b = d.ball;
    if (d.phase === 'aim' || d.phase === 'spin'){ ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.setLineDash([8, 8]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + Math.sin(d.ang) * 260, b.y - Math.cos(d.ang) * 260); ctx.stroke(); ctx.setLineDash([]); }
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(b.x, b.y, BR + 2, 0, Math.PI * 2); ctx.fill();
    const bg = ctx.createRadialGradient(b.x - 4, b.y - 4, 2, b.x, b.y, BR); bg.addColorStop(0, '#9a7aff'); bg.addColorStop(1, '#3a1a8a'); ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(b.x, b.y, BR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; [[-3,-4],[3,-4],[0,2]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(b.x + x, b.y + y, 2, 0, Math.PI * 2); ctx.fill(); });
    ctx.textAlign = 'center'; ctx.font = 'bold 13px monospace'; ctx.fillStyle = '#fff';
    if (d.phase === 'pos') ctx.fillText('TAP: lock position', k.W/2, k.H - 16);
    if (d.phase === 'aim') ctx.fillText('TAP: lock aim', k.W/2, k.H - 16);
    if (d.phase === 'spin'){ const mw = 140, mx = k.W/2 - mw/2, my = k.H - 30; ctx.fillStyle = '#000'; ctx.fillRect(mx - 2, my - 2, mw + 4, 14); ctx.fillStyle = '#444'; ctx.fillRect(mx, my, mw, 10); ctx.fillStyle = '#ffaa00'; ctx.fillRect(mx + mw/2 + d.spinV / 100 * mw/2 - 3, my - 3, 6, 16); ctx.fillStyle = '#fff'; ctx.fillText('↶ HOOK  TAP  HOOK ↷', k.W/2, my - 8); }
    // scorecard
    const sc = score(d.rolls), cw = Math.min(34, (k.W - 8) / 10); ctx.font = 'bold 10px monospace';
    for (let f=0; f<10; f++){ const x = 4 + f * cw; ctx.fillStyle = f === d.frame && d.phase !== 'done' ? '#ffd23a' : '#000'; ctx.fillRect(x, 4, cw - 2, 30); ctx.fillStyle = f === d.frame && d.phase !== 'done' ? '#000' : '#fff'; ctx.fillText(sc.frames[f] != null ? sc.frames[f] : '', x + cw/2 - 1, 26); ctx.fillText(f + 1, x + cw/2 - 1, 13); }
    ctx.textAlign = 'left';
  },
  down(x, y, k){ tap(k); },
  key(key, k){ if (key === ' ' || key === 'Enter') tap(k); }
});
})();
