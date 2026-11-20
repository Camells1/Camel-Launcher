/* Rhythm Tap: hit the falling notes on the line, 4 lanes */
(function(){
const LANES = 4, COLORS = ['#ff5a8a','#ffd23a','#55ffaa','#55aaff'], KEYS = ['d','f','j','k'];
const SCALE = [262, 294, 330, 392, 440, 523, 587, 659];      // C major pentatonic-ish melody notes
const WIN_PERFECT = .06, WIN_GOOD = .13;                     // seconds
function hitY(k){ return k.H - 90; }
function schedule(k){
  const d = k.data, beat = 60 / d.bpm;
  while (d.nextT < k.t + 3){
    const bar = Math.floor(d.beatN / 8), pat = d.beatN % 8, dens = Math.min(.95, .45 + bar * .04);
    if (Math.random() < dens || pat === 0){
      let lane = d.lastLane; if (Math.random() < .8) while (lane === d.lastLane) lane = Math.floor(Math.random() * LANES);
      d.notes.push({ t:d.nextT, lane, f:SCALE[(lane * 2 + (bar % 3)) % SCALE.length] });
      d.lastLane = lane;
      if (bar >= 4 && Math.random() < .12 + bar * .01){ let l2 = (lane + 2) % LANES; d.notes.push({ t:d.nextT, lane:l2, f:SCALE[(l2 * 2 + 1) % SCALE.length] }); }
    }
    d.beatN++; d.nextT += beat / (d.beatN > 64 && d.beatN % 2 ? 2 : 1) ;
    if (d.beatN % 16 === 0) d.bpm = Math.min(200, d.bpm + 6);
  }
}
function tap(k, lane){
  const d = k.data; if (d.dead) return; d.press[lane] = .12;
  let best = null, bd = 1;
  d.notes.forEach(n => { if (!n.done && n.lane === lane){ const dt = Math.abs(n.t - k.t); if (dt < bd){ bd = dt; best = n; } } });
  const x = (lane + .5) * k.W / LANES, y = hitY(k);
  if (!best || bd > WIN_GOOD){ k.beep(110, .05, 'square', .03); d.judge = { t:'✖', c:'#ff5555', life:.4 }; k.miss(); d.hp = Math.max(0, d.hp - 4); return; }
  best.done = true; k.beep(best.f, .14, 'triangle', .1);
  if (bd <= WIN_PERFECT){ k.hit(20, x, y - 30); d.judge = { t:'PERFECT!', c:'#ffd23a', life:.45 }; d.perfect++; k.burst(x, y, [COLORS[lane], '#ffffff'], 10); d.hp = Math.min(100, d.hp + 3); }
  else { k.hit(10, x, y - 30); d.judge = { t:'GOOD', c:'#55ffff', life:.45 }; d.good++; k.burst(x, y, [COLORS[lane]], 5); d.hp = Math.min(100, d.hp + 1.5); }
}
Kit.def({
  dom:false, aspect:.62, winAt:1500, medals:[800, 1500, 3000], waitInput:true, waitText:'🎵 TAP A LANE', waitHint:'or press D F J K',
  how:'Notes fall in 4 lanes. Tap the lane (or press D F J K) the moment a note crosses the glowing line. PERFECT timing scores double, and long streaks build a combo multiplier. Missed notes and wrong taps drain your health bar. The beat keeps speeding up.',
  init(k){ const d = k.data; d.notes = []; d.bpm = 100; d.nextT = 2.2; d.beatN = 0; d.lastLane = 0; d.hp = 100; d.press = [0,0,0,0]; d.judge = null; d.perfect = 0; d.good = 0; d.missed = 0; d.dead = false; },
  update(dt, k){
    const d = k.data; schedule(k);
    d.press = d.press.map(p => Math.max(0, p - dt)); if (d.judge){ d.judge.life -= dt; if (d.judge.life <= 0) d.judge = null; }
    d.notes.forEach(n => { if (!n.done && k.t - n.t > WIN_GOOD){ n.done = true; n.miss = true; d.missed++; d.hp -= 8; k.miss(); d.judge = { t:'MISS', c:'#ff5555', life:.4 }; } });
    d.notes = d.notes.filter(n => k.t - n.t < 1);
    d.hp = Math.min(100, d.hp + dt * .5);
    if (d.hp <= 0 && !d.dead){ d.dead = true; k.bad(); k.shake(8); setTimeout(() => k.over({ lines:['🎯 ' + d.perfect + ' perfect · ' + d.good + ' good · ' + d.missed + ' missed', '🎵 Reached ' + d.bpm + ' BPM'] }), 600); }
    k.hud('bp', '🎵 ' + d.bpm + ' BPM');
  },
  draw(ctx, k){
    const d = k.data, W = k.W, H = k.H, lw = W / LANES, hy = hitY(k), speed = H * .55;   // px per second
    ctx.fillStyle = '#0c0820'; ctx.fillRect(0, 0, W, H);
    if (!d || !d.notes) return;
    for (let i=0;i<LANES;i++){ ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'; ctx.fillRect(i * lw, 0, lw, H);
      if (d.press[i] > 0){ const g = ctx.createLinearGradient(0, hy - 200, 0, hy); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, COLORS[i] + '66'); ctx.fillStyle = g; ctx.fillRect(i * lw, hy - 200, lw, 200); } }
    // beat lines
    const beat = 60 / d.bpm; ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1;
    for (let b = Math.ceil(k.t / beat) * beat; b < k.t + 2; b += beat){ const y = hy - (b - k.t) * speed; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = '#fff'; ctx.fillRect(0, hy - 3, W, 6); ctx.shadowColor = '#fff'; ctx.shadowBlur = 12; ctx.fillRect(0, hy - 1, W, 2); ctx.shadowBlur = 0;
    d.notes.forEach(n => { if (n.done && !n.miss) return; const y = hy - (n.t - k.t) * speed; if (y < -30 || y > H + 30) return; const x = n.lane * lw + 8, w = lw - 16;
      ctx.globalAlpha = n.miss ? .25 : 1; ctx.fillStyle = '#000'; ctx.fillRect(x - 3, y - 13, w + 6, 26); ctx.fillStyle = COLORS[n.lane]; ctx.fillRect(x, y - 10, w, 20); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x, y - 10, w, 5); ctx.globalAlpha = 1; });
    for (let i=0;i<LANES;i++){ const x = i * lw + lw / 2; ctx.fillStyle = d.press[i] > 0 ? COLORS[i] : '#1d1838'; ctx.strokeStyle = COLORS[i]; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, hy + 45, Math.min(26, lw * .32), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = d.press[i] > 0 ? '#000' : '#fff'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(KEYS[i].toUpperCase(), x, hy + 45); }
    if (d.judge){ ctx.globalAlpha = Math.min(1, d.judge.life * 3); ctx.fillStyle = d.judge.c; ctx.font = 'bold 30px monospace'; ctx.textAlign = 'center'; ctx.fillText(d.judge.t, W / 2, H * .35); ctx.globalAlpha = 1; }
    ctx.fillStyle = '#000'; ctx.fillRect(10, 10, W - 20, 12); ctx.fillStyle = d.hp > 50 ? '#55ff55' : d.hp > 25 ? '#ffd23a' : '#ff5555'; ctx.fillRect(12, 12, (W - 24) * Math.max(0, d.hp) / 100, 8);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  },
  down(x, y, k){ tap(k, Math.max(0, Math.min(LANES - 1, Math.floor(x / (k.W / LANES))))); },
  key(key, k){ const i = KEYS.indexOf(key.toLowerCase()); if (i >= 0) tap(k, i); else if (/^[1-4]$/.test(key)) tap(k, +key - 1); }
});
})();
