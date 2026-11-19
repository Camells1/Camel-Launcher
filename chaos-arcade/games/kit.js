/* =========================================================
   CHAOS ARCADE — game kit
   Shared engine for every game in games/js/*.js:
   canvas + loop, input, juice (shake, particles, popups, hit-stop),
   combos, timers, start / game-over screens, leaderboards, sharing.
   A game calls Kit.def({...}) once.
   ========================================================= */
(function(){
'use strict';
const A = Arcade, $ = (s) => document.querySelector(s);
const Kit = {};
let def = null, k = null, raf = 0, last = 0;
let G = null; // catalogue entry

const MEDAL_E = ['', '🥉', '🥈', '🥇'], MEDAL_N = ['', 'BRONZE', 'SILVER', 'GOLD'];
function medals(){ if (def.medals) return def.medals; if (!def.winAt || def.winAt <= 1) return null; return [Math.max(1, Math.round(def.winAt * .5)), def.winAt, def.winAt * 2]; }
function medalFor(score){ const m = medals(); if (!m) return 0; return score >= m[2] ? 3 : score >= m[1] ? 2 : score >= m[0] ? 1 : 0; }
const QUIPS_GOOD = ['UNREAL!','LEGENDARY!','ABSOLUTE MENACE!','CERTIFIED GAMER!','GODLIKE!','INSANE RUN!'];
const QUIPS_MID = ['NICE RUN!','NOT BAD!','SOLID!','GETTING THERE!','RESPECTABLE!'];
const QUIPS_BAD = ['OUCH.','SKILL ISSUE?','WARM-UP ROUND','THAT HAPPENED.','ONE MORE TRY?'];

/* ---------- boot: load the game script named in the hash ---------- */
function boot(){
  const id = location.hash.replace('#', '');
  G = A.gameById(id);
  if (!G || G.cat === 'block'){ location.replace('../index.html'); return; }
  document.title = G.t + ' · Chaos Arcade';
  A.paintBody(G.bg.map(c => shade(c, -.35)));
  A.mountBar(id);
  const s = document.createElement('script');
  s.src = 'js/' + id + '.js';
  s.onerror = () => { $('#kitStage').innerHTML = '<div class="kit-ov"><h2>😵 Could not load this game</h2><a class="btn" href="../index.html">⬅ Arcade</a></div>'; };
  document.body.appendChild(s);
}
addEventListener('hashchange', () => location.reload());
function shade(hex, f){
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const m = (c) => Math.max(0, Math.min(255, Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f)));
  return '#' + ((1 << 24) + (m(r) << 16) + (m(g) << 8) + m(b)).toString(16).slice(1);
}

/* ---------- the k object games talk to ---------- */
function makeK(){
  const parts = [], pops = [];
  let shakeT = 0, shakeMag = 0, flashT = 0, flashC = '#fff', stopT = 0, timerLeft = null, timerMax = 0;
  const hudExtra = {};
  const kk = {
    id:G.id, g:G, canvas:null, ctx:null, root:null, W:0, H:0, t:0, score:0, combo:0, running:false, paused:false, ended:false, data:{},
    rand:(a, b) => a + Math.random() * (b - a),
    ri:(a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick:(arr) => arr[Math.floor(Math.random() * arr.length)],
    shuffle:(arr) => { const a = arr.slice(); for (let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; },
    clamp:(v, a, b) => Math.max(a, Math.min(b, v)),
    lerp:(a, b, t) => a + (b - a) * t,
    dist:(ax, ay, bx, by) => Math.hypot(ax - bx, ay - by),
    sfx:A.Sfx,
    beep(f, d, type, v){ A.Sfx.tone(f, d || .06, type || 'square', v || .07); },
    good(){ A.Sfx.success(); }, bad(){ A.Sfx.fail(); A.buzz(60); }, boom(){ A.Sfx.boom(); A.buzz([120,40,120]); }, coin(){ A.Sfx.coin(); },
    /* scoring */
    add(n, x, y, color){ n = Math.round(n); kk.score += n; if (x != null) kk.pop(x, y, (n >= 0 ? '+' : '') + n, color); renderHud(); return n; },
    set(n){ kk.score = Math.round(n); renderHud(); },
    hit(base, x, y){ kk.combo++; const m = kk.mult(); const n = kk.add(base * m, x, y, m > 1 ? '#ffaa00' : '#ffff55'); if (kk.combo > 0 && kk.combo % 10 === 0){ A.bigText('🔥 ' + kk.combo + ' COMBO!'); A.Sfx.combo ? 0 : kk.beep(880 + kk.combo * 10, .12); } return n; },
    miss(){ if (kk.combo >= 5) kk.pop(kk.W/2, kk.H/2, 'COMBO LOST', '#ff5555'); kk.combo = 0; renderHud(); },
    mult(){ return Math.min(4, 1 + Math.floor(kk.combo / 5) * .5); },
    hud(key, val){ hudExtra[key] = val; renderHud(); },
    lives(n, max){ kk.hud('lives', '❤️'.repeat(Math.max(0, n)) + '🖤'.repeat(Math.max(0, (max || n) - n))); },
    timer(sec){ timerLeft = sec; timerMax = sec; renderHud(); },
    addTime(sec){ if (timerLeft != null){ timerLeft += sec; kk.pop(kk.W/2, 40, (sec > 0 ? '+' : '') + sec + 's', sec > 0 ? '#55ff55' : '#ff5555'); } },
    get timeLeft(){ return timerLeft; },
    /* juice */
    shake(mag, dur){ shakeMag = Math.max(shakeMag, mag || 6); shakeT = Math.max(shakeT, dur || .25); if (!kk.canvas) A.shake($('#kitStage'), (mag || 6) > 8); },
    flash(color, dur){ flashC = color || '#fff'; flashT = dur || .15; if (!kk.canvas) A.flash(); },
    hitstop(ms){ stopT = Math.max(stopT, (ms || 60) / 1000); },
    burst(x, y, colors, n, speed){
      if (!kk.canvas){ const r = kk.root.getBoundingClientRect(); A.burst(r.left + x, r.top + y, colors, n); return; }
      colors = colors || ['#ffff55','#ff55ff','#55ffff','#ffffff']; n = n || 14; speed = speed || 220;
      for (let i=0;i<n;i++){ const a = Math.random() * Math.PI * 2, v = speed * (.3 + Math.random() * .9); parts.push({ x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v - 60, life:.5 + Math.random()*.5, max:1, c:colors[i % colors.length], s:3 + Math.random()*5 }); }
    },
    pop(x, y, text, color){
      if (!kk.canvas){ const r = kk.root.getBoundingClientRect(), p = document.createElement('div'); p.className = 'kit-pop'; p.textContent = text; p.style.color = color || '#ffff55'; p.style.left = (r.left + x) + 'px'; p.style.top = (r.top + y) + 'px'; document.body.appendChild(p); setTimeout(() => p.remove(), 900); return; }
      pops.push({ x, y, text, color:color || '#ffff55', life:.9 });
    },
    burstEl(el, colors, n){ const r = el.getBoundingClientRect(); A.burst(r.left + r.width/2, r.top + r.height/2, colors, n); },
    over(opts){ endGame(opts || {}); },
    _tick(dt){
      if (timerLeft != null && kk.running && !kk.paused){
        const before = Math.ceil(timerLeft);
        timerLeft -= dt;
        if (Math.ceil(timerLeft) !== before && timerLeft <= 5 && timerLeft > 0) kk.beep(1400, .04, 'square', .05);
        if (timerLeft <= 0){ timerLeft = 0; renderHud(); if (def.timeUp) def.timeUp(kk); else kk.over({}); return; }
        if (Math.floor(timerLeft * 10) % 2 === 0) renderHud();
      }
      parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; p.life -= dt; });
      for (let i=parts.length-1;i>=0;i--) if (parts[i].life <= 0) parts.splice(i, 1);
      pops.forEach(p => { p.y -= 50 * dt; p.life -= dt; });
      for (let i=pops.length-1;i>=0;i--) if (pops[i].life <= 0) pops.splice(i, 1);
      shakeT = Math.max(0, shakeT - dt); flashT = Math.max(0, flashT - dt);
    },
    _stop(dt){ if (stopT > 0){ stopT -= dt; return true; } return false; },
    _pre(ctx){ if (shakeT > 0){ const m = shakeMag * (shakeT / .25); ctx.translate((Math.random()-.5) * m * 2, (Math.random()-.5) * m * 2); } else shakeMag = 0; },
    _post(ctx){
      parts.forEach(p => { ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2)); ctx.fillStyle = p.c; ctx.fillRect(p.x - p.s/2, p.y - p.s/2, p.s, p.s); });
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center'; ctx.font = 'bold 18px "Lucida Console", monospace';
      pops.forEach(p => { ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2)); ctx.fillStyle = '#000'; ctx.fillText(p.text, p.x + 2, p.y + 2); ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y); });
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
      if (flashT > 0){ ctx.globalAlpha = Math.min(.7, flashT * 4); ctx.fillStyle = flashC; ctx.fillRect(-20, -20, kk.W + 40, kk.H + 40); ctx.globalAlpha = 1; }
    },
    _reset(){ parts.length = 0; pops.length = 0; timerLeft = null; Object.keys(hudExtra).forEach(x => delete hudExtra[x]); shakeT = 0; flashT = 0; stopT = 0; },
    _hud(){ return { timerLeft, timerMax, extra:hudExtra }; }
  };
  return kk;
}

