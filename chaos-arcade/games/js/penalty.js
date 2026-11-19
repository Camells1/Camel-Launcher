/* Penalty Kick */
(function(){
const SHOTS = 10;
function reset(k){ const d = k.data; d.ball = { x:k.W/2, y:k.H - 80, z:1, t:0, fly:false }; d.keeper = { x:k.W/2, dive:0, tx:k.W/2 }; d.result = ''; d.aim = null; }
Kit.def({
  aspect:.8, winAt:6,
  how:'Swipe from the ball toward the goal to shoot. The direction picks your target, and a faster swipe means a harder shot. Corners are hard to save but easy to miss. The goalie learns your favourite side. 10 penalties: how many can you bury?',
  init(k){ const d = k.data; d.n = 0; d.goals = 0; d.hist = []; d.side = { l:0, r:0, c:0 }; reset(k); k.hud('sh', '⚽ 0/' + SHOTS); },
  update(dt, k){
    const d = k.data, b = d.ball, gw = k.W * .7, gx = (k.W - gw) / 2, gy = k.H * .2, gh = k.H * .25;
    d.keeper.x = k.lerp(d.keeper.x, d.keeper.tx, Math.min(1, dt * (b.fly ? d.kspeed : 2)));
    if (!b.fly) return;
    b.t += dt / b.dur; const t = Math.min(1, b.t);
    b.x = k.lerp(b.sx, b.tx, t) + Math.sin(t * Math.PI) * b.curve; b.y = k.lerp(b.sy, b.ty, t) - Math.sin(t * Math.PI) * 40; b.z = 1 - t * .55;
    if (t >= 1 && !d.result){
      const inGoal = b.tx > gx && b.tx < gx + gw && b.ty > gy && b.ty < gy + gh;
      const saved = inGoal && Math.abs(d.keeper.x - b.tx) < 34 + (b.ty > gy + gh * .45 ? 18 : 0);
      d.n++;
      if (!inGoal){ d.result = 'MISS!'; k.bad(); d.hist.push('❌'); k.combo = 0; }
      else if (saved){ d.result = 'SAVED!'; k.bad(); k.shake(5); d.hist.push('🧤'); k.combo = 0; }
      else { const corner = Math.abs(b.tx - k.W/2) > gw * .3 || b.ty < gy + gh * .3; d.goals++; d.result = corner ? 'TOP BINS!' : 'GOAL!'; k.hit(corner ? 150 : 100, b.tx, b.ty); k.good(); k.flash('#55ff55', .15); k.shake(8); k.burst(b.tx, b.ty, ['#ffffff','#55ff55','#ffff55'], 26, 300); d.hist.push('⚽'); d.net = .5; }
      k.hud('sh', '⚽ ' + d.goals + '/' + d.n);
      setTimeout(() => { if (!k.running) return; if (d.n >= SHOTS) return k.over({ score:k.score, lines:[d.hist.join(''), d.goals + ' goals from ' + SHOTS] }); reset(k); }, 1100);
    }
    d.net = Math.max(0, (d.net || 0) - dt);
  },
  draw(ctx, k){
    const d = k.data, gw = k.W * .7, gx = (k.W - gw) / 2, gy = k.H * .2, gh = k.H * .25;
    ctx.fillStyle = '#2a8a3a'; ctx.fillRect(0, 0, k.W, k.H);
    for (let i=0;i<8;i++){ ctx.fillStyle = i % 2 ? '#2f9a40' : '#2a8a3a'; ctx.fillRect(0, gy + gh + i * 40, k.W, 40); }
    ctx.fillStyle = '#16233a'; ctx.fillRect(0, 0, k.W, gy - 10);
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; const sway = d.net > 0 ? Math.sin(d.net * 30) * 3 : 0;
    for (let x = gx; x <= gx + gw; x += 14){ ctx.beginPath(); ctx.moveTo(x + sway, gy); ctx.lineTo(x, gy + gh); ctx.stroke(); } for (let y = gy; y <= gy + gh; y += 14){ ctx.beginPath(); ctx.moveTo(gx, y + sway); ctx.lineTo(gx + gw, y); ctx.stroke(); }
    ctx.fillStyle = '#fff'; ctx.fillRect(gx - 6, gy - 6, gw + 12, 6); ctx.fillRect(gx - 6, gy - 6, 6, gh + 6); ctx.fillRect(gx + gw, gy - 6, 6, gh + 6);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(k.W * .2, gy + gh, k.W * .6, k.H * .25);
    if (!d.keeper) return;
    const kx = d.keeper.x, ky = gy + gh - 54;
    ctx.fillStyle = '#ffd23a'; ctx.fillRect(kx - 16, ky + 10, 32, 30); ctx.fillStyle = '#e0b08a'; ctx.fillRect(kx - 9, ky - 6, 18, 16);
    const reach = d.ball.fly ? 1 : 0; ctx.fillStyle = '#ffd23a'; ctx.fillRect(kx - 34 - reach * 6, ky + 8 - reach * 10, 18, 10); ctx.fillRect(kx + 16 + reach * 6, ky + 8 - reach * 10, 18, 10);
    ctx.fillStyle = '#fff'; ctx.fillRect(kx - 40 - reach * 6, ky + 4 - reach * 10, 10, 12); ctx.fillRect(kx + 30 + reach * 6, ky + 4 - reach * 10, 10, 12);
    ctx.fillStyle = '#222'; ctx.fillRect(kx - 14, ky + 40, 10, 16); ctx.fillRect(kx + 4, ky + 40, 10, 16);
    const b = d.ball, r = 13 * b.z;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(b.x, b.y + r + 4, r, r * .35, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#111'; ctx.fillRect(b.x - r * .3, b.y - r * .3, r * .6, r * .6);
    if (d.aim){ ctx.strokeStyle = '#ffff55'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(d.aim.x, d.aim.y); ctx.stroke(); ctx.setLineDash([]); }
    if (d.result){ ctx.font = 'bold 34px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(d.result, k.W/2 + 3, k.H * .62 + 3); ctx.fillStyle = d.result.includes('GOAL') || d.result.includes('BINS') ? '#ffff55' : '#ff5555'; ctx.fillText(d.result, k.W/2, k.H * .62); ctx.textAlign = 'left'; }
  },
  down(x, y, k){ const d = k.data; if (d.ball.fly || d.result) return; d.aim = { sx:x, sy:y, x, y, t:performance.now() }; },
  move(x, y, k, p){ if (p && k.data.aim){ k.data.aim.x = x; k.data.aim.y = y; } },
  up(x, y, k){
    const d = k.data, a = d.aim; d.aim = null; if (!a || d.ball.fly || d.result) return;
    const dx = x - a.sx, dy = y - a.sy; if (dy > -20) return;
    const b = d.ball, gy = k.H * .2, gh = k.H * .25;
    const dt = Math.max(60, performance.now() - a.t), power = Math.min(1.3, 220 / dt + .4);
    const len = Math.hypot(dx, dy), scale = (b.y - (gy + gh / 2)) / Math.max(1, -dy);
    b.sx = b.x; b.sy = b.y; b.tx = b.x + dx * scale * (.9 + (Math.random() - .5) * .12 / power); b.ty = gy + gh * .5 - (power - .8) * gh * .9 + (Math.random() - .5) * 18;
    b.curve = (Math.random() - .5) * 30; b.dur = .65 / power; b.t = 0; b.fly = true;
    const side = b.tx < k.W/2 - 30 ? 'l' : b.tx > k.W/2 + 30 ? 'r' : 'c'; d.side[side]++;
    const fav = Object.keys(d.side).sort((p, q) => d.side[q] - d.side[p])[0];
    const smart = Math.min(.75, .3 + d.n * .05), guess = Math.random() < smart ? (Math.random() < .55 ? side : fav) : k.pick(['l','r','c']);
    d.keeper.tx = guess === 'l' ? k.W * .3 : guess === 'r' ? k.W * .7 : k.W / 2; d.kspeed = 3 + d.n * .3;
    k.beep(250, .08, 'square', .1);
  }
});
})();
