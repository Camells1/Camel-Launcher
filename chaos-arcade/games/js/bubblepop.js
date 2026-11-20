/* Bubble Pop */
(function(){
const COLS = ['#ff5577','#55ddff','#77ff66','#ffdd44','#bb77ff'];
Kit.def({
  aspect:.66, winAt:600,
  how:'Bubbles float up from the bottom. Tap to pop them before they escape off the top. Pop the SAME color several times in a row for a color streak bonus. Small bubbles are worth more. 💣 bubbles cost you a life. Let 10 escape and it is over.',
  init(k){ const d = k.data; d.b = []; d.next = 0; d.esc = 0; d.lastC = -1; d.streak = 0; d.pops = []; k.hud('esc', '🫧 0/10 escaped'); },
  update(dt, k){
    const d = k.data; d.next -= dt;
    if (d.next <= 0){ const r = k.rand(16, 34), bomb = Math.random() < Math.min(.15, .03 + k.t / 400); d.b.push({ x:k.rand(r, k.W - r), y:k.H + r, r, c:k.ri(0, COLS.length - 1), vy:k.rand(50, 90) * (1 + k.t / 50), wob:Math.random() * 6, bomb }); d.next = Math.max(.18, .7 - k.t * .008); }
    d.b.forEach(b => { b.y -= b.vy * dt; b.wob += dt * 3; b.x += Math.sin(b.wob) * 20 * dt; if (b.y < -b.r){ b.gone = true; if (!b.bomb){ d.esc++; k.miss(); k.beep(150, .06); k.hud('esc', '🫧 ' + d.esc + '/10 escaped'); } } });
    d.b = d.b.filter(b => !b.gone); d.pops.forEach(p => p.t += dt); d.pops = d.pops.filter(p => p.t < .3);
    if (d.esc >= 10) k.over({ lines:['🫧 Best color streak: ' + d.best] });
  },
  draw(ctx, k){
    const d = k.data, g = ctx.createLinearGradient(0, 0, 0, k.H); g.addColorStop(0, '#0a2a5a'); g.addColorStop(1, '#1a6a9a'); ctx.fillStyle = g; ctx.fillRect(0, 0, k.W, k.H);
    if (!d.b) return;
    d.b.forEach(b => {
      if (b.bomb){ ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.font = (b.r) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('💣', b.x, b.y); return; }
      ctx.fillStyle = COLS[b.c] + '55'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = COLS[b.c]; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(b.x - b.r * .35, b.y - b.r * .35, b.r * .2, 0, Math.PI * 2); ctx.fill();
    });
    d.pops.forEach(p => { ctx.strokeStyle = COLS[p.c]; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + p.t * 80, 0, Math.PI * 2); ctx.stroke(); });
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    if (d.streak >= 2){ ctx.fillStyle = COLS[d.lastC]; ctx.font = 'bold 15px monospace'; ctx.fillText('COLOR STREAK x' + d.streak, 8, 20); }
  },
  down(x, y, k){
    const d = k.data; let hit = null;
    for (let i=d.b.length-1;i>=0;i--){ const b = d.b[i]; if (Math.hypot(b.x - x, b.y - y) < b.r + 8){ hit = b; break; } }
    if (!hit){ k.miss(); return; }
    hit.gone = true; d.b = d.b.filter(b => !b.gone);
    if (hit.bomb){ d.esc += 3; k.hud('esc', '🫧 ' + d.esc + '/10 escaped'); k.boom(); k.shake(10); k.flash('#ff3a3a', .2); k.combo = 0; d.streak = 0; return; }
    d.streak = hit.c === d.lastC ? d.streak + 1 : 1; d.lastC = hit.c; d.best = Math.max(d.best || 0, d.streak);
    const pts = Math.round((40 - hit.r) * (1 + (d.streak - 1) * .5));
    k.hit(pts, hit.x, hit.y - 20); d.pops.push({ x:hit.x, y:hit.y, r:hit.r, c:hit.c, t:0 }); k.burst(hit.x, hit.y, [COLS[hit.c], '#ffffff'], 8);
    k.beep(600 + d.streak * 80, .04, 'sine', .1);
    if (d.streak === 5){ k.pop(k.W/2, k.H/3, 'COLOR FRENZY!', COLS[hit.c]); k.flash(COLS[hit.c], .1); }
  }
});
})();
