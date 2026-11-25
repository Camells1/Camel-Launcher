(async () => {
  const { $, esc } = Site;
  const s = await Site.ready;
  const st = Site.settings(s);

  // The server we play on (set in admin; breezevanilla.eu by default)
  const ip = st.smpIp || 'breezevanilla.eu';
  $('#ip').textContent = ip;
  $('#serverName').textContent = ip;
  if (st.smpVersion) { $('#serverVersion').textContent = 'Version: ' + st.smpVersion; $('#serverVersion').hidden = false; }
  $('#copyIp').addEventListener('click', async e => {
    try { await navigator.clipboard.writeText(ip); e.target.textContent = 'Copied!'; }
    catch { getSelection().selectAllChildren($('#ip')); e.target.textContent = 'Press Ctrl+C'; }
    setTimeout(() => e.target.textContent = 'Copy', 1600);
  });

  if (st.mapUrl) {
    $('#mapCard').hidden = false;
    $('#mapLink').href = st.mapUrl;
    $('#mapFrame').src = st.mapUrl;
  }

  const builds = s.builds || [];
  $('#noBuilds').hidden = builds.length > 0;
  $('#builds').innerHTML = builds.map(b => `<figure class="build"><img src="${esc(b.img)}" alt="${esc(b.title)}" loading="lazy" data-cap="${esc(b.title)}${b.by ? ' — by ' + esc(b.by) : ''}"><figcaption>${esc(b.title)} <span class="muted">${esc(b.by)}</span></figcaption></figure>`).join('');
  $('#builds').addEventListener('click', e => {
    const img = e.target.closest('img'); if (!img) return;
    $('#bigImg').src = img.src; $('#bigCap').textContent = img.dataset.cap; $('#imgModal').classList.add('open');
  });
  $('#imgModal').addEventListener('click', e => { if (e.target.id === 'imgModal') e.currentTarget.classList.remove('open'); });
})();