/* ---------- page setup ---------- */
Kit.def = function(d){
  def = Object.assign({ aspect:1, dom:false, how:'', controls:null, xp:null, winAt:null, label:null, share:null }, d);
  k = makeK();
  const stage = $('#kitStage');
  stage.innerHTML = '';
  if (def.dom){
    const r = document.createElement('div'); r.className = 'kit-dom'; stage.appendChild(r); k.root = r;
  } else {
    const c = document.createElement('canvas'); c.className = 'kit-canvas'; stage.appendChild(c);
    k.canvas = c; k.ctx = c.getContext('2d'); k.root = c;
    sizeCanvas(); addEventListener('resize', sizeCanvas);
  }
  const ov = document.createElement('div'); ov.className = 'kit-ov'; ov.id = 'kitOv'; stage.appendChild(ov);
  $('#kitHow').innerHTML = '<b>HOW TO PLAY:</b> ' + def.how;
  if (def.controls){
    $('#kitPad').innerHTML = def.controls.map((c, i) => '<button class="btn ' + (c.cls || '') + '" data-i="' + i + '">' + c.label + '</button>').join('');
    $('#kitPad').style.gridTemplateColumns = 'repeat(' + def.controls.length + ',1fr)';
    $('#kitPad').querySelectorAll('[data-i]').forEach(b => {
      const c = def.controls[+b.dataset.i];
      b.addEventListener('pointerdown', e => { e.preventDefault(); A.Sfx.init(); if (k.running && c.down) c.down(k); });
      ['pointerup','pointerleave','pointercancel'].forEach(ev => b.addEventListener(ev, () => { if (c.up) c.up(k); }));
    });
  }
  bindInput();
  showStart();
  renderHud();
  if (def.setup) def.setup(k);
  cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame);
};
function sizeCanvas(){
  const stage = $('#kitStage'), maxW = stage.clientWidth || 500, maxH = Math.min(innerHeight * .68, 720);
  let w = maxW, h = w / def.aspect;
  if (h > maxH){ h = maxH; w = h * def.aspect; }
  const dpr = Math.min(2, devicePixelRatio || 1);
  k.canvas.style.width = w + 'px'; k.canvas.style.height = h + 'px';
  k.canvas.width = Math.round(w * dpr); k.canvas.height = Math.round(h * dpr);
  k.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); k.ctx.imageSmoothingEnabled = false;
  const changed = k.W && (Math.abs(k.W - w) > 1);
  k.W = w; k.H = h;
  if (changed && def.resize) def.resize(k);
}
function frame(now){
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (k.running && !k.paused){
    if (!k._stop(dt)){ k.t += dt; if (def.update) def.update(dt, k); k._tick(dt); }
  } else k._tick(0);
  if (k.canvas){
    const ctx = k.ctx; ctx.save(); k._pre(ctx);
    if (def.draw) def.draw(ctx, k);
    k._post(ctx); ctx.restore();
  }
  raf = requestAnimationFrame(frame);
}

