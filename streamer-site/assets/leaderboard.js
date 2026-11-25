(async () => {
  const { $, esc, fmt } = Site;
  const s = await Site.ready;
  const st = Site.settings(s);
  if (st.leaderboardTitle) $('#lbTitle').textContent = st.leaderboardTitle;
  const rows = s.leaderboard || [];
  const medal = i => ['🥇', '🥈', '🥉'][i] || '#' + (i + 1);
  $('#lb').innerHTML = rows.length ? rows.map((r, i) => `
    <div class="lb-row"><div class="lb-rank">${medal(i)}</div>
      <div><img class="lb-head" src="https://mc-heads.net/avatar/${encodeURIComponent(/^\w{3,16}$/.test(r.name) ? r.name : 'MHF_Steve')}/32" alt="" loading="lazy"><b>${esc(r.name)}</b>${r.note ? `<div class="muted small" style="margin-left:42px">${esc(r.note)}</div>` : ''}</div>
      <div class="lb-score">${fmt(r.score)}</div></div>`).join('')
    : '<p class="muted center">The leaderboard is empty. The first event decides who gets on it!</p>';
})();
