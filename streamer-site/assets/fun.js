(async () => {
  const { $, esc } = Site;
  // ---------- quiz ----------
  const Q = [
    ['How many obsidian blocks do you need for a nether portal (without corners)?', ['10', '14', '8', '12'], 0],
    ['Which mob drops ender pearls?', ['Enderman', 'Blaze', 'Creeper', 'Witch'], 0],
    ['What block do you mine to get netherite?', ['Ancient Debris', 'Nether Quartz', 'Blackstone', 'Magma Block'], 0],
    ['What item tames a wolf?', ['Bone', 'Raw beef', 'Wheat', 'Carrot'], 0],
    ['How many eyes of ender does it take to fill an End portal?', ['12', '8', '16', '10'], 0],
    ['How long is one full Minecraft day in real time?', ['20 minutes', '10 minutes', '1 hour', '24 minutes'], 0],
    ['What do villagers use as money?', ['Emeralds', 'Gold ingots', 'Diamonds', 'Iron nuggets'], 0],
    ['Which mob lives in the Deep Dark and is blind?', ['Warden', 'Wither', 'Ravager', 'Elder Guardian'], 0],
    ['How many ender pearls fit in one stack?', ['16', '64', '32', '1'], 0],
    ['What do piglins love?', ['Gold', 'Emeralds', 'Diamonds', 'Pork chops'], 0],
    ['Which pickaxe is the weakest one that can mine obsidian?', ['Diamond', 'Iron', 'Stone', 'Gold'], 0],
    ['What do you use to tame a cat?', ['Raw fish', 'Milk', 'String', 'Seeds'], 0],
    ['How many hearts does a player have by default?', ['10', '20', '8', '12'], 0],
    ['Which mob blows up when it gets close to you?', ['Creeper', 'Skeleton', 'Zombie', 'Slime'], 0],
    ['What dimension is the Ender Dragon in?', ['The End', 'The Nether', 'Overworld', 'Deep Dark'], 0],
    ['What do you need to make a cake (besides milk, sugar and wheat)?', ['An egg', 'Cocoa beans', 'Honey', 'An apple'], 0],
    ['What do you get when lightning strikes a pig?', ['Zombified Piglin', 'Hoglin', 'Charged Pig', 'Nothing'], 0],
  ];
  const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  let round, idx, score;
  const best = () => { try { return +localStorage.getItem('quizBest') || 0; } catch { return 0; } };
  function start() { round = shuffle(Q).slice(0, 10); idx = 0; score = 0; ask(); }
  function ask() {
    const body = $('#quizBody');
    if (idx >= round.length) {
      const b = Math.max(best(), score);
      try { localStorage.setItem('quizBest', b); } catch {}
      if (score === 10) FX.unlock('quiz10');
      const rank = score === 10 ? 'Netherite brain 🧠' : score >= 8 ? 'Diamond tier 💎' : score >= 5 ? 'Iron tier ⚙' : 'Wooden pickaxe 🪵';
      body.innerHTML = `<p class="quiz-q">You got ${score}/10 — ${rank}</p><p class="muted">Your best: ${b}/10. Post your score in the Discord and challenge your friends!</p>
        <div class="btn-row"><button class="btn btn-grass" id="again">Play again</button><a class="btn btn-discord" data-discord href="https://discord.gg/${esc(Site.settings(window._s).discordInvite)}" target="_blank" rel="noopener">Share in Discord</a></div>`;
      $('#again').onclick = start;
      return;
    }
    const [q, answers, right] = round[idx];
    const order = shuffle(answers.map((a, i) => ({ a, ok: i === right })));
    body.innerHTML = `<p class="muted small">Question ${idx + 1} of ${round.length} · Score ${score}</p><p class="quiz-q">${esc(q)}</p>
      <div class="quiz-a">${order.map((o, i) => `<button data-i="${i}">${esc(o.a)}</button>`).join('')}</div>`;
    body.querySelectorAll('.quiz-a button').forEach(btn => btn.onclick = () => {
      const pick = order[+btn.dataset.i];
      body.querySelectorAll('.quiz-a button').forEach((b, i) => { b.disabled = true; if (order[i].ok) b.classList.add('right'); });
      if (pick.ok) score++; else btn.classList.add('wrong');
      setTimeout(() => { idx++; ask(); }, 1000);
    });
  }
  start();

  // ---------- seed + skin ----------
  const s = window._s = await Site.ready;
  const st = Site.settings(s);
  if (st.seed) { $('#seed').textContent = st.seed; if (st.seedNote) $('#seedNote').textContent = st.seedNote; }
  $('#copySeed').onclick = e => { navigator.clipboard.writeText($('#seed').textContent); e.target.textContent = 'Copied!'; setTimeout(() => e.target.textContent = 'Copy', 1500); };
  function showSkin(name) {
    if (!/^\w{3,16}$/.test(name)) return;
    $('#skinImg').src = `https://mc-heads.net/body/${name}/260`;
    $('#skinDl').href = `https://mc-heads.net/download/${name}`;
    $('#skinName').value = name;
  }
  showSkin(st.mcUsername || 'MHF_Steve');
  $('#skinForm').addEventListener('submit', e => { e.preventDefault(); showSkin($('#skinName').value.trim()); });
})();


