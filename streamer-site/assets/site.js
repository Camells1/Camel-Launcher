// Shared code for every page: nav, live banner, Discord numbers, helpers.
const Site = (() => {
  let statePromise = null;
  const DEFAULT_INVITE = 'm7G76JxKnS';

  function api(action = 'state', body = null) {
    let url = 'api.php', opts = {};
    if (body) {
      const fd = body instanceof FormData ? body : new FormData();
      if (!(body instanceof FormData)) for (const [k, v] of Object.entries(body)) fd.append(k, v);
      fd.append('a', action);
      opts = { method: 'POST', body: fd };
    } else url += '?a=' + action;
    return fetch(url, opts).then(async r => {
      const data = await r.json().catch(() => ({ error: 'The server did not answer properly. Is PHP enabled on your host?' }));
      if (!r.ok && !data.error) data.error = 'Error ' + r.status;
      return data;
    });
  }

  function state() {
    if (!statePromise) statePromise = api('state').catch(() => ({ error: 'offline' }));
    return statePromise;
  }

  async function discord(invite) {
    const r = await fetch(`https://discord.com/api/v10/invites/${encodeURIComponent(invite)}?with_counts=true`);
    if (!r.ok) throw new Error('discord');
    return r.json();
  }

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const fmt = n => Number(n).toLocaleString();

  function settings(s) {
    return Object.assign({ siteName: "Danny's Hangout", tiktok: 'yokii_fn.alt', discordInvite: DEFAULT_INVITE, streamerName: 'yokii' }, s && s.settings);
  }

  async function init() {
    // mobile nav
    const t = $('.nav-toggle'), links = $('.nav-links');
    if (t) t.addEventListener('click', () => links.classList.toggle('open'));
    const page = location.pathname.split('/').pop() || 'index.html';
    $$('.nav-links a').forEach(a => { if (a.getAttribute('href') === page) a.classList.add('active'); });

    const s = await state();
    const st = settings(s);
    const discordUrl = 'https://discord.gg/' + st.discordInvite;
    const tiktokUrl = 'https://www.tiktok.com/@' + st.tiktok;
    $$('[data-discord]').forEach(a => a.href = discordUrl);
    $$('[data-tiktok]').forEach(a => a.href = tiktokUrl);
    $$('[data-tiktok-live]').forEach(a => a.href = tiktokUrl + '/live');
    $$('[data-site-name]').forEach(e => e.textContent = st.siteName);
    $$('[data-streamer]').forEach(e => e.textContent = st.streamerName);
    $$('[data-tiktok-name]').forEach(e => e.textContent = '@' + st.tiktok);
    $$('[data-clip-person]').forEach(e => e.textContent = st.clipPerson || 'fastdannydog');
    $$('[data-year]').forEach(e => e.textContent = new Date().getFullYear());

    const banner = $('.live-banner');
    if (banner && st.live) {
      banner.classList.add('on');
      banner.href = tiktokUrl + '/live';
      $('.live-note', banner).textContent = st.liveNote || 'Come hang out!';
    }

    // Discord numbers anywhere on the page
    if ($('[data-dc]')) {
      try {
        const d = await discord(st.discordInvite);
        $$('[data-dc=members]').forEach(e => countUp(e, d.approximate_member_count));
        $$('[data-dc=online]').forEach(e => countUp(e, d.approximate_presence_count));
        $$('[data-dc=name]').forEach(e => e.textContent = d.guild?.name || st.siteName);
        if (d.guild?.icon) $$('[data-dc=icon]').forEach(img => { img.src = `https://cdn.discordapp.com/icons/${d.guild.id}/${d.guild.icon}.png?size=256`; });
        document.dispatchEvent(new CustomEvent('discord', { detail: d }));
      } catch { $$('[data-dc=members],[data-dc=online]').forEach(e => e.textContent = '—'); }
    }
    return s;
  }

  function countUp(el, target) {
    const start = performance.now(), dur = 1200;
    const step = now => {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = fmt(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const ready = new Promise(r => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', r) : r()).then(init);
  return { api, state, settings, esc, $, $$, fmt, ready };
})();
