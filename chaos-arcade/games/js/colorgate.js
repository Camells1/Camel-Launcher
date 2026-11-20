/* Color Gate */
(function(){
const COLS = ['#ff3a6a','#ffd23a','#3ad0ff','#a050ff'];
function gate(k, y){ return { y, r:k.rand(62, 80), rot:Math.random() * Math.PI * 2, sp:k.rand(1.1, 1.9) * (Math.random() < .5 ? -1 : 1), passed:{ top:false, bot:false }, star:true, swap:true }; }
function jump(k){ const d = k.data; if (d.dead) return; d.vy = -390; d.started = true; k.beep(700, .03, 'square', .04); }
function segAt(g, angle){ const a = ((angle - g.rot) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2); return Math.floor(a / (Math.PI / 2)); }
Kit.def({
  aspect:.62, winAt:20,
  how:'Tap or press SPACE to bounce up. You can only pass through the part of a ring that matches YOUR color. ⭐ stars give points and the 🔄 swirl changes your color. Timing is everything.',
  init(k){ const d = k.data; d.y = k.H * .75; d.vy = 0; d.cam = 0; d.col = 0; d.gates = []; d.started = false; d.dead = false; d.passed = 0; for (let i=0;i<4;i++) d.gates.push(gate(k, k.H * .35 - i * 260)); d.gates[0].star = true; },
  update(dt, k){
    const d = k.data, cx = k.W/2;
    if (d.started){ d.vy += 1100 * dt; d.y += d.vy * dt; }
    d.cam = Math.min(d.cam, d.y - k.H * .6);
    d.gates.forEach(g => {
      g.rot += g.sp * dt * (1 + d.passed * .03);
      const gy = g.y, thick = 12;
      [['top', gy - g.r, -Math.PI / 2], ['bot', gy + g.r, Math.PI / 2]].forEach(([side, ry, ang]) => {
        if (Math.abs(d.y - ry) < thick + 8 && !d.dead){ if (segAt(g, ang) !== d.col) return die(k); }
      });
      if (g.star && Math.abs(d.y - gy) < 16){ g.star = false; d.passed++; k.hit(1, cx, gy - 30); k.beep(1000, .06, 'triangle', .08); k.burst(cx, gy - d.cam, ['#ffffff','#ffff55'], 12); }
      if (g.swap && Math.abs(d.y - (gy - g.r - 70)) < 14){ g.swap = false; let c; do { c = k.ri(0, 3); } while (c === d.col); d.col = c; k.beep(500, .08, 'sine', .08); k.burst(cx, gy - g.r - 70 - d.cam, COLS, 10); }
    });
    const top = Math.min.apply(null, d.gates.map(g => g.y));
    if (top - d.cam > -400) d.gates.push(gate(k, top - k.rand(240, 300)));
    d.gates = d.gates.filter(g => g.y - d.cam < k.H + 200);
    if (d.y - d.cam > k.H + 20) die(k);
  },
  draw(ctx, k){
    const d = k.data, cx = k.W/2;
    ctx.fillStyle = '#161226'; ctx.fillRect(0, 0, k.W, k.H);
    if (!d.gates) return;
    d.gates.forEach(g => {
      const y = g.y - d.cam;
      for (let i=0;i<4;i++){ ctx.strokeStyle = COLS[i]; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(cx, y, g.r, g.rot + i * Math.PI / 2 + .03, g.rot + (i + 1) * Math.PI / 2 - .03); ctx.stroke(); }
      if (g.star){ ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⭐', cx, y); }
      if (g.swap){ const sy = y - g.r - 70; for (let i=0;i<4;i++){ ctx.fillStyle = COLS[i]; ctx.beginPath(); ctx.moveTo(cx, sy); ctx.arc(cx, sy, 11, i * Math.PI / 2 + k.t * 3, (i + 1) * Math.PI / 2 + k.t * 3); ctx.fill(); } }
    });
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    if (!d.dead){ ctx.fillStyle = COLS[d.col]; ctx.shadowColor = COLS[d.col]; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(cx, d.y - d.cam, 9, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
    if (!d.started){ ctx.fillStyle = '#fff'; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center'; ctx.fillText('TAP TO BOUNCE', cx, k.H - 30); ctx.textAlign = 'left'; }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 30px monospace'; ctx.textAlign = 'center'; ctx.fillText(d.passed, cx, 40); ctx.textAlign = 'left';
  },
  down(x, y, k){ jump(k); },
  key(key, k){ if (key === ' ' || key === 'ArrowUp') jump(k); }
});
function die(k){ const d = k.data; if (d.dead) return; d.dead = true; k.boom(); k.shake(10); k.burst(k.W/2, d.y - d.cam, COLS, 30, 300); k.over({ score:d.passed, lines:['🎨 ' + d.passed + ' gates cleared'] }); }
})();
