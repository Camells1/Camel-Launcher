/* Egg Catcher */
(function(){
Kit.def({
  aspect:.7, winAt:300,
  how:'Drag or use ←/→ to move your basket. Catch 🥚 eggs (+10) and 🌟 golden eggs (+50). Dodge 💣 bombs. Every missed egg or caught bomb costs a heart. It keeps getting faster.',
  init(k){ const d = k.data; d.bx = k.W/2; d.tx = k.W/2; d.items = []; d.next = .6; d.lives = 3; d.splats = []; d.hens = [0, 1, 2, 3].map(i => ({ x:(i + .5) * k.W / 4, bob:Math.random() * 6 })); k.lives(3); },
  update(dt, k){
    const d = k.data, bw = 74;
    if (k.kL) d.tx -= 420 * dt; if (k.kR) d.tx += 420 * dt;
    d.tx = k.clamp(d.tx, bw/2, k.W - bw/2); d.bx = k.lerp(d.bx, d.tx, Math.min(1, dt * 16));
    const speed = 1 + k.t / 35;
    d.next -= dt;
    if (d.next <= 0){ d.next = Math.max(.32, .95 / speed) * k.rand(.7, 1.3); const h = k.pick(d.hens), r = Math.random(); d.items.push({ x:h.x, y:60, vy:k.rand(120, 170) * speed, t:r < .07 ? 'gold' : r < .22 + Math.min(.12, k.t / 500) ? 'bomb' : 'egg', rot:0 }); h.lay = .3; }
    d.hens.forEach(h => { h.lay = Math.max(0, (h.lay || 0) - dt); });
    const by = k.H - 50;
    d.items.forEach(it => {
      it.y += it.vy * dt; it.rot += dt * 4;
      if (!it.done && it.y > by - 10 && it.y < by + 16 && Math.abs(it.x - d.bx) < bw/2){
        it.done = true;
        if (it.t === 'bomb'){ d.lives--; k.lives(Math.max(0, d.lives)); k.boom(); k.shake(12); k.flash('#ff3a3a', .2); k.combo = 0; k.burst(it.x, by, ['#555','#ffaa00','#fff'], 24); }
        else { k.hit(it.t === 'gold' ? 50 : 10, it.x, by - 30); k.beep(it.t === 'gold' ? 1100 : 500 + k.combo * 15, .05); if (it.t === 'gold'){ k.coin(); k.burst(it.x, by, ['#ffd700','#fff'], 14); } }
      }
      if (!it.done && it.y > k.H - 18){ it.done = true; if (it.t !== 'bomb'){ d.lives--; k.lives(Math.max(0, d.lives)); k.bad(); k.miss(); d.splats.push({ x:it.x, t:1.5 }); k.shake(4); } }
    });
    d.items = d.items.filter(it => !it.done);
    d.splats.forEach(s => s.t -= dt); d.splats = d.splats.filter(s => s.t > 0);
    if (d.lives <= 0) k.over({ lines:['🥚 Survived ' + Math.floor(k.t) + ' seconds'] });
  },
  draw(ctx, k){
    const d = k.data;
    const g = ctx.createLinearGradient(0, 0, 0, k.H); g.addColorStop(0, '#87ceeb'); g.addColorStop(1, '#ffe8a0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, k.W, k.H);
    ctx.fillStyle = '#8a5a2a'; ctx.fillRect(0, 58, k.W, 8);
    ctx.fillStyle = '#5fbf3a'; ctx.fillRect(0, k.H - 18, k.W, 18);
    if (!d.hens) return;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    d.hens.forEach(h => { ctx.font = '34px sans-serif'; ctx.fillText('🐔', h.x, 40 - (h.lay ? 6 : 0) + Math.sin(k.t * 3 + h.x) * 2); });
    d.splats.forEach(s => { ctx.globalAlpha = Math.min(1, s.t); ctx.fillStyle = '#fff'; ctx.fillRect(s.x - 14, k.H - 22, 28, 6); ctx.fillStyle = '#ffcc00'; ctx.fillRect(s.x - 5, k.H - 24, 10, 7); ctx.globalAlpha = 1; });
    d.items.forEach(it => { ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(Math.sin(it.rot) * .3); ctx.font = '28px sans-serif'; ctx.fillText(it.t === 'bomb' ? '💣' : it.t === 'gold' ? '🌟' : '🥚', 0, 0); ctx.restore(); });
    const by = k.H - 50;
    ctx.fillStyle = '#a0682a'; ctx.fillRect(d.bx - 37, by, 74, 26); ctx.fillStyle = '#c88a4a'; for (let x = -33; x < 33; x += 10) ctx.fillRect(d.bx + x, by + 4, 6, 18);
    ctx.fillStyle = '#7a4a1a'; ctx.fillRect(d.bx - 40, by - 4, 80, 6);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  },
  down(x, y, k){ k.data.tx = x; }, move(x, y, k){ k.data.tx = x; },
  key(key, k){ if (key === 'ArrowLeft' || key === 'a') k.kL = true; if (key === 'ArrowRight' || key === 'd') k.kR = true; },
  keyup(key, k){ if (key === 'ArrowLeft' || key === 'a') k.kL = false; if (key === 'ArrowRight' || key === 'd') k.kR = false; }
});
})();
