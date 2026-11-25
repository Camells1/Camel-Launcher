(async () => {
  const { $, $$, esc } = Site;
  const canvas = $('#wheel'), ctx = canvas.getContext('2d');
  const COLORS = ['#5bae3c', '#7a5230', '#5865f2', '#fe2c55', '#d79b1c', '#25a5b8', '#8b5cf6', '#3e7f27', '#c2410c', '#0e7490'];
  const MAX_SLICES = 16;
  const GOLD = ['#f6c744', '#d79b1c', '#ffe066', '#b7791f'];
  let all = [], slices = [], angle = 0, spinning = false, sound = true, audio, golden = false;

  // ---------- drawing ----------
  function draw() {
    const W = canvas.width, R = W / 2 - 12, c = W / 2;
    ctx.clearRect(0, 0, W, W);
    ctx.save(); ctx.translate(c, c); ctx.rotate(angle);
    const n = Math.max(slices.length, 1), arc = Math.PI * 2 / n;
    for (let i = 0; i < n; i++) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, i * arc, (i + 1) * arc); ctx.closePath();
      const pal = golden ? GOLD : COLORS;
      ctx.fillStyle = slices.length ? pal[i % pal.length] : '#2b3039';
      if (slices.length > 1 && n % pal.length === 1 && i === n - 1) ctx.fillStyle = pal[2]; // no same-colour neighbours
      ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#0c0d10'; ctx.stroke();
      ctx.save(); ctx.rotate(i * arc + arc / 2);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      const fs = Math.max(16, Math.min(34, 380 / n + 10));
      ctx.font = `${fs}px "Press Start 2P", monospace`;
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3;
      let label = slices.length ? slices[i].title : 'No clips yet!';
      const maxW = R * .62;
      while (ctx.measureText(label).width > maxW && label.length > 3) label = label.slice(0, -2).trimEnd() + '…';
      if (label.endsWith('……')) label = label.slice(0, -1);
      ctx.fillText(label, R - 26, 0);
      ctx.restore();
    }
    ctx.restore();
    // outer ring with "lights"
    ctx.beginPath(); ctx.arc(c, c, R + 4, 0, Math.PI * 2); ctx.lineWidth = 12; ctx.strokeStyle = '#0c0d10'; ctx.stroke();
  }

  function pickSlices() {
    // With lots of clips, show a random set of 16 on the wheel each round.
    const pool = [...all];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    slices = pool.slice(0, MAX_SLICES);
  }

  // ---------- sound ----------
  function tick() {
    if (!sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'square'; o.frequency.value = 700 + Math.random() * 200;
      g.gain.setValueAtTime(.06, audio.currentTime); g.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + .05);
      o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + .05);
    } catch {}
  }
  function ding() {
    if (!sound || !audio) return;
    [660, 880, 1320].forEach((f, i) => {
      const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + i * .09;
      o.type = 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(.07, t); g.gain.exponentialRampToValueAtTime(.0001, t + .18);
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + .2);
    });
  }

  // ---------- spin ----------
  function spin() {
    if (spinning) return;
    if (!all.length) { $('#spinResult').textContent = 'No clips on the wheel yet. Be the first to upload one!'; return; }
    closeModal();
    if (all.length > MAX_SLICES) { pickSlices(); draw(); }
    spinning = true; $('#spinBtn').disabled = true; $('#spinResult').textContent = '';
    golden = Math.random() < 1 / 30; // rare golden spin!
    $('.wheel-box').classList.toggle('golden', golden);
    if (golden) $('#spinResult').textContent = '✨ GOLDEN SPIN… ✨';
    const n = slices.length, arc = Math.PI * 2 / n;
    const win = Math.floor(Math.random() * n);
    // Pointer is at the top (-90°). Land somewhere inside the winning slice, not on its edge.
    const inSlice = (0.15 + Math.random() * 0.7) * arc;
    const target = -Math.PI / 2 - (win * arc + inSlice);
    const start = angle;
    const turns = 6 + Math.floor(Math.random() * 3);
    let end = target + turns * Math.PI * 2;
    while (end < start + turns * Math.PI * 2) end += Math.PI * 2;
    const dur = 5200 + Math.random() * 1200, t0 = performance.now();
    let lastSlice = -1;
    const frame = now => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 4);
      angle = start + (end - start) * e;
      draw();
      const at = Math.floor((((-Math.PI / 2 - angle) % (Math.PI * 2)) + Math.PI * 4) % (Math.PI * 2) / arc);
      if (at !== lastSlice) { lastSlice = at; tick(); }
      if (p < 1) requestAnimationFrame(frame);
      else {
        angle %= Math.PI * 2; spinning = false; $('#spinBtn').disabled = false;
        ding(); confetti(); if (golden) setTimeout(confetti, 350); show(slices[win]);
        if (window.FX) { FX.unlock('spin'); if (golden) FX.unlock('golden'); }
      }
    };
    requestAnimationFrame(frame);
  }

  // ---------- result modal ----------
  function show(clip) {
    $('#spinResult').textContent = (golden ? '✨ GOLDEN: ' : '🎉 ') + clip.title;
    $('.modal-box').classList.toggle('golden', golden);
    $('#mTitle').textContent = clip.title;
    $('#mBy').textContent = 'uploaded by ' + (clip.by || 'anonymous');
    $('#mMedia').innerHTML = Site.clipHtml(clip, { autoplay: true });
    $('#modal').classList.add('open');
  }
  function closeModal() { $('#modal').classList.remove('open'); $('#mMedia').innerHTML = ''; }
  $('#closeBtn').addEventListener('click', closeModal);
  $('#againBtn').addEventListener('click', spin);
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // ---------- confetti (blocky, of course) ----------
  function confetti() {
    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:200';
    cv.width = innerWidth; cv.height = innerHeight; document.body.appendChild(cv);
    const c = cv.getContext('2d');
    const pal = golden ? GOLD : COLORS;
    const bits = Array.from({ length: 120 }, () => ({ x: innerWidth / 2, y: innerHeight / 3, vx: (Math.random() - .5) * 16, vy: -Math.random() * 14 - 4, s: 6 + Math.random() * 8, col: pal[Math.floor(Math.random() * pal.length)] }));
    let f = 0;
    (function loop() {
      c.clearRect(0, 0, cv.width, cv.height);
      bits.forEach(b => { b.vy += .45; b.x += b.vx; b.y += b.vy; c.fillStyle = b.col; c.fillRect(b.x, b.y, b.s, b.s); });
      if (++f < 120) requestAnimationFrame(loop); else cv.remove();
    })();
  }

  $('#spinBtn').addEventListener('click', spin);
  $('#wheelCenter').addEventListener('click', spin);
  $('#soundBtn').addEventListener('click', e => { sound = !sound; e.target.textContent = sound ? '🔊' : '🔇'; });
  document.addEventListener('keydown', e => { if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); spin(); } });

  // ---------- upload ----------
  let mode = 'file';
  $$('.tabs button').forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.tab;
    $$('.tabs button').forEach(x => x.classList.toggle('on', x === b));
    $$('[data-pane]').forEach(p => p.hidden = p.dataset.pane !== mode);
  }));
  const linkInput = $('input[name=link]'), titleInput = $('input[name=title]');
  const ytCheck = () => {
    const yt = mode === 'link' && /(^|\.)youtu(\.be|be\.com)\//i.test(linkInput.value.replace(/^https?:\/\/(www\.|m\.)?/i, ''));
    titleInput.required = !yt;
    $('#titleHint').hidden = !yt;
  };
  linkInput.addEventListener('input', ytCheck);
  $$('.tabs button').forEach(b => b.addEventListener('click', ytCheck));

  $('#uploadForm').addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target, msg = $('#upMsg');
    const fd = new FormData(form);
    if (mode === 'file') fd.delete('link'); else fd.delete('file');
    fd.append('a', 'submit_clip');
    msg.className = 'msg';
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'api.php');
    $('#upBtn').disabled = true; $('#progWrap').hidden = mode !== 'file'; $('#prog').style.width = '0';
    xhr.upload.onprogress = ev => { if (ev.lengthComputable) $('#prog').style.width = (100 * ev.loaded / ev.total) + '%'; };
    xhr.onloadend = () => {
      $('#upBtn').disabled = false; $('#progWrap').hidden = true;
      let res; try { res = JSON.parse(xhr.responseText); } catch { res = { error: xhr.status === 413 ? 'That file is too big for this server.' : 'Upload failed. Is PHP enabled on your host?' }; }
      msg.textContent = res.error || res.message;
      msg.className = 'msg ' + (res.error ? 'err' : 'ok');
      if (!res.error) { form.reset(); window.FX && FX.unlock('upload'); }
    };
    xhr.send(fd);
  });

  // ---------- load ----------
  const s = await Site.ready;
  all = (s.clips || []);
  pickSlices();
  $('#clipCount').textContent = all.length ? `${all.length} clip${all.length === 1 ? '' : 's'} on the wheel` + (all.length > MAX_SLICES ? ` (${MAX_SLICES} random ones shown each spin)` : '') : '';
  if (document.fonts) document.fonts.ready.then(draw);
  draw();
})();