/* ---------- HUD ---------- */
function renderHud(){
  if (!k) return;
  const best = A.gameStats(G.id).best || 0, h = k._hud();
  let html = '<span class="chip">★ <b>' + (def.scoreText ? def.scoreText(k.score) : k.score) + '</b></span>';
  if (k.combo >= 3) html += '<span class="chip combo">🔥x' + k.combo + (k.mult() > 1 ? ' · ' + k.mult() + 'x' : '') + '</span>';
  Object.keys(h.extra).forEach(key => { html += '<span class="chip">' + h.extra[key] + '</span>'; });
  if (h.timerLeft != null) html += '<span class="chip ' + (h.timerLeft <= 5 ? 'low' : '') + '">⏱ ' + h.timerLeft.toFixed(1) + '</span>';
  html += '<span class="chip dim">🏆 ' + (def.scoreText ? def.scoreText(best) : best) + '</span>';
  $('#kitHud').innerHTML = html;
}

/* ---------- start / over screens ---------- */
function showStart(){
  const ov = $('#kitOv'), st = A.gameStats(G.id);
  ov.className = 'kit-ov';
  ov.innerHTML = '<div class="kit-icon">' + G.e + '</div><h2>' + G.t + '</h2><p>' + G.desc + '</p>' +
    (st.plays ? '<div class="kit-best">🏆 Your best: <b>' + (def.scoreText ? def.scoreText(st.best) : st.best) + '</b> · ' + st.plays + ' play' + (st.plays === 1 ? '' : 's') + '</div>' : '') +
    (medals() ? '<div class="kit-medals">' + medals().map((v, i) => '<span class="' + ((st.medal || 0) > i ? 'got' : '') + '">' + MEDAL_E[i + 1] + ' ' + (def.scoreText ? def.scoreText(v) : v) + '</span>').join('') + '</div>' : '') +
    '<button class="btn green big" id="kitPlay">▶ PLAY</button><div class="kit-lb" id="kitLbMini"></div><div class="kit-hint">Space / Enter also starts</div>';
  $('#kitPlay').addEventListener('click', start);
  miniBoard($('#kitLbMini'), 3);
}
function start(){
  A.Sfx.init(); A.Sfx.click();
  k._reset();
  k.score = 0; k.combo = 0; k.t = 0; k.ended = false; k.paused = false; k.data = {};
  $('#kitOv').className = 'kit-ov hide'; $('#kitStage').classList.remove('ended');
  if (k.canvas) sizeCanvas();
  if (def.init) def.init(k);
  renderHud();
  if (def.dom || def.countdown === false){ k.running = true; return; }
  const ov = $('#kitOv'); let n = 3;
  ov.className = 'kit-ov count';
  (function tick(){
    if (k.ended) return;
    ov.innerHTML = '<div class="kit-count">' + (n > 0 ? n : 'GO!') + '</div>';
    A.Sfx.tone(n > 0 ? 520 : 1040, n > 0 ? .1 : .25, 'square', .08);
    if (n <= 0){ setTimeout(() => { ov.className = 'kit-ov hide'; }, 350); k.running = true; return; }
    n--; setTimeout(tick, 450);
  })();
}
function endGame(opts){
  if (k.ended) return;
  k.ended = true; k.running = false;
  if (opts.score != null) k.score = Math.round(opts.score);
  const score = Math.max(0, k.score);
  const prevBest = A.gameStats(G.id).best || 0;
  const label = opts.label || (def.label ? def.label(score, k) : (def.scoreText ? def.scoreText(score) : score + ' pts'));
  const win = opts.win != null ? opts.win : (def.winAt != null ? score >= def.winAt : score > 0);
  const xp = def.xp ? def.xp(score, k) : Math.min(150, Math.round(Math.sqrt(score) * 3));
  const medal = medalFor(score), prevMedal = A.gameStats(G.id).medal || 0;
  const res = A.report(G.id, { score, xp:xp + (medal > prevMedal ? medal * 15 : 0), win, label, medal });
  const newBest = score > prevBest && score > 0;
  if (newBest) setTimeout(() => A.confetti(), 300);
  A.Sfx.fanfare(win || newBest);
  const quip = opts.title || (newBest ? '🏆 NEW BEST!' : score >= prevBest * .7 && score > 0 ? A.rnd(QUIPS_MID) : A.rnd(QUIPS_BAD));
  const lines = (opts.lines || []).map(l => '<div>' + l + '</div>').join('');
  const ov = $('#kitOv');
  setTimeout(() => {
    ov.className = 'kit-ov end'; $('#kitStage').classList.add('ended'); renderHud(); window.scrollTo({ top:0, behavior:'smooth' });
    ov.innerHTML = '<div class="kit-quip">' + quip + '</div><div class="kit-score">' + (def.scoreText ? def.scoreText(score) : score) + '</div>' +
      (medal ? '<div class="kit-medal' + (medal > prevMedal ? ' new' : '') + '">' + MEDAL_E[medal] + ' ' + MEDAL_N[medal] + (medal > prevMedal ? ' MEDAL UNLOCKED!' : '') + '</div>' : '') +
      (medals() && medal < 3 ? '<div class="kit-next">Next: ' + MEDAL_E[medal + 1] + ' at ' + (def.scoreText ? def.scoreText(medals()[medal]) : medals()[medal]) + '</div>' : '') +
      '<div class="kit-lines">' + lines + '<div>+' + (res.xp || 0) + ' XP' + (res.featured ? ' (⭐ 2x)' : '') + ' · best ' + (def.scoreText ? def.scoreText(Math.max(prevBest, score)) : Math.max(prevBest, score)) + '</div></div>' +
      '<div class="kit-btns"><button class="btn green" id="kitAgain">🔄 AGAIN</button><button class="btn gold" id="kitShare">📋 SHARE</button><a class="btn" href="../index.html">⬅ ARCADE</a></div>' +
      '<div class="kit-lb" id="kitLb"></div>';
    $('#kitAgain').addEventListener('click', start);
    $('#kitShare').addEventListener('click', () => {
      const extra = def.share ? def.share(score, k) : [];
      A.copy(A.shareText(G.id, ['⭐ ' + label + (newBest ? ' (new best!)' : '')].concat(extra)));
    });
    boardAfter($('#kitLb'), res.lb, score);
  }, opts.delay != null ? opts.delay : 500);
}
function rowHtml(i, name, s, me){ return '<div class="lbr' + (me ? ' me' : '') + '"><span>' + (['🥇','🥈','🥉'][i] || '#' + (i+1)) + '</span><span class="n">' + A.esc(name) + '</span><span>' + (def.scoreText ? def.scoreText(s) : s) + '</span></div>'; }
function localRows(n){
  const t = A.lb.local(G.id).slice(0, n);
  return t.length ? t.map((x, i) => rowHtml(i, x.d, x.s, false)).join('') : '<div class="lbe">No scores yet. Be the first!</div>';
}
function miniBoard(el, n){
  el.innerHTML = '<div class="lbt">🌍 TOP PLAYERS</div><div class="lbe">Loading…</div>';
  A.lb.get(G.id).then(j => {
    el.innerHTML = '<div class="lbt">🌍 TOP PLAYERS</div>' + (j.top.length ? j.top.slice(0, n).map((x, i) => rowHtml(i, x.n, x.s, x.me)).join('') : '<div class="lbe">Nobody yet. Claim #1!</div>');
  }).catch(() => { el.innerHTML = '<div class="lbt">📱 YOUR TOP RUNS</div>' + localRows(n); });
}
function boardAfter(el, p, score){
  const tabs = (which) => A.acct.user ? '<div class="kit-tabs"><button class="btn small' + (which === 'g' ? ' on' : '') + '" data-tab="g">🌍 Global</button><button class="btn small' + (which === 'f' ? ' on' : '') + '" data-tab="f">👥 Friends</button></div>' : '';
  const bindTabs = () => el.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { A.Sfx.click(); el.innerHTML = '<div class="lbe">Loading…</div>'; (b.dataset.tab === 'f' ? A.lb.get(G.id, true).then(j => showF(j)) : A.lb.get(G.id).then(show)).catch(offline); }));
  const showF = (j) => {
    const others = j.top.filter(x => !x.me), beaten = others.filter(x => x.s < score).length;
    let h = tabs('f') + '<div class="lbt">👥 FRIENDS</div>' + (j.top.length ? j.top.map((x, i) => rowHtml(i, x.n, x.s, x.me)).join('') : '<div class="lbe">No friends on this board yet. Add some in the lobby!</div>');
    if (others.length) h += '<div class="lbe">' + (beaten === others.length ? '👑 You beat ALL ' + others.length + ' friends!' : '⚔️ You beat ' + beaten + ' of ' + others.length + ' friends') + '</div>';
    el.innerHTML = h; bindTabs();
  };
  const show = (j) => {
    let h = tabs('g') + '<div class="lbt">🌍 GLOBAL LEADERBOARD</div>' + (j.top.length ? j.top.map((x, i) => rowHtml(i, x.n, x.s, x.me)).join('') : '<div class="lbe">Nobody yet.</div>');
    if (j.you && j.you.rank > j.top.length) h += rowHtml(j.you.rank - 1, A.state.name || 'You', j.you.s, true);
    h += '<div class="lbe">' + j.count + ' player' + (j.count === 1 ? '' : 's') + (j.you ? ' · you are #' + j.you.rank : '') + (A.acct.user ? '' : ' · <a href="../index.html#account">log in</a> to protect your name') + '</div>';
    el.innerHTML = h; bindTabs();
  };
  const offline = () => { el.innerHTML = '<div class="lbt">📱 YOUR TOP RUNS (this device)</div>' + localRows(5) + '<div class="lbe">The global board goes live when the arcade runs on your website.</div>'; };
  if (!A.state.name && !A.acct.user){
    if (A.lb.down){ offline(); return; }
    el.innerHTML = '<div class="lbt">🌍 PUT YOUR NAME ON THE BOARD</div><div class="kit-name"><input id="kitName" maxlength="16" placeholder="Nickname" aria-label="Nickname"><button class="btn green" id="kitNameGo">SUBMIT</button></div>';
    const go = () => {
      const n = $('#kitName').value.trim(); if (!n){ A.toast('Type a nickname first!'); return; }
      A.setName(n); el.innerHTML = '<div class="lbe">Submitting…</div>';
      A.lb.submit(G.id, score).then(show).catch(offline);
    };
    $('#kitNameGo').addEventListener('click', go);
    $('#kitName').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') go(); });
    return;
  }
  el.innerHTML = '<div class="lbe">Loading leaderboard…</div>';
  (p || Promise.reject()).then(j => j || A.lb.get(G.id)).then(show).catch(() => A.lb.get(G.id).then(show).catch(offline));
}

