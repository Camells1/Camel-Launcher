/* Aim Trainer */
(function(){
function spawn(k){ const d = k.data, r = Math.max(14, 34 - k.t * .4); d.targets.push({ x:k.rand(r + 6, k.W - r - 6), y:k.rand(r + 6, k.H - r - 6), r, life:Math.max(.9, 2 - k.t * .025), age:0, gold:Math.random() < .08 }); }
Kit.def({
  aspect:.8, winAt:1500,
  how:'Tap or click the targets before they shrink away. Hitting the bullseye pays more. Misses (clicking empty space) and vanished targets break your combo. 30 seconds. 🟡 Golden targets are worth triple.',
  init(k){ const d = k.data; d.targets = []; d.next = 0; d.hits = 0; d.shots = 0; d.rings = []; k.timer(30); },
  update(dt, k){
    const d = k.data; d.next -= dt;
    if (d.next <= 0 || !d.targets.length){ spawn(k); d.next = Math.max(.3, .75 - k.t * .012); }
    d.targets.forEach(t => { t.age += dt; if (t.age >= t.life){ t.dead = true; k.miss(); k.beep(140, .05); } });
    d.targets = d.targets.filter(t => !t.dead);
    d.rings.forEach(r => r.t += dt); d.rings = d.rings.filter(r => r.t < .4);
    k.hud('acc', '🎯 ' + (d.shots ? Math.round(100 * d.hits / d.shots) : 100) + '%');
  },
  draw(ctx, k){
    const d = k.data;
    ctx.fillStyle = '#0d1a1f'; ctx.fillRect(0, 0, k.W, k.H);
    ctx.strokeStyle = '#13303a'; ctx.lineWidth = 1; for (let x = 0; x < k.W; x += 30){ ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, k.H); ctx.stroke(); } for (let y = 0; y < k.H; y += 30){ ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(k.W, y); ctx.stroke(); }
    if (!d.targets) return;
    d.targets.forEach(t => {
      const s = 1 - t.age / t.life, r = t.r * (t.age < .12 ? t.age / .12 : 1) * (.4 + .6 * s);
      [['#ffffff', 1], [t.gold ? '#ffd700' : '#ff3a3a', .75], ['#ffffff', .5], [t.gold ? '#ffd700' : '#ff3a3a', .25]].forEach(([c, f]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(t.x, t.y, r * f, 0, Math.PI * 2); ctx.fill(); });
      t.cr = r;
    });
    d.rings.forEach(r => { ctx.strokeStyle = 'rgba(85,255,255,' + (1 - r.t / .4) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(r.x, r.y, 10 + r.t * 120, 0, Math.PI * 2); ctx.stroke(); });
  },
  down(x, y, k){
    const d = k.data; d.shots++;
    let hit = null;
    for (let i=d.targets.length-1;i>=0;i--){ const t = d.targets[i]; if (Math.hypot(x - t.x, y - t.y) <= (t.cr || t.r) + 4){ hit = t; break; } }
    if (!hit){ k.miss(); k.beep(120, .05, 'sawtooth', .05); k.pop(x, y, 'MISS', '#ff5555'); return; }
    d.hits++; hit.dead = true; d.targets = d.targets.filter(t => !t.dead);
    const prec = 1 - Math.min(1, Math.hypot(x - hit.x, y - hit.y) / (hit.cr || hit.r));
    const base = Math.round((10 + prec * 20 + (1 - hit.age / hit.life) * 10) * (hit.gold ? 3 : 1));
    k.hit(base, x, y - 14); d.rings.push({ x:hit.x, y:hit.y, t:0 });
    k.burst(hit.x, hit.y, hit.gold ? ['#ffd700','#ffffff'] : ['#ff3a3a','#ffffff'], 10);
    k.beep(prec > .7 ? 1300 : 900, .05, 'square', .06);
    if (prec > .8) k.pop(x, y + 20, 'BULLSEYE!', '#55ffff');
  },
  timeUp(k){ const d = k.data; k.over({ lines:['⭕ ' + d.hits + ' hits · ' + (d.shots ? Math.round(100 * d.hits / d.shots) : 0) + '% accuracy'] }); }
});
})();
