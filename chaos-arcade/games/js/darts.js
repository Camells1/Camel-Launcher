/* Dart Toss */
(function(){
const ORDER = [20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5], ROUNDS = 5;
function score(dx, dy, R){
  const r = Math.hypot(dx, dy) / R;
  if (r < .05) return [50, 'BULLSEYE!']; if (r < .11) return [25, 'BULL']; if (r > 1) return [0, 'MISS'];
  let a = Math.atan2(dx, -dy) * 180 / Math.PI; a = (a + 360 + 9) % 360;
  const n = ORDER[Math.floor(a / 18)];
  if (r > .9) return [n * 2, 'DOUBLE ' + n]; if (r > .54 && r < .62) return [n * 3, 'TRIPLE ' + n];
  return [n, String(n)];
}
Kit.def({
  aspect:.85, winAt:300,
  how:'The aiming reticle wobbles around the board. Tap (or press SPACE) to throw where it is RIGHT NOW. Inner ring = triple, outer ring = double, center = 50. 5 rounds of 3 darts. Your hand gets shakier every round.',
  init(k){ const d = k.data; d.round = 1; d.dart = 0; d.darts = []; d.hist = []; d.rt = 0; d.wob = 0; d.cool = 0; k.hud('rd', '🎯 round 1/' + ROUNDS + ' · dart 1/3'); },
  update(dt, k){ const d = k.data; d.wob += dt; d.cool -= dt; },
  draw(ctx, k){
    const d = k.data, cx = k.W/2, cy = k.H * .48, R = Math.min(k.W, k.H) * .4;
    ctx.fillStyle = '#2a1a12'; ctx.fillRect(0, 0, k.W, k.H);
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx, cy, R * 1.12, 0, Math.PI * 2); ctx.fill();
    for (let i=0;i<20;i++){
      const a0 = (i * 18 - 99) * Math.PI / 180, a1 = a0 + 18 * Math.PI / 180, dark = i % 2 === 0;
      const ring = (r0, r1, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, cy, R * r1, a0, a1); ctx.arc(cx, cy, R * r0, a1, a0, true); ctx.closePath(); ctx.fill(); };
      ring(.11, .54, dark ? '#1a1a1a' : '#f0e0c0'); ring(.54, .62, dark ? '#d02a2a' : '#2a9a3a'); ring(.62, .9, dark ? '#1a1a1a' : '#f0e0c0'); ring(.9, 1, dark ? '#d02a2a' : '#2a9a3a');
      ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(R * .1) + 'px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const am = (a0 + a1) / 2; ctx.fillText(ORDER[i], cx + Math.cos(am) * R * 1.06, cy + Math.sin(am) * R * 1.06);
    }
    ctx.fillStyle = '#2a9a3a'; ctx.beginPath(); ctx.arc(cx, cy, R * .11, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#d02a2a'; ctx.beginPath(); ctx.arc(cx, cy, R * .05, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    if (!d.darts) return;
    d.darts.forEach(p => { ctx.fillStyle = '#ffd23a'; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 10, p.y + 14); ctx.stroke(); ctx.fillStyle = '#ff55ff'; ctx.fillRect(p.x + 8, p.y + 12, 6, 6); });
    const amp = R * (.18 + d.round * .07), t = d.wob;
    d.ax = cx + Math.sin(t * 1.7) * amp + Math.sin(t * 4.3) * amp * .25; d.ay = cy + Math.cos(t * 1.3) * amp + Math.sin(t * 3.1) * amp * .3;
    ctx.strokeStyle = '#55ffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(d.ax, d.ay, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(d.ax - 18, d.ay); ctx.lineTo(d.ax + 18, d.ay); ctx.moveTo(d.ax, d.ay - 18); ctx.lineTo(d.ax, d.ay + 18); ctx.stroke();
  },
  down(x, y, k){ throwDart(k); },
  key(key, k){ if (key === ' ' || key === 'Enter') throwDart(k); }
});
function throwDart(k){
  const d = k.data; if (d.cool > 0 || d.ax == null) return; d.cool = .35;
  const cx = k.W/2, cy = k.H * .48, R = Math.min(k.W, k.H) * .4;
  const [pts, name] = score(d.ax - cx, d.ay - cy, R);
  d.darts.push({ x:d.ax, y:d.ay }); d.dart++;
  k.beep(pts ? 800 : 150, .06, 'square', .08); k.shake(pts >= 40 ? 6 : 2, .1);
  if (pts){ k.add(pts, d.ax, d.ay - 20, pts >= 40 ? '#55ffff' : '#ffff55'); k.burst(d.ax, d.ay, ['#ffd23a','#ffffff'], pts >= 40 ? 18 : 6); } else k.pop(d.ax, d.ay - 20, 'MISS', '#ff5555');
  if (pts >= 40){ k.pop(k.W/2, 40, name, '#55ffff'); k.good(); }
  d.hist.push(pts >= 50 ? '🎯' : pts >= 30 ? '🟩' : pts >= 10 ? '🟨' : pts ? '⬜' : '❌');
  if (d.dart >= 3){ d.dart = 0; d.round++; setTimeout(() => { d.darts = []; }, 600); if (d.round > ROUNDS) return k.over({ lines:[d.hist.join('')], delay:700 }); }
  k.hud('rd', '🎯 round ' + Math.min(ROUNDS, d.round) + '/' + ROUNDS + ' · dart ' + (d.dart + 1) + '/3');
}
})();
