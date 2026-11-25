(async () => {
  const { $, $$, esc, fmt } = Site;
  const s = await Site.ready;
  const st = Site.settings(s);
  const head = (name, size) => `https://mc-heads.net/avatar/${encodeURIComponent(/^\w{3,16}$/.test(name) ? name : 'MHF_Steve')}/${size}`;
  const medal = i => ['🥇', '🥈', '🥉'][i] || '#' + (i + 1);
  const unit = st.donateUnit || 'coins';
  const money = n => /^[€$£]$/.test(unit) ? unit + fmt(n) : fmt(n) + ' ' + unit;

  // tabs
  $$('[data-board]').forEach(b => b.addEventListener('click', () => {
    $$('[data-board]').forEach(x => x.classList.toggle('on', x === b));
    $$('[data-pane]').forEach(p => p.hidden = p.dataset.pane !== b.dataset.board);
  }));
  if (location.hash === '#viewers') $('[data-board=lb]').click();

  // top viewers
  if (st.leaderboardTitle) $('#lbTab').textContent = st.leaderboardTitle;
  const rows = s.leaderboard || [];
  $('#lb').innerHTML = rows.length ? rows.map((r, i) => `
    <div class="lb-row"><div class="lb-rank">${medal(i)}</div>
      <div><img class="lb-head" src="${head(r.name, 32)}" alt="" loading="lazy"><b>${esc(r.name)}</b>${r.note ? `<div class="muted small" style="margin-left:42px">${esc(r.note)}</div>` : ''}</div>
      <div class="lb-score">${fmt(r.score)}</div></div>`).join('')
    : '<p class="muted center">The leaderboard is empty. The first event decides who gets on it!</p>';

  // top donators: podium for the top 3, full list below
  const dons = s.donators || [];
  if (dons.length) {
    const top = dons.slice(0, 3);
    const order = [[1, 'p2'], [0, 'p1'], [2, 'p3']].filter(([i]) => top[i]);
    $('#donTop').innerHTML = `<div class="podium">${order.map(([i, cls]) => `<div class="${cls}">
      <div style="font-size:24px">${i === 0 ? '👑' : medal(i)}</div><img src="${head(top[i].name, 64)}" alt=""><b>${esc(top[i].name)}</b>
      <span class="amt">${esc(money(top[i].amount))}</span></div>`).join('')}</div>`;
    $('#don').innerHTML = dons.map((r, i) => `
      <div class="lb-row"><div class="lb-rank">${medal(i)}</div>
        <div><img class="lb-head" src="${head(r.name, 32)}" alt="" loading="lazy"><b>${esc(r.name)}</b>${r.note ? `<div class="muted small" style="margin-left:42px">${esc(r.note)}</div>` : ''}</div>
        <div class="lb-score" style="color:var(--gold)">${esc(money(r.amount))}</div></div>`).join('');
  } else {
    $('#don').innerHTML = '<p class="muted center">No donators yet. Send a gift on the next live and claim the 👑!</p>';
  }
  $('#donCta').innerHTML = `<p class="muted">Every gift on the live counts. The top donator gets the 👑 on the home page and a shoutout on stream.</p>
    <div class="btn-row" style="justify-content:center"><a class="btn btn-tiktok" href="https://www.tiktok.com/@${esc(st.tiktok)}/live" target="_blank" rel="noopener">🎁 Gift on the live</a>
    ${st.donateUrl ? `<a class="btn btn-gold" href="${esc(st.donateUrl)}" target="_blank" rel="noopener">💛 Support</a>` : ''}</div>`;
})();
