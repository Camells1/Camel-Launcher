(async () => {
  const { $, esc } = Site;
  const s = await Site.ready;
  const st = Site.settings(s);
  let unlocked = false;
  try { unlocked = localStorage.getItem('smpUnlocked') === '1'; } catch {}

  if (st.smpVersion) $('#smpVersion').textContent = 'Version: ' + st.smpVersion;
  function reveal() {
    if (!st.smpIp) {
      $('#ip').textContent = 'Opening soon!';
      $('#ip').classList.remove('locked');
      $('#unlock').textContent = 'The IP will be posted in the Discord';
      return;
    }
    $('#ip').textContent = st.smpIp;
    $('#ip').classList.remove('locked');
    $('#copyIp').hidden = false;
    $('#unlock').hidden = true;
  }
  if (unlocked) reveal();
  $('#unlock').addEventListener('click', () => {
    window.open('https://discord.gg/' + st.discordInvite, '_blank', 'noopener');
    $('#unlock').textContent = 'Unlocking…';
    setTimeout(() => { try { localStorage.setItem('smpUnlocked', '1'); } catch {} reveal(); }, 2500);
  });
  $('#copyIp').addEventListener('click', e => { navigator.clipboard.writeText(st.smpIp); e.target.textContent = 'Copied!'; setTimeout(() => e.target.textContent = 'Copy', 1500); });

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
