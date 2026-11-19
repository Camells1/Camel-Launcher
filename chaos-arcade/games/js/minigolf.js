/* Mini Golf (9 holes). Coordinates are in a 300 × 420 field, scaled to the canvas. */
(function(){
const HOLES = [
  { par:2, ball:[150,370], hole:[150,70], walls:[] },
  { par:2, ball:[60,370], hole:[240,70], walls:[[0,200,180,18]] },
  { par:3, ball:[150,380], hole:[150,60], walls:[[60,140,180,16],[0,260,200,16],[110,260,0,0]] },
  { par:3, ball:[40,380], hole:[260,380], walls:[[120,90,18,330]] },
  { par:2, ball:[150,380], hole:[150,60], walls:[[80,180,40,40],[180,180,40,40],[130,260,40,30]] },
  { par:3, ball:[260,390], hole:[40,50], walls:[[0,120,220,16],[80,250,220,16]] },
  { par:3, ball:[150,390], hole:[150,210], walls:[[90,150,120,14],[90,150,14,120],[196,150,14,120],[90,256,45,14],[165,256,45,14]] },
  { par:2, ball:[40,40], hole:[260,380], walls:[[60,100,240,14],[0,220,240,14],[60,330,14,90]] },
  { par:4, ball:[150,395], hole:[150,40], walls:[[0,320,250,14],[50,240,250,14],[0,160,250,14],[50,90,250,14]] }
];
function load(k){ const d = k.data, h = HOLES[d.hole]; d.b = { x:h.ball[0], y:h.ball[1], vx:0, vy:0 }; d.strokes = 0; d.sunk = false; d.trail = []; k.hud('hl', '⛳ ' + (d.hole + 1) + '/9 · par ' + h.par); }
function S(k){ return Math.min(k.W / 300, k.H / 420); }
Kit.def({
  aspect:300 / 420, winAt:700,
  how:'Drag BACK from the ball (like a slingshot) and release to putt. A longer drag = a harder shot. Bounce off walls, sink it in the hole. Under par earns big bonuses. 9 holes, max 8 strokes each. Fewer total strokes = higher score.',
  init(k){ const d = k.data; d.hole = 0; d.total = 0; d.card = []; load(k); },
  update(dt, k){
    const d = k.data, h = HOLES[d.hole], b = d.b; if (!b) return;
    const steps = 4;
    for (let s=0;s<steps;s++){
      const t = dt / steps; b.x += b.vx * t; b.y += b.vy * t;
      const sp = Math.hypot(b.vx, b.vy), fr = Math.max(0, sp - 160 * t);
      if (sp > 0){ b.vx *= fr / sp; b.vy *= fr / sp; }
      if (b.x < 8){ b.x = 8; b.vx = Math.abs(b.vx) * .8; k.beep(220, .02); } if (b.x > 292){ b.x = 292; b.vx = -Math.abs(b.vx) * .8; k.beep(220, .02); }
      if (b.y < 8){ b.y = 8; b.vy = Math.abs(b.vy) * .8; k.beep(220, .02); } if (b.y > 412){ b.y = 412; b.vy = -Math.abs(b.vy) * .8; k.beep(220, .02); }
      h.walls.forEach(([wx, wy, ww, wh]) => {
        if (!ww || !wh) return;
        const cx = k.clamp(b.x, wx, wx + ww), cy = k.clamp(b.y, wy, wy + wh), dx = b.x - cx, dy = b.y - cy, dist = Math.hypot(dx, dy);
        if (dist < 7){ if (Math.abs(dx) > Math.abs(dy)){ b.vx = -b.vx * .8; b.x = cx + Math.sign(dx || 1) * 7; } else { b.vy = -b.vy * .8; b.y = cy + Math.sign(dy || 1) * 7; } k.beep(220, .02); }
      });
      const hd = Math.hypot(b.x - h.hole[0], b.y - h.hole[1]);
      if (hd < 10 && Math.hypot(b.vx, b.vy) < 330 && !d.sunk){ sink(k); return; }
      if (hd < 16 && !d.sunk){ b.vx += (h.hole[0] - b.x) * 2 * t; b.vy += (h.hole[1] - b.y) * 2 * t; }
    }
    if (Math.hypot(b.vx, b.vy) > 30) { d.trail.push([b.x, b.y]); if (d.trail.length > 20) d.trail.shift(); } else d.trail = [];
    if (!d.sunk && Math.hypot(b.vx, b.vy) < 4 && d.strokes >= 8){ d.sunk = true; d.strokes = 9; finishHole(k, 'MAX STROKES'); }
  },
  draw(ctx, k){
    const d = k.data; if (!d.b){ ctx.fillStyle = '#1f6a2a'; ctx.fillRect(0, 0, k.W, k.H); return; }
    const s = S(k), ox = (k.W - 300 * s) / 2, oy = (k.H - 420 * s) / 2, h = HOLES[d.hole];
    ctx.fillStyle = '#1a3a1a'; ctx.fillRect(0, 0, k.W, k.H);
    ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
    for (let y=0;y<420;y+=30){ ctx.fillStyle = (y / 30) % 2 ? '#3fae4a' : '#47b852'; ctx.fillRect(0, y, 300, 30); }
    ctx.fillStyle = '#7a4a1a'; h.walls.forEach(([x, y, w, hh]) => { if (w && hh){ ctx.fillRect(x, y, w, hh); ctx.fillStyle = '#9a6a3a'; ctx.fillRect(x, y, w, 3); ctx.fillStyle = '#7a4a1a'; } });
    ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, 294, 414);
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(h.hole[0], h.hole[1], 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ddd'; ctx.fillRect(h.hole[0] - 1, h.hole[1] - 40, 2, 40); ctx.fillStyle = '#ff3a3a'; ctx.beginPath(); ctx.moveTo(h.hole[0] + 1, h.hole[1] - 40); ctx.lineTo(h.hole[0] + 22, h.hole[1] - 33); ctx.lineTo(h.hole[0] + 1, h.hole[1] - 26); ctx.fill();
    d.trail.forEach(([x, y], i) => { ctx.globalAlpha = i / 40; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1;
    if (!d.sunk){ ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(d.b.x, d.b.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1; ctx.stroke(); }
    if (d.aim){
      const dx = d.aim.sx - d.aim.x, dy = d.aim.sy - d.aim.y, p = Math.min(1, Math.hypot(dx, dy) / (140 / s * s));
      ctx.strokeStyle = 'hsl(' + (120 - p * 120) + ',90%,55%)'; ctx.lineWidth = 3; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(d.b.x, d.b.y); ctx.lineTo(d.b.x + dx / s * .9, d.b.y + dy / s * .9); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace'; ctx.fillText('Strokes: ' + d.strokes + ' · Total: ' + d.total, 8, 18);
  },
  down(x, y, k){ const d = k.data; if (d.sunk || Math.hypot(d.b.vx, d.b.vy) > 4) return; d.aim = { sx:x, sy:y, x, y }; },
  move(x, y, k, p){ if (p && k.data.aim){ k.data.aim.x = x; k.data.aim.y = y; } },
  up(x, y, k){
    const d = k.data, a = d.aim; d.aim = null; if (!a) return;
    const s = S(k), dx = (a.sx - x) / s, dy = (a.sy - y) / s, len = Math.hypot(dx, dy); if (len < 8) return;
    const p = Math.min(1, len / 140) * 620;
    d.b.vx = dx / len * p; d.b.vy = dy / len * p; d.strokes++; k.beep(300 + p / 3, .05, 'triangle', .1);
  }
});
function sink(k){ const d = k.data; d.sunk = true; k.good(); finishHole(k, ''); }
function finishHole(k, why){
  const d = k.data, h = HOLES[d.hole], diff = d.strokes - h.par;
  const name = why || (d.strokes === 1 ? 'HOLE IN ONE!' : diff <= -2 ? 'EAGLE!' : diff === -1 ? 'BIRDIE!' : diff === 0 ? 'PAR' : diff === 1 ? 'BOGEY' : '+' + diff);
  const pts = Math.max(0, 100 + (h.par - d.strokes) * 60 + (d.strokes === 1 ? 200 : 0));
  d.total += d.strokes; d.card.push(diff < 0 ? '🟩' : diff === 0 ? '⬜' : '🟥');
  const s = S(k), ox = (k.W - 300 * s) / 2, oy = (k.H - 420 * s) / 2;
  k.add(pts, ox + h.hole[0] * s, oy + h.hole[1] * s - 20, diff < 0 ? '#55ff55' : '#ffff55'); k.pop(k.W/2, k.H/2, name, diff < 0 ? '#55ff55' : diff === 0 ? '#ffffff' : '#ff7a7a');
  if (diff < 0){ k.flash('#55ff55', .15); k.burst(ox + h.hole[0] * s, oy + h.hole[1] * s, ['#ffffff','#55ff55','#ffff55'], 26); }
  setTimeout(() => { if (!k.running) return; d.hole++; if (d.hole >= HOLES.length){ const par = HOLES.reduce((a, x) => a + x.par, 0); return k.over({ lines:[d.card.join(''), d.total + ' strokes (par ' + par + ', ' + (d.total - par >= 0 ? '+' : '') + (d.total - par) + ')'] }); } load(k); }, 1300);
}
})();