// =====================================================================
//  Catch Danny — whack-a-mole with a pixel dog (and TNT you must avoid)
// =====================================================================
(() => {
  const $ = s => document.querySelector(s);
  const holesEl = $('#holes');
  if (!holesEl) return;
  $('#achBtn').addEventListener('click', () => document.querySelector('.xp-main')?.click());

  // Original pixel art, drawn as SVG rects (12x12)
  const art = (rows, pal) => {
    let r = '';
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${pal[ch]}"/>`; }));
    return `<svg class="critter" viewBox="0 0 12 12" shape-rendering="crispEdges">${r}</svg>`;
  };
  const DOG = art([
    '.bb......bb.',
    'bbbb....bbbb',
    'bbtttttttbbb',
    '.btttttttb..',
    '.ttkttttkt..',
    '.ttwttttwt..',
    '.tttwwwwtt..',
    '.ttwwnnwwt..',
    '.ttwwwwwwt..',
    '..twwrrwwt..',
    '..tttrrttt..',
    '...tttttt...',
  ].map(r => r.padEnd(12, '.')), { b: '#5a3a1e', t: '#a8723f', w: '#f1e3cf', k: '#111', n: '#222', r: '#e5484d' });
  const TNT = art([
    '.....f......',
    '.....s......',
    '.....s......',
    '.RRRRRRRRRR.',
    '.RrRrRrRrRR.',
    '.WWWWWWWWWW.',
    '.WkkWkWWkkW.',
    '.WWkWkkWWkW.',
    '.WWkWkWkWkW.',
    '.WWWWWWWWWW.',
    '.RrRrRrRrRR.',
    '.RRRRRRRRRR.',
  ], { R: '#c62828', r: '#e04545', W: '#eee', k: '#222', s: '#555', f: '#ffb300' });

  const holes = Array.from({ length: 9 }, (_, i) => {
    const h = document.createElement('div');
    h.className = 'hole'; h.dataset.i = i;
    holesEl.appendChild(h);
    return h;
  });

  let best = 0; try { best = +localStorage.getItem('dannyBest') || 0; } catch {}
  $('#gBest').textContent = best;
  let score, timeLeft, playing = false, timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  function pop() {
    if (!playing) return;
    const free = holes.filter(h => !h.classList.contains('up'));
    if (free.length) {
      const h = free[Math.floor(Math.random() * free.length)];
      const bad = Math.random() < .2;
      h.innerHTML = bad ? TNT : DOG;
      h.dataset.kind = bad ? 'tnt' : 'dog';
      requestAnimationFrame(() => h.classList.add('up'));
      const stay = Math.max(450, 1050 - (30 - timeLeft) * 18);
      later(() => { h.classList.remove('up'); h.dataset.kind = ''; }, stay);
    }
    later(pop, Math.max(280, 750 - (30 - timeLeft) * 15) * (.7 + Math.random() * .6));
  }

  function floatText(h, text, bad) {
    const f = document.createElement('span');
    f.className = 'float-score' + (bad ? ' bad' : '');
    f.textContent = text; h.appendChild(f);
    setTimeout(() => f.remove(), 700);
  }

  holesEl.addEventListener('pointerdown', e => {
    const h = e.target.closest('.hole');
    if (!h || !playing || !h.classList.contains('up') || !h.dataset.kind) return;
    const kind = h.dataset.kind;
    h.dataset.kind = '';
    h.classList.remove('up');
    h.classList.add('hit'); setTimeout(() => h.classList.remove('hit'), 250);
    if (kind === 'dog') { score++; floatText(h, '+1'); FX.sound('woof'); }
    else {
      score = Math.max(0, score - 3); floatText(h, '-3', true); FX.sound('boom');
      const r = h.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, ['#c62828', '#ffb300', '#333'], 16, 8);
      holesEl.animate([{ transform: 'translate(4px,0)' }, { transform: 'translate(-4px,0)' }, { transform: 'none' }], { duration: 200, iterations: 2 });
    }
    $('#gScore').textContent = score;
  });

  function tick() {
    if (!playing) return;
    timeLeft--; $('#gTime').textContent = timeLeft;
    if (timeLeft <= 0) return end();
    later(tick, 1000);
  }

  function end() {
    playing = false;
    timers.forEach(clearTimeout); timers = [];
    holes.forEach(h => { h.classList.remove('up'); h.dataset.kind = ''; });
    const newBest = score > best;
    if (newBest) { best = score; try { localStorage.setItem('dannyBest', best); } catch {} $('#gBest').textContent = best; }
    $('#gMsg').textContent = `${score} Dannys caught!` + (newBest ? ' 🏆 New best!' : '') + (score >= 25 ? '' : ' Get 25 for an achievement.');
    if (score >= 25) FX.unlock('danny');
    if (newBest) FX.sound('levelup');
    $('#gStart').disabled = false; $('#gStart').textContent = '↻ Play again';
  }

  $('#gStart').addEventListener('click', () => {
    score = 0; timeLeft = 30; playing = true;
    $('#gScore').textContent = 0; $('#gTime').textContent = 30; $('#gMsg').textContent = '';
    $('#gStart').disabled = true; $('#gStart').textContent = 'Go go go!';
    FX.sound('pop');
    later(pop, 400); later(tick, 1000);
  });
})();
