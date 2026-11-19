/* Tower Stack */
(function(){
const BH = 26;
function drop(k){
  const d = k.data, top = d.stack[d.stack.length - 1], m = d.mv;
  if (!m || d.dead) return;
  const l = Math.max(m.x, top.x), r = Math.min(m.x + m.w, top.x + top.w), w = r - l;
  if (w <= 0){ d.falling.push({ x:m.x, y:m.y, w:m.w, vy:0, c:m.c }); d.mv = null; d.dead = true; k.boom(); k.shake(10, .4); return k.over({ lines:['🏗️ ' + (d.stack.length - 1) + ' floors · ' + d.perfects + ' perfect drops'], delay:900 }); }
  const perfect = Math.abs(m.x - top.x) < 4;
  let nb;
  if (perfect){
    d.perf++; d.perfects++; nb = { x:top.x, w:top.w, y:m.y, c:m.c };
    if (d.perf >= 4){ nb.w = Math.min(d.base, nb.w + 10); nb.x -= 5; k.pop(nb.x + nb.w/2, m.y - d.cam - 20, 'GROW!', '#55ff55'); }
    k.hit(25, nb.x + nb.w/2, m.y - d.cam); k.beep(600 + d.perf * 80, .1, 'triangle', .1); k.flash('#ffffff', .08);
    k.burst(nb.x + nb.w/2, m.y - d.cam + BH/2, ['#ffffff', m.c], 16);
  } else {
    d.perf = 0; nb = { x:l, w, y:m.y, c:m.c };
    const cut = m.x < top.x ? { x:m.x, w:top.x - m.x } : { x:r, w:m.x + m.w - r };
    d.falling.push({ x:cut.x, y:m.y, w:cut.w, vy:0, c:m.c });
    k.add(10, nb.x + nb.w/2, m.y - d.cam); k.beep(300, .06); k.shake(3, .1); k.combo = 0;
  }
  d.stack.push(nb);
  k.hud('fl', '🏢 ' + (d.stack.length - 1));
  spawn(k);
}
function spawn(k){
  const d = k.data, top = d.stack[d.stack.length - 1], n = d.stack.length;
  const fromLeft = n % 2 === 0;
  d.mv = { x:fromLeft ? -top.w : k.W, y:top.y - BH, w:top.w, c:'hsl(' + ((n * 17) % 360) + ',85%,60%)', dir:fromLeft ? 1 : -1, sp:Math.min(420, 150 + n * 7) };
}
Kit.def({
  aspect:.66, winAt:300,
  how:'Tap, click or press SPACE to drop the sliding floor. Whatever hangs over the edge gets chopped off. Land 4 perfect drops in a row and your floor grows back.',
  init(k){ const d = k.data; d.base = k.W * .45; d.stack = [{ x:(k.W - d.base)/2, w:d.base, y:k.H - 60, c:'#5577ff' }]; d.falling = []; d.cam = 0; d.perf = 0; d.perfects = 0; d.dead = false; spawn(k); k.hud('fl', '🏢 0'); },
  update(dt, k){
    const d = k.data;
    if (d.mv){ d.mv.x += d.mv.dir * d.mv.sp * dt; if (d.mv.x > k.W - d.mv.w * .2 && d.mv.dir > 0) d.mv.dir = -1; if (d.mv.x < -d.mv.w * .8 && d.mv.dir < 0) d.mv.dir = 1; }
    d.falling.forEach(f => { f.vy += 900 * dt; f.y += f.vy * dt; });
    d.falling = d.falling.filter(f => f.y - d.cam < k.H + 60);
    const want = Math.min(0, (d.stack[d.stack.length - 1].y - k.H * .45));
    d.cam = k.lerp(d.cam, want, Math.min(1, dt * 4));
  },
  draw(ctx, k){
    const d = k.data, hue = d.stack ? (d.stack.length * 6) % 360 : 240;
    const g = ctx.createLinearGradient(0, 0, 0, k.H); g.addColorStop(0, 'hsl(' + hue + ',50%,18%)'); g.addColorStop(1, 'hsl(' + ((hue + 60) % 360) + ',50%,35%)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, k.W, k.H);
    if (!d.stack) return;
    const block = (b) => { const y = b.y - d.cam; ctx.fillStyle = b.c; ctx.fillRect(b.x, y, b.w, BH); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(b.x, y, b.w, 4); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(b.x, y + BH - 4, b.w, 4); ctx.fillStyle = 'rgba(255,255,255,.18)'; for (let wx = b.x + 6; wx < b.x + b.w - 8; wx += 14) ctx.fillRect(wx, y + 9, 6, 8); };
    d.stack.forEach(block); d.falling.forEach(block); if (d.mv) block(d.mv);
    ctx.fillStyle = '#2a1a3a'; ctx.fillRect(0, d.stack[0].y - d.cam + BH, k.W, k.H);
    if (d.perf >= 2){ ctx.fillStyle = '#ffff55'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center'; ctx.fillText('PERFECT x' + d.perf, k.W/2, 30); ctx.textAlign = 'left'; }
  },
  down(x, y, k){ drop(k); },
  key(key, k){ if (key === ' ' || key === 'Enter' || key === 'ArrowDown') drop(k); }
});
})();
