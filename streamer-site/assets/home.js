(async () => {
  const { $, esc, fmt } = Site;
  const SPLASHES = ['Play on breezevanilla.eu!', 'Join the Discord!', 'Live daily!', '100% creeper free!', 'Spin the wheel!', 'Now with more diamonds!', 'Vote on the next stream!', 'Not affiliated with Herobrine!', 'Better with friends!', 'Hardcore when?'];
  $('#splash').textContent = SPLASHES[Math.floor(Math.random() * SPLASHES.length)];

  // member goal
  document.addEventListener('discord', e => {
    const n = e.detail.approximate_member_count || 0;
    const steps = [50, 100, 250, 500, 750, 1000, 1500, 2000, 2500, 5000, 7500, 10000, 25000, 50000, 100000];
    const goal = steps.find(s => s > n) || Math.ceil((n + 1) / 50000) * 50000;
    const prev = [...steps].reverse().find(s => s <= n) || 0;
    $('#goalNum').textContent = fmt(goal);
    $('#goalText').textContent = fmt(n) + ' / ' + fmt(goal);
    $('#goalLeft').textContent = fmt(goal - n) + ' to go';
    setTimeout(() => $('#goalFill').style.width = (100 * (n - prev) / (goal - prev)).toFixed(1) + '%', 100);
  });

  const s = await Site.ready;
  const st = Site.settings(s);
  $('#inviteText').textContent = 'discord.gg/' + st.discordInvite;
  $('#copyInvite').addEventListener('click', e => {
    navigator.clipboard.writeText('https://discord.gg/' + st.discordInvite);
    e.target.textContent = 'Copied!';
    setTimeout(() => e.target.textContent = 'Copy', 1500);
  });
  if (st.schedule) $('#schedule').textContent = st.schedule;

  // countdown
  const ev = parseInt(st.eventTime, 10);
  if (st.eventTitle) $('#eventTitle').textContent = st.eventTitle;
  if (ev) {
    const when = new Date(ev * 1000);
    $('#eventWhen').textContent = when.toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' (your time)';
    const tick = () => {
      let d = Math.max(0, Math.floor((when - Date.now()) / 1000));
      if (d === 0) { $('#countdown').innerHTML = '<div style="min-width:200px"><b>LIVE!</b><span>happening now</span></div>'; return; }
      const parts = [[Math.floor(d / 86400), 'days'], [Math.floor(d % 86400 / 3600), 'hours'], [Math.floor(d % 3600 / 60), 'min'], [d % 60, 'sec']];
      $('#countdown').innerHTML = parts.map(([v, l]) => `<div><b>${String(v).padStart(2, '0')}</b><span>${l}</span></div>`).join('');
      setTimeout(tick, 1000);
    };
    tick();
  } else {
    $('#countdown').innerHTML = '<div style="min-width:200px"><b>SOON</b><span>announced in the Discord</span></div>';
  }

  // clip wall: picked videos, plus TikTok's own profile embed
  const vids = (s.videos || []).slice(0, 6);
  $('#videoWall').innerHTML = vids.map(id => `<iframe src="https://www.tiktok.com/embed/v2/${esc(id)}" loading="lazy" allow="encrypted-media; fullscreen" title="TikTok video"></iframe>`).join('');
  $('#creatorEmbed').innerHTML = `<blockquote class="tiktok-embed" cite="https://www.tiktok.com/@${esc(st.tiktok)}" data-unique-id="${esc(st.tiktok)}" data-embed-type="creator" style="max-width:780px;min-width:288px;margin:${vids.length ? '20px' : '0'} auto 0"><section><a target="_blank" rel="noopener" href="https://www.tiktok.com/@${esc(st.tiktok)}">@${esc(st.tiktok)} on TikTok</a></section></blockquote>`;
  const sc = document.createElement('script');
  sc.src = 'https://www.tiktok.com/embed.js'; sc.async = true;
  document.body.appendChild(sc);
})();

// Top donator spotlight on the home page
(async () => {
  const { $, fmt } = Site;
  const s = await Site.ready;
  const dons = s.donators || [];
  if (!dons.length) return;
  const st = Site.settings(s), unit = st.donateUnit || 'coins';
  const money = n => /^[€$£]$/.test(unit) ? unit + fmt(n) : fmt(n) + ' ' + unit;
  const d = dons[0];
  $('#topDonCard').hidden = false;
  $('#topDonName').textContent = d.name;
  $('#topDonNote').textContent = d.note || 'Thank you for the support! 💛';
  $('#topDonAmt').textContent = money(d.amount);
  $('#topDonHead').src = `https://mc-heads.net/avatar/${encodeURIComponent(/^\w{3,16}$/.test(d.name) ? d.name : 'MHF_Steve')}/72`;
  if (dons.length > 1) $('#topDonRunners').textContent = 'Runners-up: ' + dons.slice(1, 3).map(r => `${r.name} (${money(r.amount)})`).join(' · ');
})();


// "Right now": live status, top donator, #1 in chat, open poll — all automatic
(async () => {
  const { $, esc, fmt } = Site;
  const [s, L] = await Promise.all([Site.ready, Site.live()]);
  if (L && L.profile && L.profile.followers != null) $('#ttFollowers').textContent = fmt(L.profile.followers);
  else $('#ttFollowers').textContent = 'Daily';

  const items = [];
  const ago = t => { const d = Date.now() / 1000 - t; return d < 3600 ? Math.max(1, Math.round(d / 60)) + ' min ago' : d < 86400 * 1.5 ? Math.round(d / 3600) + ' hours ago' : Math.round(d / 86400) + ' days ago'; };
  if (L && L.autoLive && L.now) {
    items.push(['live', 'now-live', '🔴 LIVE NOW', `${fmt(L.now.viewers)} watching`, esc(L.now.title || 'Watch on TikTok')]);
  } else if (L && L.last) {
    items.push(['live', '', '📺 Last stream', ago(L.last.end || L.last.start), L.last.total ? `${fmt(L.last.total)} viewers` : 'See the stats']);
  }
  if (L && L.peak) items.push(['live', '', '🏆 Top viewer count', fmt(L.peak.viewers), 'all-time record']);
  const d = (s.donators || [])[0];
  if (d) items.push(['donators', '', '👑 Top donator', esc(d.name), `${fmt(d.amount)} ${esc(Site.settings(s).donateUnit || 'coins')}`]);
  const c = s.chat && (s.chat.top || [])[0];
  if (c) items.push(['live', '', '💬 #1 in chat', `“${esc(c.msg)}”`, `said ${fmt(c.count)} times`]);
  const poll = (s.polls || []).find(p => p.open);
  if (poll) items.push(['vote', '', '🗳 Vote now', esc(poll.question), `${fmt(poll.options.reduce((a, o) => a + o.votes, 0))} votes so far`]);
  if (!items.length) return;
  $('#nowGrid').innerHTML = items.slice(0, 4).map(([href, cls, label, big, small]) =>
    `<a class="now-item ${cls}" href="${href}"><span class="now-label">${label}</span><b>${big}</b><span class="muted small">${small}</span></a>`).join('');
  $('#nowCard').hidden = false;
})();