/* ---------- input ---------- */
let downAt = null;
function local(e){ const r = k.root.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
function bindInput(){
  const stage = $('#kitStage');
  stage.addEventListener('pointerdown', e => {
    if (e.target.closest('.kit-ov')) return;
    A.Sfx.init();
    if (k.paused){ k.paused = false; $('#kitOv').className = 'kit-ov hide'; return; }
    if (!k.running) return;
    if (k.canvas) e.preventDefault();
    const [x, y] = local(e); downAt = { x, y, t:performance.now() };
    if (def.down) def.down(x, y, k, e);
  });
  stage.addEventListener('pointermove', e => { if (!k.running) return; const [x, y] = local(e); if (def.move) def.move(x, y, k, !!downAt, e); });
  addEventListener('pointerup', e => {
    if (!k.running || !downAt) { downAt = null; return; }
    const [x, y] = local(e), dx = x - downAt.x, dy = y - downAt.y;
    if (def.up) def.up(x, y, k, e);
    if (def.swipe && Math.hypot(dx, dy) > 28) def.swipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'), k, dx, dy);
    downAt = null;
  });
  stage.addEventListener('touchmove', e => { if (k.running && k.canvas) e.preventDefault(); }, { passive:false });
  addEventListener('keydown', e => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName) && !def.typing) return;
    if (!k.running){
      if ((e.key === 'Enter' || e.code === 'Space') && !k.paused && !def.typing){ e.preventDefault(); if (!$('#kitOv').classList.contains('hide')) start(); }
      return;
    }
    if (k.paused){ k.paused = false; $('#kitOv').className = 'kit-ov hide'; return; }
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key) && !def.typing) e.preventDefault();
    if (def.key) def.key(e.key, k, e);
  });
  addEventListener('keyup', e => { if (k.running && def.keyup) def.keyup(e.key, k, e); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && k.running && !def.noPause){ k.paused = true; const ov = $('#kitOv'); ov.className = 'kit-ov'; ov.innerHTML = '<h2>⏸ PAUSED</h2><p>Tap or press a key to keep playing.</p>'; }
  });
}

Object.defineProperty(Kit, '_k', { get(){ return k; } });
window.Kit = Kit;
boot();
})();
