/* Piano Tiles */
(function(){
const MELODY = [0,2,4,5,7,5,4,2,0,4,7,12,11,9,7,5,4,2,4,0,7,9,7,5,4,5,4,2,0];
function note(k, i){ const f = 261.63 * Math.pow(2, MELODY[i % MELODY.length] / 12); k.sfx.tone(f, .3, 'triangle', .14); k.sfx.tone(f * 2, .15, 'sine', .04); }
Kit.def({
  aspect:.6, winAt:100,
  how:'Tap the BLACK tiles as they scroll down, in order, from the bottom up. Tapping a white tile or letting a black one escape ends the game. Each tile plays the next note of the song. Keys D F J K work on desktop.',
  init(k){ const d = k.data; d.rows = []; d.off = 0; d.speed = 2.2; d.n = 0; d.fail = null; for (let i=0;i<6;i++) d.rows.push({ col:k.ri(0, 3), done:i < 1 }); d.rows[0].done = true; d.started = false; },
  update(dt, k){
    const d = k.data, rh = k.H / 4;
    if (!d.started || d.fail) return;
    d.speed = 2.2 + d.n * .045;
    d.off += d.speed * rh * dt;
    while (d.off >= rh){ d.off -= rh; const gone = d.rows.shift(); d.rows.push({ col:k.ri(0, 3), done:false }); if (!gone.done){ d.fail = { row:-1, col:gone.col, missed:true }; k.bad(); k.shake(10); return end(k); } }
  },
  draw(ctx, k){
    const d = k.data, rh = k.H / 4, cw = k.W / 4;
    ctx.fillStyle = '#f4f4f8'; ctx.fillRect(0, 0, k.W, k.H);
    ctx.strokeStyle = '#ccd'; ctx.lineWidth = 1; for (let c=1;c<4;c++){ ctx.beginPath(); ctx.moveTo(c*cw, 0); ctx.lineTo(c*cw, k.H); ctx.stroke(); }
    if (!d.rows) return;
    d.rows.forEach((r, i) => {
      const y = k.H - (i + 1) * rh + d.off;
      ctx.strokeStyle = '#dde'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(k.W, y); ctx.stroke();
      ctx.fillStyle = r.done ? 'rgba(80,80,120,.25)' : '#15151f'; ctx.fillRect(r.col * cw + 1, y + 1, cw - 2, rh - 2);
      if (!r.done && i === firstOpen(d)){ ctx.fillStyle = '#55ffff'; ctx.fillRect(r.col * cw + 1, y + rh - 6, cw - 2, 5); }
    });
    if (d.fail && !d.fail.missed){ const y = k.H - (d.fail.row + 1) * rh + d.off; ctx.fillStyle = Math.floor(k.t * 8) % 2 ? '#ff3a3a' : '#ff9a9a'; ctx.fillRect(d.fail.col * cw, y, cw, rh); }
    if (!d.started){ ctx.fillStyle = '#fff'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center'; const r = d.rows[firstOpen(d)]; ctx.fillText('START', r.col * cw + cw/2, k.H - rh * (firstOpen(d) + .5) + d.off); ctx.textAlign = 'left'; }
    ctx.fillStyle = '#ff3a6a'; ctx.font = 'bold 34px monospace'; ctx.textAlign = 'center'; ctx.fillText(d.n, k.W/2, 44); ctx.textAlign = 'left';
  },
  down(x, y, k){ const d = k.data, rh = k.H / 4; tap(k, Math.floor(x / (k.W / 4)), Math.floor((k.H - y + d.off) / rh)); },
  key(key, k){ const c = { d:0, f:1, j:2, k:3, 1:0, 2:1, 3:2, 4:3 }[key.toLowerCase()]; if (c != null){ const d = k.data; tap(k, c, firstOpen(d)); } }
});
function firstOpen(d){ return d.rows.findIndex(r => !r.done); }
function tap(k, col, row){
  const d = k.data; if (d.fail) return;
  const i = firstOpen(d); if (i < 0) return;
  if (row !== i || d.rows[i].col !== col){
    if (row === i || (row >= 0 && row < d.rows.length && d.rows[row].col !== col)){ d.fail = { row, col }; k.bad(); k.shake(10); k.flash('#ff3a3a', .15); return end(k); }
    return;
  }
  d.rows[i].done = true; d.started = true; d.n++; note(k, d.n - 1);
  k.hit(1, (col + .5) * k.W / 4, k.H - (row + .5) * k.H / 4 + d.off);
  if (d.n % 25 === 0){ k.pop(k.W/2, k.H/2, 'FASTER!', '#ff55ff'); k.flash('#55ffff', .1); }
}
function end(k){ const d = k.data; k.over({ score:d.n, label:d.n + ' tiles', lines:['🎹 ' + d.n + ' tiles · top speed ' + d.speed.toFixed(1) + ' rows/s'], delay:800 }); }
})();
