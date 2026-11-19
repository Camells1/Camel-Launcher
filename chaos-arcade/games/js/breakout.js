/* Brick Smash */
(function(){
const COLS = 8, COLORS = ['#ff5555','#ffaa00','#ffff55','#55ff55','#55ffff','#5577ff','#ff55ff','#ffffff'];
function level(k){
  const d = k.data, rows = Math.min(9, 4 + d.lvl), bw = k.W / COLS;
  d.bricks = [];
  for (let r=0;r<rows;r++) for (let c=0;c<COLS;c++){
    if (d.lvl > 1 && Math.random() < .08) continue;
    const hp = r < d.lvl - 1 && Math.random() < .35 ? 2 : 1;
    d.bricks.push({ x:c*bw + 2, y:60 + r*20, w:bw - 4, h:16, hp, c:COLORS[r % COLORS.length], v:(rows - r) * 5 });
  }
}
function newBall(k, stuck){ return { x:k.data.px, y:k.H - 52, vx:0, vy:0, r:6, stuck }; }
function launch(k){ const d = k.data; d.balls.forEach(b => { if (b.stuck){ b.stuck = false; const sp = d.speed; b.vx = sp * (Math.random() - .5) * .8; b.vy = -sp; } }); }
Kit.def({
  aspect:.75, winAt:500,
  how:'Move with your finger, mouse or ←/→. Tap or press SPACE to launch. Smash bricks without letting the ball fall. Catch power-ups: 🟦 wide paddle, 🟣 multiball, 🟢 slow ball, ❤️ extra life. Chain bricks for combo points.',
  init(k){ const d = k.data; d.lvl = 1; d.lives = 3; d.pw = 80; d.px = k.W/2; d.speed = 320; d.balls = [newBall(k, true)]; d.drops = []; d.wide = 0; d.slow = 0; level(k); k.lives(3); k.hud('lvl', 'LVL 1'); },
  update(dt, k){
    const d = k.data;
    if (k.keyL) d.px -= 420 * dt; if (k.keyR) d.px += 420 * dt;
    const pw = d.pw * (d.wide > 0 ? 1.6 : 1); d.wide -= dt; d.slow -= dt;
    d.px = k.clamp(d.px, pw/2, k.W - pw/2);
    const py = k.H - 40, sm = d.slow > 0 ? .6 : 1;
    d.balls.forEach(b => {
      if (b.stuck){ b.x = d.px; b.y = py - 10; return; }
      const steps = 3;
      for (let s=0;s<steps;s++){
        b.x += b.vx * dt * sm / steps; b.y += b.vy * dt * sm / steps;
        if (b.x < b.r){ b.x = b.r; b.vx = Math.abs(b.vx); } if (b.x > k.W - b.r){ b.x = k.W - b.r; b.vx = -Math.abs(b.vx); }
        if (b.y < b.r){ b.y = b.r; b.vy = Math.abs(b.vy); }
        if (b.vy > 0 && b.y + b.r >= py && b.y < py + 10 && Math.abs(b.x - d.px) < pw/2 + b.r){
          const off = (b.x - d.px) / (pw/2), sp = Math.hypot(b.vx, b.vy);
          b.vx = sp * off * .85; b.vy = -Math.sqrt(Math.max(1, sp*sp - b.vx*b.vx)); b.y = py - b.r;
          k.combo = 0; k.beep(300, .04);
        }
        for (const br of d.bricks){
          if (br.hp <= 0) continue;
          if (b.x + b.r > br.x && b.x - b.r < br.x + br.w && b.y + b.r > br.y && b.y - b.r < br.y + br.h){
            const ox = Math.min(b.x + b.r - br.x, br.x + br.w - (b.x - b.r)), oy = Math.min(b.y + b.r - br.y, br.y + br.h - (b.y - b.r));
            if (ox < oy) b.vx = -b.vx; else b.vy = -b.vy;
            br.hp--;
            if (br.hp <= 0){
              k.hit(br.v, br.x + br.w/2, br.y); k.burst(br.x + br.w/2, br.y + br.h/2, [br.c, '#ffffff'], 10); k.beep(400 + k.combo * 30, .05);
              if (Math.random() < .14) d.drops.push({ x:br.x + br.w/2, y:br.y, t:k.pick(['wide','multi','slow','life']) });
              const sp = Math.hypot(b.vx, b.vy) * 1.01; const a = Math.atan2(b.vy, b.vx); b.vx = Math.cos(a)*sp; b.vy = Math.sin(a)*sp;
            } else { k.beep(200, .04); br.c = '#999'; }
            k.shake(2, .08);
            break;
          }
        }
      }
    });
    d.drops.forEach(p => {
      p.y += 140 * dt;
      if (p.y > py - 8 && p.y < py + 12 && Math.abs(p.x - d.px) < pw/2 + 8){
        p.y = 9999; k.coin(); k.pop(p.x, py - 20, { wide:'WIDE!', multi:'MULTIBALL!', slow:'SLOW-MO!', life:'+1 LIFE!' }[p.t], '#55ffff');
        if (p.t === 'wide') d.wide = 10;
        if (p.t === 'slow') d.slow = 8;
        if (p.t === 'life'){ d.lives++; k.lives(d.lives); }
        if (p.t === 'multi'){ const src = d.balls.find(b => !b.stuck) || d.balls[0]; for (let i=0;i<2;i++){ const nb = newBall(k, false); nb.x = src.x; nb.y = src.y; const a = -Math.PI/2 + (i ? .5 : -.5); nb.vx = Math.cos(a) * d.speed; nb.vy = Math.sin(a) * d.speed; d.balls.push(nb); } }
      }
    });
    d.drops = d.drops.filter(p => p.y < k.H);
    d.balls = d.balls.filter(b => b.y < k.H + 20);
    if (!d.balls.length){
      d.lives--; k.lives(Math.max(0, d.lives)); k.bad(); k.shake(10); k.flash('#ff0000', .2); k.combo = 0;
      if (d.lives <= 0) return k.over({ lines:['🧱 Reached level ' + d.lvl] });
      d.balls = [newBall(k, true)];
    }
    if (d.bricks.every(b => b.hp <= 0)){
      d.lvl++; d.speed += 35; k.add(200 * d.lvl, k.W/2, k.H/2, '#55ff55'); k.good(); k.flash('#55ff55', .2);
      k.hud('lvl', 'LVL ' + d.lvl); level(k); d.balls = [newBall(k, true)]; d.drops = [];
    }
  },
  draw(ctx, k){
    const d = k.data;
    const g = ctx.createLinearGradient(0, 0, 0, k.H); g.addColorStop(0, '#120a2a'); g.addColorStop(1, '#2a0f3a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, k.W, k.H);
    if (!d.bricks) return;
    d.bricks.forEach(b => { if (b.hp <= 0) return; ctx.fillStyle = b.c; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(b.x, b.y, b.w, 3); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(b.x, b.y + b.h - 3, b.w, 3); if (b.hp > 1){ ctx.fillStyle = '#000'; ctx.fillRect(b.x + b.w/2 - 2, b.y + 5, 4, 6); } });
    d.drops.forEach(p => { ctx.fillStyle = { wide:'#5577ff', multi:'#ff55ff', slow:'#55ff55', life:'#ff3a3a' }[p.t]; ctx.fillRect(p.x - 9, p.y - 6, 18, 12); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillText({ wide:'W', multi:'M', slow:'S', life:'♥' }[p.t], p.x, p.y + 4); ctx.textAlign = 'left'; });
    const pw = d.pw * (d.wide > 0 ? 1.6 : 1);
    ctx.shadowColor = '#55ffff'; ctx.shadowBlur = 12; ctx.fillStyle = '#55ffff'; ctx.fillRect(d.px - pw/2, k.H - 40, pw, 10); ctx.shadowBlur = 0;
    d.balls.forEach(b => { ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 10; ctx.fillRect(b.x - b.r, b.y - b.r, b.r*2, b.r*2); ctx.shadowBlur = 0; });
    if (d.balls.some(b => b.stuck)){ ctx.fillStyle = '#ffff55'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center'; ctx.fillText('TAP TO LAUNCH', k.W/2, k.H - 70); ctx.textAlign = 'left'; }
  },
  move(x, y, k){ k.data.px = x; },
  down(x, y, k){ k.data.px = x; launch(k); },
  key(key, k){ if (key === 'ArrowLeft' || key === 'a') k.keyL = true; if (key === 'ArrowRight' || key === 'd') k.keyR = true; if (key === ' ' || key === 'ArrowUp') launch(k); },
  keyup(key, k){ if (key === 'ArrowLeft' || key === 'a') k.keyL = false; if (key === 'ArrowRight' || key === 'd') k.keyR = false; }
});
})();
