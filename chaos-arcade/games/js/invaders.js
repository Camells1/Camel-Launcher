/* Alien Rush */
(function(){
const ALIEN = [['..a..a..','...aa...','..aaaa..','.aa.a.a.','aaaaaaaa','a.aaaa.a','a.a..a.a','...aa...'],['..aaaa..','.aaaaaa.','aa.aa.aa','aaaaaaaa','..a..a..','.a.aa.a.','a......a','.a....a.']];
const COLORS = ['#ff55ff','#55ffff','#55ff55','#ffff55','#ffaa00'];
function sprite(ctx, rows, x, y, s, c){ ctx.fillStyle = c; rows.forEach((r, j) => { for (let i=0;i<r.length;i++) if (r[i] === 'a') ctx.fillRect(x + i*s, y + j*s, s, s); }); }
function wave(k){
  const d = k.data, cols = 7, rows = Math.min(6, 3 + Math.floor(d.wave / 2));
  d.aliens = [];
  for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) d.aliens.push({ x:30 + c * (k.W - 60) / cols, y:50 + r * 32, alive:true, row:r, v:(rows - r) * 10 + 10 });
  d.dir = 1; d.step = 0; d.adv = Math.min(140, 35 + d.wave * 12);
}
Kit.def({
  aspect:.75, winAt:1000,
  how:'Drag or use ←/→ to move. Your ship fires automatically. Blast the aliens before they reach you, dodge their lasers, and shoot the 🛸 UFO for a bonus. Every wave gets faster.',
  init(k){ const d = k.data; d.px = k.W/2; d.lives = 3; d.wave = 1; d.shots = []; d.zaps = []; d.cool = 0; d.inv = 0; d.ufo = null; wave(k); k.lives(3); k.hud('wave', '🌊 1'); },
  update(dt, k){
    const d = k.data;
    if (k.kL) d.px -= 300 * dt; if (k.kR) d.px += 300 * dt;
    d.px = k.clamp(d.px, 20, k.W - 20); d.inv -= dt;
    d.cool -= dt; if (d.cool <= 0){ d.shots.push({ x:d.px, y:k.H - 50 }); d.cool = .32; k.beep(900, .03, 'square', .03); }
    d.shots.forEach(s => s.y -= 480 * dt); d.shots = d.shots.filter(s => s.y > -10);
    const live = d.aliens.filter(a => a.alive);
    let edge = false;
    live.forEach(a => { a.x += d.dir * d.adv * dt; if (a.x < 14 || a.x > k.W - 30) edge = true; });
    if (edge){ d.dir = -d.dir; live.forEach(a => { a.y += 14; a.x += d.dir * 4; }); }
    if (Math.random() < dt * (0.8 + d.wave * .25) && live.length){ const a = k.pick(live); d.zaps.push({ x:a.x + 12, y:a.y + 20 }); }
    d.zaps.forEach(z => z.y += (180 + d.wave * 12) * dt);
    if (!d.ufo && Math.random() < dt * .08) d.ufo = { x:-40, y:28 };
    if (d.ufo){ d.ufo.x += 110 * dt; if (d.ufo.x > k.W + 40) d.ufo = null; }
    for (const s of d.shots){
      for (const a of live){ if (a.alive && s.x > a.x && s.x < a.x + 26 && s.y > a.y && s.y < a.y + 22){ a.alive = false; s.y = -99; k.hit(a.v, a.x + 12, a.y); k.burst(a.x + 12, a.y + 10, [COLORS[a.row % 5], '#ffffff'], 12); k.beep(220, .06, 'sawtooth', .05); k.shake(2, .06); break; } }
      if (d.ufo && Math.abs(s.x - d.ufo.x) < 22 && Math.abs(s.y - d.ufo.y) < 12){ k.add(300, d.ufo.x, d.ufo.y, '#ff55ff'); k.burst(d.ufo.x, d.ufo.y, ['#ff55ff','#ffffff'], 30, 300); k.good(); k.flash('#ff55ff', .15); d.ufo = null; s.y = -99; }
    }
    for (const z of d.zaps){ if (d.inv <= 0 && Math.abs(z.x - d.px) < 16 && z.y > k.H - 50 && z.y < k.H - 26){ z.y = 9999; hurt(k); } }
    d.zaps = d.zaps.filter(z => z.y < k.H);
    if (live.some(a => a.alive && a.y > k.H - 80)){ d.lives = 0; return end(k); }
    if (!d.aliens.some(a => a.alive)){ d.wave++; k.add(250 * d.wave, k.W/2, k.H/2, '#55ff55'); k.good(); k.flash('#55ff55', .15); k.hud('wave', '🌊 ' + d.wave); wave(k); }
  },
  draw(ctx, k){
    const d = k.data;
    ctx.fillStyle = '#05030f'; ctx.fillRect(0, 0, k.W, k.H);
    for (let i=0;i<50;i++){ ctx.fillStyle = i % 7 ? '#333' : '#888'; ctx.fillRect((i * 73) % k.W, ((i * 131) + k.t * 20 * (1 + i % 3)) % k.H, 2, 2); }
    if (!d.aliens) return;
    const fr = Math.floor(k.t * 3) % 2;
    d.aliens.forEach(a => { if (a.alive) sprite(ctx, ALIEN[(a.row + fr) % 2], a.x, a.y, 3.2, COLORS[a.row % 5]); });
    if (d.ufo){ ctx.fillStyle = '#ff55ff'; ctx.fillRect(d.ufo.x - 20, d.ufo.y - 5, 40, 10); ctx.fillStyle = '#ffccff'; ctx.fillRect(d.ufo.x - 9, d.ufo.y - 12, 18, 8); }
    ctx.fillStyle = '#ffff55'; d.shots.forEach(s => ctx.fillRect(s.x - 1.5, s.y, 3, 12));
    ctx.fillStyle = '#ff5555'; d.zaps.forEach(z => ctx.fillRect(z.x - 2, z.y, 4, 10));
    if (d.inv <= 0 || Math.floor(k.t * 12) % 2){
      ctx.fillStyle = '#55ff55'; ctx.fillRect(d.px - 18, k.H - 34, 36, 12); ctx.fillRect(d.px - 6, k.H - 44, 12, 10); ctx.fillRect(d.px - 2, k.H - 50, 4, 6);
    }
  },
  move(x, y, k){ k.data.px = x; },
  down(x, y, k){ k.data.px = x; },
  key(key, k){ if (key === 'ArrowLeft' || key === 'a') k.kL = true; if (key === 'ArrowRight' || key === 'd') k.kR = true; },
  keyup(key, k){ if (key === 'ArrowLeft' || key === 'a') k.kL = false; if (key === 'ArrowRight' || key === 'd') k.kR = false; }
});
function hurt(k){ const d = k.data; d.lives--; d.inv = 1.5; k.lives(Math.max(0, d.lives)); k.boom(); k.shake(10); k.flash('#ff0000', .2); k.burst(d.px, k.H - 30, ['#55ff55','#ffffff','#ff5555'], 24); k.combo = 0; if (d.lives <= 0) end(k); }
function end(k){ k.over({ lines:['👾 Reached wave ' + k.data.wave] }); }
})();
