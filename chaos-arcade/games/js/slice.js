/* Slice Frenzy */
(function(){
const FRUITS = [['🍉','#ff4a5a'],['🍊','#ffa020'],['🍎','#ff3030'],['🍋','#ffe040'],['🥝','#8ad040'],['🍇','#9a40d0'],['🍍','#ffd040'],['🍑','#ffaa80']];
function toss(k){
  const d = k.data, n = k.ri(1, Math.min(5, 1 + Math.floor(k.t / 15)));
  for (let i=0;i<n;i++){
    const bomb = Math.random() < Math.min(.28, .1 + k.t / 300);
    const f = k.pick(FRUITS), x = k.rand(k.W * .15, k.W * .85);
    d.items.push({ x, y:k.H + 30, vx:(k.W/2 - x) * k.rand(.3, .9), vy:-k.rand(k.H * 1.05, k.H * 1.35), r:24, e:bomb ? '💣' : f[0], c:f[1], bomb, rot:0, vr:k.rand(-4, 4), cut:false });
  }
}
function segHit(ax, ay, bx, by, cx, cy, r){ const dx = bx - ax, dy = by - ay, L = dx*dx + dy*dy || 1; let t = ((cx - ax) * dx + (cy - ay) * dy) / L; t = Math.max(0, Math.min(1, t)); return Math.hypot(ax + dx*t - cx, ay + dy*t - cy) < r; }
Kit.def({
  aspect:.7, winAt:150,
  how:'Swipe (drag) through fruit to slice it. Slice several in one swipe for a COMBO bonus. Never slice a 💣 bomb. Let 3 fruits fall and it is over.',
  init(k){ const d = k.data; d.items = []; d.halves = []; d.trail = []; d.next = .5; d.lives = 3; d.swipeCuts = 0; k.lives(3); },
  update(dt, k){
    const d = k.data, g = k.H * 1.2;
    d.next -= dt; if (d.next <= 0){ toss(k); d.next = Math.max(.6, 1.6 - k.t * .015); }
    d.items.forEach(it => { it.vy += g * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.vr * dt; });
    d.halves.forEach(h => { h.vy += g * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.vr * dt; });
    d.items = d.items.filter(it => {
      if (it.y > k.H + 60 && it.vy > 0){ if (!it.bomb && !it.cut){ d.lives--; k.lives(Math.max(0, d.lives)); k.bad(); k.shake(5); k.combo = 0; if (d.lives <= 0) k.over({ lines:['🍉 Dropped too much fruit'] }); } return false; }
      return !it.cut;
    });
    d.halves = d.halves.filter(h => h.y < k.H + 60);
    d.trail = d.trail.filter(p => performance.now() - p.t < 120);
  },
  draw(ctx, k){
    const d = k.data;
    ctx.fillStyle = '#3a2416'; ctx.fillRect(0, 0, k.W, k.H);
    ctx.fillStyle = '#4a2e1c'; for (let y = 0; y < k.H; y += 40) ctx.fillRect(0, y, k.W, 3);
    if (!d.items) return;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    d.halves.forEach(h => { ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.rot); ctx.fillStyle = h.c; ctx.beginPath(); ctx.arc(0, 0, 20, h.side ? 0 : Math.PI, h.side ? Math.PI : Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(-18, -2, 36, 3); ctx.restore(); });
    d.items.forEach(it => { ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot); ctx.font = '44px sans-serif'; ctx.fillText(it.e, 0, 2); if (it.bomb){ ctx.fillStyle = Math.floor(k.t * 10) % 2 ? '#ff3a3a' : '#ffff55'; ctx.fillRect(10, -26, 6, 6); } ctx.restore(); });
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    if (d.trail.length > 1){ ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round'; for (let i=1;i<d.trail.length;i++){ ctx.lineWidth = i * 1.2; ctx.beginPath(); ctx.moveTo(d.trail[i-1].x, d.trail[i-1].y); ctx.lineTo(d.trail[i].x, d.trail[i].y); ctx.stroke(); } }
  },
  down(x, y, k){ k.data.trail = [{ x, y, t:performance.now() }]; k.data.swipeCuts = 0; },
  move(x, y, k, pressed){
    if (!pressed) return; const d = k.data, last = d.trail[d.trail.length - 1];
    d.trail.push({ x, y, t:performance.now() }); if (d.trail.length > 10) d.trail.shift();
    if (!last) return;
    d.items.forEach(it => {
      if (it.cut || !segHit(last.x, last.y, x, y, it.x, it.y, it.r)) return;
      it.cut = true;
      if (it.bomb){ k.boom(); k.flash('#ffffff', .4); k.shake(16, .5); k.burst(it.x, it.y, ['#ffffff','#ffaa00','#555555'], 40, 400); return k.over({ title:'💣 KABOOM!', lines:['🍉 You sliced a bomb'] }); }
      d.swipeCuts++;
      k.hit(10, it.x, it.y - 20); k.burst(it.x, it.y, [it.c, '#ffffff'], 14); k.beep(700 + d.swipeCuts * 120, .05, 'sawtooth', .05);
      for (const side of [0, 1]) d.halves.push({ x:it.x, y:it.y, vx:it.vx + (side ? 80 : -80), vy:it.vy * .5, rot:it.rot, vr:side ? 4 : -4, c:it.c, side });
      if (d.swipeCuts >= 3){ k.add(d.swipeCuts * 10, it.x, it.y - 50, '#ff55ff'); k.pop(k.W/2, k.H/3, d.swipeCuts + ' FRUIT COMBO!', '#ff55ff'); k.shake(4); }
    });
  },
  up(x, y, k){ k.data.swipeCuts = 0; }
});
})();
