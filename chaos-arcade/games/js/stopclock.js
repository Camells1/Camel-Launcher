/* Stop the Clock */
(function(){
const ROUNDS = 5;
function round(k){
  const d = k.data; d.target = [10, 5, 7.77, 3.33, 12.34][d.r]; d.hidden = d.r >= 2; d.run = false; d.v = 0;
  k.root.innerHTML = '<div class="kmsg">Round ' + (d.r + 1) + '/' + ROUNDS + ' · stop at exactly <b style="color:#ffff55">' + d.target.toFixed(2) + 's</b>' + (d.hidden ? '<br>⚠️ the clock vanishes after 1.5 seconds!' : '') + '</div>' +
    '<div class="kbig" id="scT" style="font-size:clamp(56px,18vw,96px);font-variant-numeric:tabular-nums;color:#55ffff">0.00</div>' +
    '<button class="btn green big block" id="scB">▶ START</button><div class="kmsg" id="scM"></div>';
  k.root.querySelector('#scB').addEventListener('click', () => press(k));
}
function press(k){
  const d = k.data; if (!k.running) return;
  const b = k.root.querySelector('#scB');
  if (!d.run && !d.doneRound){ d.run = true; d.t0 = performance.now(); b.textContent = '⏹ STOP'; b.className = 'btn red big block'; k.beep(600, .05); return; }
  if (d.run){
    d.run = false; d.doneRound = true; const v = (performance.now() - d.t0) / 1000, off = Math.abs(v - d.target);
    k.root.querySelector('#scT').textContent = v.toFixed(2); k.root.querySelector('#scT').style.color = off < .05 ? '#55ff55' : off < .2 ? '#ffff55' : '#ff5555';
    const pts = Math.max(0, Math.round(500 - off * 1000)); k.add(pts, 200, 60, off < .05 ? '#55ff55' : '#ffff55');
    d.res.push(off); d.marks.push(off < .02 ? '🎯' : off < .1 ? '🟩' : off < .3 ? '🟨' : '🟥');
    const verdict = off < .01 ? '🤯 PERFECT TIMING!' : off < .05 ? '🔥 Incredible!' : off < .15 ? '👍 Close!' : off < .4 ? '😅 Not bad' : '🐢 Way off';
    k.root.querySelector('#scM').innerHTML = verdict + ' · off by ' + off.toFixed(3) + 's · +' + pts;
    if (off < .05){ k.good(); k.flash('#55ff55', .15); } else k.beep(200, .1);
    b.textContent = d.r + 1 >= ROUNDS ? '🏁 FINISH' : 'NEXT ▶'; b.className = 'btn big block';
    return;
  }
  d.doneRound = false; d.r++;
  if (d.r >= ROUNDS){ const avg = d.res.reduce((a, b2) => a + b2, 0) / d.res.length; return k.over({ lines:[d.marks.join(''), 'Average error ' + avg.toFixed(3) + 's'] }); }
  round(k);
}
Kit.def({
  dom:true, winAt:1500,
  how:'Press START, then press STOP when you think the exact target time has passed. 5 rounds with different targets. From round 3 the clock HIDES after 1.5 seconds, so you need your inner clock. Closer = more points (max 500 per round). Space = start/stop.',
  init(k){ const d = k.data; d.r = 0; d.res = []; d.marks = []; d.doneRound = false; round(k); },
  update(dt, k){ const d = k.data; if (!d.run) return; const v = (performance.now() - d.t0) / 1000, el = k.root.querySelector('#scT'); if (el) el.textContent = d.hidden && v > 1.5 ? '?.??' : v.toFixed(2); },
  key(key, k){ if (key === ' ' || key === 'Enter') press(k); }
});
})();
