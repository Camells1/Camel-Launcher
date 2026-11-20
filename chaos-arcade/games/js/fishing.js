/* Fishing Frenzy */
(function(){
const FISH = [['🐟',10],['🐠',20],['🐡',30],['🦑',50],['🦈',100],['🐋',200]];
const CASTS = 3, MAXD = 3000;
function cast(k){ const d = k.data; d.phase = 'down'; d.depth = 0; d.hx = k.W/2; d.caught = []; d.items = []; d.next = 0; d.cast++; k.hud('cs', '🎣 cast ' + d.cast + '/' + CASTS); }
function populate(k){
  const d = k.data, base = d.depth + k.H;
  while (d.next < base){
    d.next += k.rand(40, 80); const zone = Math.min(FISH.length - 1, Math.floor(d.next / 520)), r = Math.random();
    if (r < .14 && d.next > 300) d.items.push({ y:d.next, x:k.rand(20, k.W - 20), vx:k.rand(30, 70) * (Math.random() < .5 ? -1 : 1), e:'🪼', jelly:true });
    else { const f = FISH[Math.max(0, zone - (Math.random() < .5 ? 1 : 0))]; d.items.push({ y:d.next, x:k.rand(20, k.W - 20), vx:k.rand(40, 110) * (Math.random() < .5 ? -1 : 1), e:f[0], v:f[1] }); }
  }
}
Kit.def({
  aspect:.62, winAt:600,
  how:'Your hook sinks on its own. On the way DOWN, dodge the fish to get deeper (deeper water = better fish). Touch a fish (or hit bottom) and the hook starts reeling UP: now steer to catch as many fish as you can. ' + '🪼 Jellyfish on the way up zap your line and you lose half your catch. 3 casts. Drag or ←/→ to steer.',
  init(k){ const d = k.data; d.cast = 0; d.total = 0; cast(k); },
  update(dt, k){
    const d = k.data; if (d.phase === 'wait') return;
    if (k.kL) d.hx -= 300 * dt; if (k.kR) d.hx += 300 * dt; d.hx = k.clamp(d.hx, 12, k.W - 12);
    const sp = d.phase === 'down' ? 260 : -420;
    d.depth = Math.max(0, d.depth + sp * dt); populate(k);
    const hy = k.H * (d.phase === 'down' ? .35 : .6);
    d.items.forEach(it => { it.x += it.vx * dt; if (it.x < 14 || it.x > k.W - 14) it.vx = -it.vx; });
    for (const it of d.items){
      if (it.got) continue;
      const sy = it.y - d.depth;
      if (Math.abs(sy - hy) < 18 && Math.abs(it.x - d.hx) < 22){
        if (d.phase === 'down'){ if (!it.jelly){ d.phase = 'up'; k.beep(600, .1, 'triangle', .08); k.pop(d.hx, hy - 30, 'REEL IN!', '#55ffff'); k.shake(3); } }
        else if (it.jelly){ it.got = true; const lost = Math.floor(d.caught.length / 2); d.caught.splice(0, lost); k.bad(); k.shake(8); k.flash('#ff55ff', .15); k.pop(d.hx, hy - 30, 'ZAP! −' + lost + ' fish', '#ff55ff'); }
        else { it.got = true; d.caught.push(it); k.hit(it.v, it.x, sy - 20); k.beep(500 + it.v * 3, .05); k.burst(it.x, sy, ['#55ffff','#ffffff'], 8); }
      }
    }
    if (d.phase === 'down' && d.depth >= MAXD){ d.phase = 'up'; k.pop(k.W/2, hy, 'MAX DEPTH!', '#ffd700'); }
    if (d.phase === 'up' && d.depth <= 0){
      const haul = d.caught.reduce((a, f) => a + f.v, 0); d.total += haul;
      k.pop(k.W/2, k.H * .3, d.caught.length + ' fish · ' + haul + ' pts', '#55ff55'); k.good();
      d.phase = 'wait';
      setTimeout(() => { if (!k.running) return; if (d.cast >= CASTS) return k.over({ lines:['🎣 3 casts complete'] }); cast(k); }, 1300);
    }
  },
  draw(ctx, k){
    const d = k.data, dep = d.depth || 0;
    const t = Math.min(1, dep / MAXD);
    const g = ctx.createLinearGradient(0, 0, 0, k.H); g.addColorStop(0, 'rgb(' + Math.round(40 - 35*t) + ',' + Math.round(140 - 120*t) + ',' + Math.round(220 - 160*t) + ')'); g.addColorStop(1, 'rgb(' + Math.round(20 - 15*t) + ',' + Math.round(80 - 70*t) + ',' + Math.round(160 - 120*t) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, k.W, k.H);
    if (dep < k.H){ ctx.fillStyle = '#9adfff'; ctx.fillRect(0, 0, k.W, Math.max(0, k.H * .2 - dep)); ctx.font = '40px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⛵', k.W/2, k.H * .2 - dep - 4); ctx.textAlign = 'left'; }
    if (!d.items) return;
    ctx.fillStyle = 'rgba(255,255,255,.12)'; for (let i=0;i<20;i++){ const y = ((i * 97 - dep) % k.H + k.H) % k.H; ctx.fillRect((i * 53) % k.W, y, 3, 3); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '28px sans-serif';
    d.items.forEach(it => { if (it.got) return; const y = it.y - dep; if (y < -30 || y > k.H + 30) return; ctx.save(); ctx.translate(it.x, y); if (it.vx > 0) ctx.scale(-1, 1); ctx.fillText(it.e, 0, 0); ctx.restore(); });
    const hy = k.H * (d.phase === 'down' ? .35 : .6);
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(k.W/2, 0); ctx.lineTo(d.hx, hy); ctx.stroke();
    ctx.font = '16px sans-serif'; d.caught.slice(-8).forEach((f, i) => ctx.fillText(f.e, d.hx + (i % 2 ? 8 : -8), hy + 16 + i * 10));
    ctx.fillStyle = '#ccc'; ctx.fillRect(d.hx - 2, hy - 8, 4, 12); ctx.strokeStyle = '#ccc'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(d.hx - 5, hy + 4, 5, 0, Math.PI); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace'; ctx.fillText('⬇ ' + Math.round(dep / 10) + 'm  ' + (d.phase === 'down' ? 'DODGE FISH' : d.phase === 'up' ? 'CATCH FISH!' : ''), 8, 18);
  },
  down(x, y, k){ k.data.hx = x; }, move(x, y, k){ k.data.hx = x; },
  key(key, k){ if (key === 'ArrowLeft' || key === 'a') k.kL = true; if (key === 'ArrowRight' || key === 'd') k.kR = true; },
  keyup(key, k){ if (key === 'ArrowLeft' || key === 'a') k.kL = false; if (key === 'ArrowRight' || key === 'd') k.kR = false; }
});
})();
