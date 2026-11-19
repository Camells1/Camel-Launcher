/* Puck Wars */
(function(){
const WIN = 7;
function reset(k, toward){ const d = k.data; d.pk = { x:k.W/2, y:k.H/2 + (toward > 0 ? 40 : -40), vx:0, vy:0, r:14 }; d.wait = .7; }
Kit.def({
  aspect:.6, winAt:WIN * 100,
  how:'Drag your mallet (bottom half) to smash the puck into the robot\'s goal. First to ' + WIN + ' wins. Hit the puck hard for faster shots, and bank it off the walls to sneak past the bot.',
  init(k){ const d = k.data; d.me = { x:k.W/2, y:k.H - 70, px:k.W/2, py:k.H - 70, r:24 }; d.bot = { x:k.W/2, y:70, r:24 }; d.tx = k.W/2; d.ty = k.H - 70; d.you = 0; d.ai = 0; reset(k, 1); k.hud('sc', 'YOU 0 : 0 BOT'); },
  update(dt, k){
    const d = k.data, gw = k.W * .38, me = d.me, bot = d.bot, pk = d.pk;
    me.px = me.x; me.py = me.y;
    me.x = k.clamp(d.tx, me.r, k.W - me.r); me.y = k.clamp(d.ty, k.H/2 + me.r, k.H - me.r);
    const mvx = (me.x - me.px) / Math.max(dt, .001), mvy = (me.y - me.py) / Math.max(dt, .001);
    const lvl = Math.min(1, (d.you + d.ai) / 10), sp = 230 + lvl * 160;
    let bx = pk.y < k.H/2 + 40 ? pk.x : k.W/2, by = pk.y < k.H/2 ? Math.min(pk.y - 20, k.H/2 - bot.r) : 70;
    bot.x += k.clamp(bx - bot.x, -sp * dt, sp * dt); bot.y += k.clamp(by - bot.y, -sp * dt, sp * dt);
    bot.y = k.clamp(bot.y, bot.r, k.H/2 - bot.r); bot.x = k.clamp(bot.x, bot.r, k.W - bot.r);
    if (d.wait > 0){ d.wait -= dt; return; }
    pk.x += pk.vx * dt; pk.y += pk.vy * dt; pk.vx *= Math.pow(.6, dt); pk.vy *= Math.pow(.6, dt);
    if (pk.x < pk.r){ pk.x = pk.r; pk.vx = Math.abs(pk.vx); k.beep(250, .03); } if (pk.x > k.W - pk.r){ pk.x = k.W - pk.r; pk.vx = -Math.abs(pk.vx); k.beep(250, .03); }
    const inGoal = Math.abs(pk.x - k.W/2) < gw/2;
    if (pk.y < pk.r && !inGoal){ pk.y = pk.r; pk.vy = Math.abs(pk.vy); k.beep(250, .03); }
    if (pk.y > k.H - pk.r && !inGoal){ pk.y = k.H - pk.r; pk.vy = -Math.abs(pk.vy); k.beep(250, .03); }
    [[me, mvx, mvy], [bot, 0, 0]].forEach(([m, mx, my]) => {
      const dx = pk.x - m.x, dy = pk.y - m.y, dist = Math.hypot(dx, dy), min = pk.r + m.r;
      if (dist < min && dist > 0){
        const nx = dx / dist, ny = dy / dist; pk.x = m.x + nx * min; pk.y = m.y + ny * min;
        const rel = (pk.vx - mx) * nx + (pk.vy - my) * ny;
        if (rel < 0){ pk.vx -= 1.9 * rel * nx; pk.vy -= 1.9 * rel * ny; }
        if (m === bot){ pk.vx += nx * 260; pk.vy += ny * 260; }
        const s = Math.hypot(pk.vx, pk.vy); if (s > 1100){ pk.vx *= 1100 / s; pk.vy *= 1100 / s; }
        k.beep(m === me ? 500 : 380, .04); if (s > 600){ k.shake(4, .1); k.burst(pk.x, pk.y, ['#ffffff','#55ffff'], 6); }
      }
    });
    if (pk.y < -pk.r){ d.you++; k.add(100, k.W/2, 60, '#55ff55'); k.good(); k.flash('#55ff55', .2); k.shake(8); k.burst(pk.x, 10, ['#55ff55','#ffffff'], 30, 300); goal(k, -1); }
    else if (pk.y > k.H + pk.r){ d.ai++; k.bad(); k.flash('#ff3a3a', .2); k.shake(8); goal(k, 1); }
  },
  draw(ctx, k){
    const d = k.data, gw = k.W * .38;
    ctx.fillStyle = '#d8eef8'; ctx.fillRect(0, 0, k.W, k.H);
    ctx.strokeStyle = '#ff5a6a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, k.H/2); ctx.lineTo(k.W, k.H/2); ctx.stroke();
    ctx.beginPath(); ctx.arc(k.W/2, k.H/2, 46, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#5a8aff'; ctx.beginPath(); ctx.arc(k.W/2, 0, gw/2, 0, Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(k.W/2, k.H, gw/2, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#1a1a2a'; ctx.fillRect(k.W/2 - gw/2, 0, gw, 6); ctx.fillRect(k.W/2 - gw/2, k.H - 6, gw, 6);
    if (!d.pk) return;
    const mallet = (m, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * .45, 0, Math.PI * 2); ctx.fill(); };
    mallet(d.bot, '#e03aa0'); mallet(d.me, '#2a9ad8');
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(d.pk.x, d.pk.y, d.pk.r, 0, Math.PI * 2); ctx.fill();
    ctx.font = 'bold 40px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillText(d.ai, k.W/2, k.H/2 - 60); ctx.fillText(d.you, k.W/2, k.H/2 + 90); ctx.textAlign = 'left';
  },
  down(x, y, k){ k.data.tx = x; k.data.ty = y; },
  move(x, y, k){ k.data.tx = x; k.data.ty = y; }
});
function goal(k, toward){
  const d = k.data; k.hud('sc', 'YOU ' + d.you + ' : ' + d.ai + ' BOT');
  if (d.you >= WIN) return k.over({ win:true, title:'🏆 YOU WIN!', lines:['🏒 ' + d.you + ' – ' + d.ai] });
  if (d.ai >= WIN) return k.over({ win:false, title:'🤖 BOT WINS', lines:['🏒 ' + d.you + ' – ' + d.ai] });
  reset(k, toward);
}
})();
