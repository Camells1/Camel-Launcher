/* Bounce Blitz: aim, launch a volley of balls, break numbered blocks before they reach the floor */
(function(){
const COLS = 7;
function geo(k){ const cw = k.W / COLS, rows = Math.floor((k.H - 110) / cw); return { cw, rows, top:40 }; }
function newRow(k){
  const d = k.data, { cw } = geo(k); d.turn++;
  d.blocks.forEach(b => b.row++); d.items.forEach(b => b.row++);
  const cols = k.shuffle([...Array(COLS).keys()]), n = Math.min(COLS - 1, 2 + Math.floor(Math.random() * (3 + Math.min(3, d.turn / 8))));
  cols.slice(0, n).forEach(c => d.blocks.push({ col:c, row:1, hp:Math.random() < .2 ? d.turn * 2 : d.turn, max:d.turn * 2 }));
  const free = cols.slice(n); if (free.length) d.items.push({ col:free[0], row:1, t:'ball' });
  if (free.length > 1 && Math.random() < .25) d.items.push({ col:free[1], row:1, t:'coin' });
  const { rows } = geo(k);
  if (d.blocks.some(b => b.row >= rows)){ d.dead = true; k.bad(); k.shake(10); setTimeout(() => k.over({ lines:['🧱 Survived ' + d.turn + ' turns · ' + d.balls + ' balls'] }), 700); }
  k.hud('tn', '🧱 Turn ' + d.turn + ' · ⚪ ' + d.balls);
}
function blockRect(k, b){ const { cw, top } = geo(k); return { x:b.col * cw + 2, y:top + b.row * cw + 2, w:cw - 4, h:cw - 4 }; }
function launch(k, ang){
  const d = k.data; if (d.phase !== 'aim' || d.dead) return;
  d.phase = 'fly'; d.fired = 0; d.fireT = 0; d.ang = ang; d.landX = null; d.fly = [];
}
Kit.def({
  dom:false, aspect:.68, winAt:400, medals:[200, 400, 800],
  how:'Drag back from the launcher (or anywhere) and let go to fire all your balls. They bounce off walls and blocks, and every hit takes 1 off a block\'s number. Grab ⚪ to get an extra ball and 🪙 for points. The blocks move down every turn. If one reaches the bottom, the run ends. Hold anywhere while the balls fly to speed them up.',
  init(k){ const d = k.data; d.blocks = []; d.items = []; d.turn = 0; d.balls = 1; d.addBalls = 0; d.x = k.W / 2; d.phase = 'aim'; d.fly = []; d.aim = null; d.dead = false; d.fast = false; newRow(k); },
  update(dt, k){
    const d = k.data; if (d.phase !== 'fly') return;
    const sub = d.fast ? 3 : 1, R = 6, floor = k.H - 50, sp = 640;
    for (let s = 0; s < sub; s++){
      d.fireT -= dt; if (d.fired < d.balls && d.fireT <= 0){ d.fly.push({ x:d.x, y:floor - R, vx:Math.cos(d.ang) * sp, vy:Math.sin(d.ang) * sp }); d.fired++; d.fireT = .07; }
      for (const b of d.fly){ if (b.done) continue;
        const steps = 3; for (let i=0;i<steps;i++){ const h = dt / steps;
          b.x += b.vx * h; b.y += b.vy * h;
          if (b.x < R){ b.x = R; b.vx = Math.abs(b.vx); } if (b.x > k.W - R){ b.x = k.W - R; b.vx = -Math.abs(b.vx); }
          if (b.y < geo(k).top + R){ b.y = geo(k).top + R; b.vy = Math.abs(b.vy); }
          for (const bl of d.blocks){ if (bl.hp <= 0) continue; const r = blockRect(k, bl);
            if (b.x + R > r.x && b.x - R < r.x + r.w && b.y + R > r.y && b.y - R < r.y + r.h){
              const ox = Math.min(b.x + R - r.x, r.x + r.w - (b.x - R)), oy = Math.min(b.y + R - r.y, r.y + r.h - (b.y - R));
              if (ox < oy){ b.vx = b.x < r.x + r.w / 2 ? -Math.abs(b.vx) : Math.abs(b.vx); } else { b.vy = b.y < r.y + r.h / 2 ? -Math.abs(b.vy) : Math.abs(b.vy); }
              bl.hp--; k.add(1); k.beep(500 + Math.min(600, bl.hp * 8), .02, 'square', .025);
              if (bl.hp <= 0){ k.hit(5, r.x + r.w / 2, r.y + r.h / 2); k.burst(r.x + r.w / 2, r.y + r.h / 2, ['#ff7a5a','#ffd23a','#ffffff'], 10); }
              break; } }
          for (const it of d.items){ if (it.got) continue; const r = blockRect(k, it), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
            if (Math.hypot(b.x - cx, b.y - cy) < R + r.w * .28){ it.got = true; if (it.t === 'ball'){ d.addBalls++; k.beep(900, .05); k.pop(cx, cy, '+1 ⚪', '#ffffff'); } else { k.add(25, cx, cy, '#ffd23a'); k.coin(); } } }
          if (b.vy > 0 && b.y >= floor - R){ b.done = true; b.y = floor - R; if (d.landX == null) d.landX = b.x; break; }
          if (Math.abs(b.vy) < 40) b.vy = b.vy < 0 ? -60 : 60;   // never get stuck sliding sideways
        } }
      d.blocks = d.blocks.filter(b => b.hp > 0); d.items = d.items.filter(i => !i.got);
      if (d.fired >= d.balls && d.fly.every(b => b.done)){
        d.x = Math.max(12, Math.min(k.W - 12, d.landX != null ? d.landX : d.x)); d.balls += d.addBalls; d.addBalls = 0; d.phase = 'aim'; d.fast = false;
        if (!d.blocks.length){ k.add(50 * d.turn, k.W / 2, k.H / 2, '#55ff55'); Arcade.bigText('🧹 CLEAN BOARD!', '#55ff55'); }
        newRow(k); break;
      }
    }
  },
  draw(ctx, k){
    const d = k.data, W = k.W, H = k.H; ctx.fillStyle = '#120d24'; ctx.fillRect(0, 0, W, H);
    if (!d || !d.blocks) return;
    const { top, rows, cw } = geo(k), floor = H - 50;
    ctx.fillStyle = 'rgba(255,85,85,.12)'; ctx.fillRect(0, top + rows * cw, W, floor - top - rows * cw);
    ctx.fillStyle = '#333'; ctx.fillRect(0, floor, W, 3);
    d.blocks.forEach(b => { const r = blockRect(k, b), f = Math.min(1, b.hp / Math.max(1, d.turn * 2)), hue = 200 - f * 200;
      ctx.fillStyle = '#000'; ctx.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2); ctx.fillStyle = 'hsl(' + hue + ',75%,52%)'; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(r.x, r.y, r.w, 4);
      ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(cw * .34) + 'px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.hp, r.x + r.w / 2, r.y + r.h / 2 + 1); });
    d.items.forEach(it => { const r = blockRect(k, it); ctx.font = Math.round(cw * .42) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(it.t === 'ball' ? '⚪' : '🪙', r.x + r.w / 2, r.y + r.h / 2 + Math.sin((k.t || 0) * 4 + it.col) * 3); });
    ctx.fillStyle = '#fff'; d.fly.forEach(b => { if (b.done && d.phase === 'fly') return; ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI * 2); ctx.fill(); });
    if (d.phase === 'aim'){
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(d.x, floor - 6, 7, 0, Math.PI * 2); ctx.fill();
      ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillText('×' + d.balls, d.x, floor + 20);
      if (d.aim && d.aimAng != null){ ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.setLineDash([6, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(d.x, floor - 6);
        // preview one bounce off the side walls
        let x = d.x, y = floor - 6, vx = Math.cos(d.aimAng), vy = Math.sin(d.aimAng), len = 0;
        while (len < 420 && y > top){ x += vx * 4; y += vy * 4; len += 4; if (x < 6 || x > W - 6) vx = -vx; ctx.lineTo(x, y); }
        ctx.stroke(); ctx.setLineDash([]); }
      else { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '12px monospace'; ctx.fillText('drag back & release to fire', W / 2, H - 14); }
    } else if (!d.fast){ ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '12px monospace'; ctx.textAlign = 'center'; ctx.fillText('hold to speed up ⏩', W / 2, H - 14); }
  },
  down(x, y, k){ const d = k.data; if (d.phase === 'fly'){ d.fast = true; return; } d.aim = { x, y }; d.aimAng = null; },
  move(x, y, k, isDown){ const d = k.data; if (!isDown || !d.aim || d.phase !== 'aim') return;
    // slingshot: aim is the opposite of the drag direction; also allow pointing upward directly
    let dx = d.aim.x - x, dy = d.aim.y - y; if (Math.hypot(dx, dy) < 12) { d.aimAng = null; return; }
    if (dy > 0){ dx = x - d.x; dy = y - (k.H - 56); }
    let a = Math.atan2(dy, dx); a = Math.max(-Math.PI + .12, Math.min(-.12, a)); d.aimAng = a; },
  up(x, y, k){ const d = k.data; d.fast = false; if (d.phase === 'aim' && d.aimAng != null) launch(k, d.aimAng); d.aim = null; d.aimAng = null; },
  key(key, k){ const d = k.data; if (d.phase !== 'aim') return; d.kAng = d.kAng == null ? -Math.PI / 2 : d.kAng;
    if (key === 'ArrowLeft') d.kAng = Math.max(-Math.PI + .12, d.kAng - .06); if (key === 'ArrowRight') d.kAng = Math.min(-.12, d.kAng + .06);
    d.aim = { x:0, y:0 }; d.aimAng = d.kAng; if (key === ' ' || key === 'ArrowUp'){ launch(k, d.kAng); d.aim = null; d.aimAng = null; } }
});
})();
