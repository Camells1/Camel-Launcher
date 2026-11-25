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
