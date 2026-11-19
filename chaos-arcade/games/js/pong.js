/* Pong Panic */
(function(){
const WIN = 7;
function serve(k, toYou){ const d = k.data; d.bx = k.W/2; d.by = k.H/2; const a = k.rand(-.6, .6); d.sp = 300; d.vx = Math.sin(a) * d.sp; d.vy = Math.cos(a) * d.sp * (toYou ? 1 : -1); d.wait = .8; d.rally = 0; }
Kit.def({
  aspect:.66, winAt:WIN * 100,
  how:'Drag or use ←/→ to move your paddle (bottom). First to ' + WIN + ' wins. The ball speeds up with every hit, and long rallies are worth bonus points. Hit the ball with the edge of your paddle for wild angles.',
  init(k){ const d = k.data; d.px = k.W/2; d.ax = k.W/2; d.me = 0; d.ai = 0; d.trail = []; serve(k, true); k.hud('sc', 'YOU 0 : 0 BOT'); },
  update(dt, k){
    const d = k.data, pw = 76, aw = 76;
    if (k.kL) d.px -= 420 * dt; if (k.kR) d.px += 420 * dt; d.px = k.clamp(d.px, pw/2, k.W - pw/2);
    const err = Math.max(30, 70 - d.me * 6), aiSp = 230 + d.me * 22 + d.rally * 6;
    const target = d.vy < 0 ? d.bx + Math.sin(k.t * 2) * err * .4 : k.W/2;
    d.ax += k.clamp(target - d.ax, -aiSp * dt, aiSp * dt); d.ax = k.clamp(d.ax, aw/2, k.W - aw/2);
    if (d.wait > 0){ d.wait -= dt; return; }
    d.bx += d.vx * dt; d.by += d.vy * dt;
    d.trail.push({ x:d.bx, y:d.by }); if (d.trail.length > 10) d.trail.shift();
    if (d.bx < 8 || d.bx > k.W - 8){ d.vx = -d.vx; d.bx = k.clamp(d.bx, 8, k.W - 8); k.beep(300, .03); }
    const py = k.H - 30, ay = 30;
    if (d.vy > 0 && d.by > py - 8 && d.by < py + 6 && Math.abs(d.bx - d.px) < pw/2 + 8){
      const off = (d.bx - d.px) / (pw/2); d.sp = Math.min(760, d.sp * 1.07); d.rally++;
      d.vx = d.sp * off * .9; d.vy = -Math.sqrt(Math.max(1, d.sp*d.sp - d.vx*d.vx)); d.by = py - 8;
      k.beep(520 + d.rally * 15, .05); k.shake(3, .08); k.burst(d.bx, d.by, ['#55ffff','#ffffff'], 8);
      if (Math.abs(off) > .75) k.pop(d.bx, d.by - 20, 'SPIN!', '#ff55ff');
      if (d.rally % 5 === 0) k.add(d.rally * 5, d.bx, d.by - 30, '#ffaa00');
    }
    if (d.vy < 0 && d.by < ay + 8 && d.by > ay - 6 && Math.abs(d.bx - d.ax) < aw/2 + 8){
      const off = (d.bx - d.ax) / (aw/2); d.sp = Math.min(760, d.sp * 1.05);
      d.vx = d.sp * off * .8; d.vy = Math.sqrt(Math.max(1, d.sp*d.sp - d.vx*d.vx)); d.by = ay + 8; k.beep(420, .05);
    }
    if (d.by < -10){ d.me++; k.add(100 + d.rally * 10, k.W/2, k.H/2, '#55ff55'); k.good(); k.flash('#55ff55', .15); k.shake(6); point(k, false); }
    else if (d.by > k.H + 10){ d.ai++; k.bad(); k.flash('#ff3a3a', .15); k.shake(8); point(k, true); }
  },
  draw(ctx, k){
    const d = k.data;
    ctx.fillStyle = '#071018'; ctx.fillRect(0, 0, k.W, k.H);
    ctx.fillStyle = '#16304a'; for (let x = 0; x < k.W; x += 20) ctx.fillRect(x, k.H/2 - 2, 10, 4);
    if (d.me == null) return;
    ctx.font = 'bold 48px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.fillText(d.ai, k.W/2, k.H/2 - 30); ctx.fillText(d.me, k.W/2, k.H/2 + 64); ctx.textAlign = 'left';
    d.trail.forEach((t, i) => { ctx.globalAlpha = i / 20; ctx.fillStyle = '#55ffff'; ctx.fillRect(t.x - 5, t.y - 5, 10, 10); }); ctx.globalAlpha = 1;
    ctx.shadowBlur = 14; ctx.shadowColor = '#fff'; ctx.fillStyle = '#fff'; ctx.fillRect(d.bx - 7, d.by - 7, 14, 14);
    ctx.shadowColor = '#55ffff'; ctx.fillStyle = '#55ffff'; ctx.fillRect(d.px - 38, k.H - 32, 76, 10);
    ctx.shadowColor = '#ff55ff'; ctx.fillStyle = '#ff55ff'; ctx.fillRect(d.ax - 38, 22, 76, 10); ctx.shadowBlur = 0;
    if (d.rally >= 3){ ctx.fillStyle = '#ffaa00'; ctx.font = 'bold 13px monospace'; ctx.fillText('RALLY x' + d.rally, 8, k.H/2 - 10); }
  },
  move(x, y, k){ k.data.px = x; }, down(x, y, k){ k.data.px = x; },
  key(key, k){ if (key === 'ArrowLeft' || key === 'a') k.kL = true; if (key === 'ArrowRight' || key === 'd') k.kR = true; },
  keyup(key, k){ if (key === 'ArrowLeft' || key === 'a') k.kL = false; if (key === 'ArrowRight' || key === 'd') k.kR = false; }
});
function point(k, toYou){
  const d = k.data; k.hud('sc', 'YOU ' + d.me + ' : ' + d.ai + ' BOT');
  if (d.me >= WIN) return k.over({ win:true, title:'🏆 YOU BEAT THE BOT!', lines:['🏓 Final: ' + d.me + ' – ' + d.ai] });
  if (d.ai >= WIN) return k.over({ win:false, title:'🤖 THE BOT WINS', lines:['🏓 Final: ' + d.me + ' – ' + d.ai] });
  serve(k, toYou);
}
})();
