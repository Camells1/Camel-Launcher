/* Tank Duel */
(function(){
const G = 320;
function terrain(k){ const d = k.data, ph = [k.rand(0, 6), k.rand(0, 6), k.rand(0, 6)]; d.h = []; for (let x=0;x<=Math.ceil(k.W);x++){ const t = x / k.W; d.h.push(k.H * (.28 + .1 * Math.sin(t * 5 + ph[0]) + .06 * Math.sin(t * 11 + ph[1]) + .04 * Math.sin(t * 23 + ph[2]))); } }
function groundY(k, x){ const d = k.data; x = Math.max(0, Math.min(d.h.length - 1, Math.round(x))); return k.H - d.h[x]; }
function newRound(k){
  const d = k.data; terrain(k);
  d.me = { x:k.W * .14, hp:100, c:'#55ffff' }; d.bot = { x:k.W * .86, hp:70 + d.lvl * 30, max:70 + d.lvl * 30, c:'#ff55ff' };
  [d.me, d.bot].forEach(t => { const gx = Math.round(t.x); for (let i=-14;i<=14;i++) if (d.h[gx + i] != null) d.h[gx + i] = d.h[gx]; });
  d.turn = 'me'; d.shell = null; d.wind = k.rand(-60, 60) * Math.min(1, .4 + d.lvl * .15); d.msg = 'Your turn: drag back from your tank to aim';
  k.hud('lv', '🤖 bot ' + d.lvl);
}
function fire(k, who, ang, pow){ const d = k.data, t = d[who], y = groundY(k, t.x) - 12; d.shell = { x:t.x, y, vx:Math.cos(ang) * pow, vy:-Math.sin(ang) * pow, who, trail:[] }; k.sfx.noise(.2, .25, 0, 'lowpass', 1200, 200); k.shake(3); }
function simulate(k, x, y, ang, pow){ let vx = Math.cos(ang) * pow, vy = -Math.sin(ang) * pow; const d = k.data; for (let i=0;i<600;i++){ vx += d.wind * .016; vy += G * .016; x += vx * .016; y += vy * .016; if (x < 0 || x > k.W) return { x, hit:false }; if (y >= groundY(k, x)) return { x, hit:true }; } return { x, hit:false }; }
function botTurn(k){
  const d = k.data, err = Math.max(8, 60 - d.lvl * 9);
  let best = null;
  for (let a=100;a<=170;a+=3) for (let p=200;p<=620;p+=15){ const r = simulate(k, d.bot.x, groundY(k, d.bot.x) - 12, a * Math.PI / 180, p); const s = Math.abs(r.x - d.me.x); if (!best || s < best.s) best = { s, a, p }; }
  const a = (best.a + k.rand(-1, 1) * err / 10) * Math.PI / 180, p = best.p + k.rand(-1, 1) * err;
  d.msg = '🤖 Bot is firing…'; fire(k, 'bot', a, p);
}
function explode(k, x, y){
  const d = k.data, R = 30;
  for (let i=Math.max(0, Math.floor(x - R)); i<=Math.min(d.h.length - 1, Math.ceil(x + R)); i++){ const dy = Math.sqrt(Math.max(0, R*R - (i - x) * (i - x))), top = k.H - d.h[i]; if (y + dy > top) d.h[i] = Math.max(8, Math.min(d.h[i], k.H - (y + dy))); }
  k.boom(); k.shake(10, .3); k.burst(x, y, ['#ffaa00','#ff5555','#ffff55','#8a6a4a'], 26, 300);
  [['me', d.me], ['bot', d.bot]].forEach(([n, t]) => {
    const dist = Math.hypot(t.x - x, groundY(k, t.x) - 8 - y), dmg = Math.round(Math.max(0, 50 * (1 - dist / 60)));
    if (dmg > 0){ t.hp -= dmg; k.pop(t.x, groundY(k, t.x) - 40, '-' + dmg, n === 'me' ? '#ff5555' : '#ffff55'); if (n === 'bot') k.add(dmg * 5); if (dmg > 35 && n === 'bot') k.pop(k.W/2, k.H * .3, 'DIRECT HIT!', '#55ff55'); }
  });
}
Kit.def({
  aspect:1.1, winAt:1000,
  how:'Drag BACK from your cyan tank (like a slingshot) to set angle and power, then release to fire. Watch the 💨 wind arrow. Destroy the bot before it destroys you. Every bot you beat sends a tougher one with more armor.',
  init(k){ const d = k.data; d.lvl = 1; d.kills = 0; newRound(k); },
  update(dt, k){
    const d = k.data, s = d.shell; if (!s) return;
    for (let i=0;i<3;i++){
      const h = dt / 3; s.vx += d.wind * h; s.vy += G * h; s.x += s.vx * h; s.y += s.vy * h;
      s.trail.push([s.x, s.y]); if (s.trail.length > 30) s.trail.shift();
      const offX = s.x < -40 || s.x > k.W + 40 || s.y > k.H + 40;
      const hitTank = [d.me, d.bot].some(t => t !== d[s.who] && Math.abs(s.x - t.x) < 16 && Math.abs(s.y - (groundY(k, t.x) - 8)) < 14);
      if (offX || s.y >= groundY(k, s.x) || hitTank){
        if (!offX) explode(k, s.x, Math.min(s.y, groundY(k, s.x)));
        d.shell = null;
        setTimeout(() => {
          if (!k.running) return;
          if (d.me.hp <= 0) return k.over({ lines:['💣 Destroyed ' + d.kills + ' bots'] });
          if (d.bot.hp <= 0){ d.kills++; k.add(500 * d.lvl, k.W/2, k.H/3, '#55ff55'); k.good(); k.flash('#55ff55', .2); d.lvl++; d.me.hp = Math.min(100, d.me.hp + 30); return newRound(k); }
          d.wind = k.clamp(d.wind + k.rand(-25, 25), -90, 90);
          if (s.who === 'me'){ d.turn = 'bot'; setTimeout(() => k.running && botTurn(k), 600); } else { d.turn = 'me'; d.msg = 'Your turn!'; }
        }, 700);
        return;
      }
    }
  },
  draw(ctx, k){
    const d = k.data;
    const g = ctx.createLinearGradient(0, 0, 0, k.H); g.addColorStop(0, '#1a1a4a'); g.addColorStop(1, '#5a3a6a'); ctx.fillStyle = g; ctx.fillRect(0, 0, k.W, k.H);
    if (!d.h) return;
    ctx.fillStyle = '#3a8a3a'; ctx.beginPath(); ctx.moveTo(0, k.H); d.h.forEach((h, x) => ctx.lineTo(x, k.H - h)); ctx.lineTo(k.W, k.H); ctx.fill();
    ctx.fillStyle = '#5aaa3a'; d.h.forEach((h, x) => { if (x % 2 === 0) ctx.fillRect(x, k.H - h, 2, 4); });
    [d.me, d.bot].forEach((t, i) => {
      const y = groundY(k, t.x); ctx.fillStyle = t.c; ctx.fillRect(t.x - 14, y - 12, 28, 10); ctx.fillRect(t.x - 7, y - 18, 14, 7);
      ctx.fillStyle = '#222'; ctx.fillRect(t.x - 15, y - 4, 30, 5);
      const aim = i === 0 && d.aim ? d.aim.a : (i === 0 ? .8 : Math.PI - .8);
      ctx.strokeStyle = t.c; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(t.x, y - 15); ctx.lineTo(t.x + Math.cos(aim) * 18, y - 15 - Math.sin(aim) * 18); ctx.stroke();
      const max = i === 0 ? 100 : t.max; ctx.fillStyle = '#000'; ctx.fillRect(t.x - 20, y - 32, 40, 6); ctx.fillStyle = t.hp / max > .4 ? '#55ff55' : '#ff5555'; ctx.fillRect(t.x - 19, y - 31, 38 * Math.max(0, t.hp) / max, 4);
    });
    if (d.shell){ ctx.fillStyle = 'rgba(255,255,255,.4)'; d.shell.trail.forEach(([x, y]) => ctx.fillRect(x - 1, y - 1, 2, 2)); ctx.fillStyle = '#fff'; ctx.fillRect(d.shell.x - 3, d.shell.y - 3, 6, 6); }
    if (d.aim && d.turn === 'me' && !d.shell){
      let x = d.me.x, y = groundY(k, d.me.x) - 12, vx = Math.cos(d.aim.a) * d.aim.p, vy = -Math.sin(d.aim.a) * d.aim.p;
      ctx.fillStyle = 'rgba(255,255,85,.8)';
      for (let i=0;i<40;i++){ vx += d.wind * .03; vy += G * .03; x += vx * .03; y += vy * .03; if (i % 2 === 0 && i < 26) ctx.fillRect(x - 2, y - 2, 4, 4); }
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace'; ctx.fillText(Math.round(d.aim.a * 180 / Math.PI) + '° · power ' + Math.round(d.aim.p / 6.4) + '%', 8, 48);
    }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
    ctx.fillText('💨 wind ' + (d.wind < 0 ? '◀ ' : '') + Math.abs(Math.round(d.wind)) + (d.wind > 0 ? ' ▶' : ''), k.W/2, 20);
    ctx.fillStyle = '#ffff55'; ctx.fillText(d.msg || '', k.W/2, 40); ctx.textAlign = 'left';
  },
  down(x, y, k){ const d = k.data; if (d.turn !== 'me' || d.shell) return; d.drag = { x, y }; },
  move(x, y, k, p){ const d = k.data; if (!p || !d.drag) return; const dx = d.drag.x - x, dy = d.drag.y - y; d.aim = { a:k.clamp(Math.atan2(-dy, dx), .05, Math.PI - .05), p:Math.min(640, Math.hypot(dx, dy) * 4.5) }; },
  up(x, y, k){ const d = k.data; if (!d.drag) return; d.drag = null; if (d.aim && d.aim.p > 120 && d.turn === 'me'){ d.turn = 'flying'; d.msg = ''; fire(k, 'me', d.aim.a, d.aim.p); } }
});
})();
