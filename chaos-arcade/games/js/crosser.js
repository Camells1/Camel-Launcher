/* Road Crosser */
(function(){
const COLS = 9;
function makeLane(k, row){
  const d = k.data;
  if (row < 3) return { row, type:'grass', items:[], trees:[] };
  const r = Math.random(), diff = Math.min(1, row / 120);
  let type = r < .4 ? 'road' : r < .62 ? 'river' : r < .72 + diff * .05 ? 'rail' : 'grass';
  if (d.lanes.length && d.lanes[d.lanes.length - 1].type === 'river' && type === 'river' && Math.random() < .3) type = 'grass';
  const lane = { row, type, items:[], dir:Math.random() < .5 ? 1 : -1, speed:0, trees:[], warn:0, timer:k.rand(2, 5) };
  if (type === 'road'){ lane.speed = k.rand(1.6, 3.2) + diff * 2.5; const n = k.ri(1, 3); for (let i=0;i<n;i++) lane.items.push({ x:i * (COLS / n) + k.rand(0, 2), w:Math.random() < .2 ? 2.2 : 1.3, c:k.pick(['#ff5555','#55aaff','#ffff55','#ff55ff','#ffffff']) }); }
  if (type === 'river'){ lane.speed = k.rand(1, 2.2) + diff * 1.5; const n = k.ri(2, 3); for (let i=0;i<n;i++) lane.items.push({ x:i * (COLS / n) + k.rand(0, 1), w:k.rand(2, 3.2) }); }
  if (type === 'grass'){ for (let c=0;c<COLS;c++) if (Math.random() < .18 && c !== 4) lane.trees.push(c); }
  return lane;
}
function lane(k, row){ const d = k.data; while (d.lanes.length <= row + 15) d.lanes.push(makeLane(k, d.lanes.length)); return d.lanes[row]; }
function hop(k, dx, dy){
  const d = k.data; if (d.dead || d.hopT > 0) return;
  const nx = d.px + dx, ny = d.py + dy;
  if (nx < 0 || nx >= COLS || ny < 0) return;
  const L = lane(k, ny); if (L.type === 'grass' && L.trees.includes(Math.round(nx))) { k.beep(150, .04); return; }
  d.px = Math.round(nx); d.py = ny; d.hopT = .1; d.face = dx || d.face;
  k.beep(600 + (dy > 0 ? 100 : 0), .03, 'square', .04);
  if (d.py > d.max){ k.add((d.py - d.max) * 10); d.max = d.py; k.hud('row', '🐸 ' + d.max); d.idle = 0; }
}
function die(k, why){ const d = k.data; if (d.dead) return; d.dead = true; k.boom(); k.shake(12, .4); k.flash(why === 'water' ? '#3a6aff' : '#ff3a3a', .25); k.over({ lines:['🐸 Crossed ' + d.max + ' lanes · ' + { car:'flattened by traffic', water:'forgot how to swim', train:'met a train', eagle:'too slow, the eagle got you' }[why]] }); }
Kit.def({
  aspect:.7, winAt:500,
  how:'Tap or swipe up to hop forward, swipe left / right / down to sidestep. Arrow keys / WASD work too. Ride the logs over rivers. Trains flash a red warning first. Do not dawdle or the eagle swoops in.',
  init(k){ const d = k.data; d.lanes = []; d.px = 4; d.py = 0; d.max = 0; d.cam = 0; d.hopT = 0; d.dead = false; d.face = 1; d.idle = 0; d.coins = []; lane(k, 0); k.hud('row', '🐸 0'); },
  update(dt, k){
    const d = k.data; d.hopT -= dt; d.idle += dt;
    const cs = k.W / COLS;
    for (let r = Math.max(0, d.py - 6); r < d.py + 14; r++){
      const L = lane(k, r);
      if (L.type === 'road' || L.type === 'river') L.items.forEach(it => { it.x += L.dir * L.speed * dt; if (it.x > COLS + 1) it.x -= COLS + it.w + 2; if (it.x < -it.w - 1) it.x += COLS + it.w + 2; });
      if (L.type === 'rail'){ L.timer -= dt; if (L.timer < 1.2 && L.warn === 0){ L.warn = 1; if (Math.abs(r - d.py) < 6) k.beep(900, .15, 'square', .04); } if (L.timer <= 0 && !L.train){ L.train = { x:L.dir > 0 ? -12 : COLS + 1 }; } if (L.train){ L.train.x += L.dir * 26 * dt; if (L.train.x > COLS + 14 || L.train.x < -26){ L.train = null; L.warn = 0; L.timer = k.rand(3, 6); } } }
    }
    const L = lane(k, d.py);
    if (L.type === 'road' && L.items.some(it => d.px + .8 > it.x && d.px + .2 < it.x + it.w)) return die(k, 'car');
    if (L.type === 'rail' && L.train && d.px + .8 > L.train.x && d.px + .2 < L.train.x + 12) return die(k, 'train');
    if (L.type === 'river' && d.hopT <= 0){
      const log = L.items.find(it => d.px + .5 > it.x && d.px + .5 < it.x + it.w);
      if (!log) return die(k, 'water');
      d.px += L.dir * L.speed * dt; if (d.px < -.4 || d.px > COLS - .6) return die(k, 'water');
    } else if (L.type !== 'river') d.px = Math.round(d.px * 4) / 4;
    const want = d.py - 3; d.cam = Math.max(d.cam, k.lerp(d.cam, want, dt * 2));
    d.cam += dt * Math.min(.9, .15 + d.max / 200);
    if (d.py < d.cam - 1.3 || d.idle > 9) return die(k, 'eagle');
  },
  draw(ctx, k){
    const d = k.data, cs = k.W / COLS, rows = Math.ceil(k.H / cs) + 1;
    ctx.fillStyle = '#3a8a2a'; ctx.fillRect(0, 0, k.W, k.H);
    if (!d.lanes || !d.lanes.length) return;
    const Y = (row) => k.H - (row - d.cam + 1) * cs - cs * .5;
    for (let r = Math.floor(d.cam) - 1; r < d.cam + rows; r++){
      if (r < 0) continue;
      const L = lane(k, r), y = Y(r);
      ctx.fillStyle = { grass:(r % 2 ? '#4aa83a' : '#56b444'), road:'#3a3a44', river:'#2a6ae0', rail:'#5a4a3a' }[L.type]; ctx.fillRect(0, y, k.W, cs);
      if (L.type === 'road'){ ctx.fillStyle = '#ddd'; for (let x = 0; x < k.W; x += cs) ctx.fillRect(x + cs*.2, y + cs*.48, cs*.4, 2); L.items.forEach(it => { ctx.fillStyle = it.c; ctx.fillRect(it.x * cs, y + cs*.18, it.w * cs, cs*.64); ctx.fillStyle = '#9adfff'; ctx.fillRect(it.x * cs + (L.dir > 0 ? it.w*cs*.6 : it.w*cs*.1), y + cs*.25, it.w*cs*.3, cs*.5); ctx.fillStyle = '#111'; ctx.fillRect(it.x*cs + 3, y + cs*.1, 8, 4); ctx.fillRect(it.x*cs + it.w*cs - 11, y + cs*.1, 8, 4); }); }
      if (L.type === 'river'){ ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(((k.t * 30 * L.dir) % cs + cs) % cs, y + cs*.3, k.W, 2); L.items.forEach(it => { ctx.fillStyle = '#8a5a2a'; ctx.fillRect(it.x * cs, y + cs*.15, it.w * cs, cs*.7); ctx.fillStyle = '#a87a4a'; ctx.fillRect(it.x * cs, y + cs*.15, it.w * cs, 4); }); }
      if (L.type === 'rail'){ ctx.fillStyle = '#888'; ctx.fillRect(0, y + cs*.3, k.W, 3); ctx.fillRect(0, y + cs*.65, k.W, 3); if (L.warn && Math.floor(k.t * 6) % 2){ ctx.fillStyle = '#ff2020'; ctx.fillRect(4, y + 4, 10, 10); ctx.fillRect(k.W - 14, y + 4, 10, 10); } if (L.train){ ctx.fillStyle = '#c03030'; ctx.fillRect(L.train.x * cs, y + cs*.1, 12 * cs, cs*.8); ctx.fillStyle = '#ffd23a'; for (let i=0;i<12;i+=2) ctx.fillRect((L.train.x + i + .3) * cs, y + cs*.25, cs*.6, cs*.3); } }
      if (L.type === 'grass') L.trees.forEach(c => { ctx.fillStyle = '#5a3a1a'; ctx.fillRect(c*cs + cs*.4, y + cs*.55, cs*.2, cs*.4); ctx.fillStyle = '#1f6a1f'; ctx.fillRect(c*cs + cs*.15, y + cs*.05, cs*.7, cs*.6); });
    }
    const hopY = d.hopT > 0 ? Math.sin(d.hopT / .1 * Math.PI) * cs * .3 : 0;
    const px = d.px * cs, py = Y(d.py) - hopY;
    ctx.fillStyle = '#55ff55'; ctx.fillRect(px + cs*.15, py + cs*.2, cs*.7, cs*.6);
    ctx.fillStyle = '#2a9a2a'; ctx.fillRect(px + cs*.1, py + cs*.65, cs*.2, cs*.2); ctx.fillRect(px + cs*.7, py + cs*.65, cs*.2, cs*.2);
    ctx.fillStyle = '#fff'; ctx.fillRect(px + cs*.22, py + cs*.12, cs*.2, cs*.2); ctx.fillRect(px + cs*.58, py + cs*.12, cs*.2, cs*.2);
    ctx.fillStyle = '#000'; ctx.fillRect(px + cs*.28, py + cs*.16, cs*.1, cs*.1); ctx.fillRect(px + cs*.64, py + cs*.16, cs*.1, cs*.1);
    if (d.idle > 6){ ctx.fillStyle = 'rgba(0,0,0,' + Math.min(.5, (d.idle - 6) / 6) + ')'; ctx.fillRect(0, 0, k.W, k.H); ctx.fillStyle = '#ffaa00'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center'; ctx.fillText('🦅 MOVE IT!', k.W/2, 40); ctx.textAlign = 'left'; }
  },
  down(x, y, k){ k.data.tap = { x, y, t:performance.now() }; },
  up(x, y, k){ const t = k.data.tap; if (t && Math.hypot(x - t.x, y - t.y) < 25) hop(k, 0, 1); k.data.tap = null; },
  swipe(dir, k){ k.data.tap = null; if (dir === 'up') hop(k, 0, 1); else if (dir === 'down') hop(k, 0, -1); else hop(k, dir === 'left' ? -1 : 1, 0); },
  key(key, k){ const m = { ArrowUp:[0,1], w:[0,1], ' ':[0,1], ArrowDown:[0,-1], s:[0,-1], ArrowLeft:[-1,0], a:[-1,0], ArrowRight:[1,0], d:[1,0] }[key]; if (m) hop(k, m[0], m[1]); }
});
})();
