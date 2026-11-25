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

  let livePromise = null;
  function live(fresh) {
    if (!livePromise || fresh) livePromise = api('live').then(d => d.error ? null : d).catch(() => null);
    return livePromise;
  }

  // One player for every kind of clip (spinner + anywhere else)
  function clipHtml(c, opts = {}) {
    const auto = opts.autoplay ? 1 : 0;
    const frame = src => `<iframe class="clip-frame" src="${esc(src)}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen title="Clip"></iframe>`;
    const id = encodeURIComponent(c.src || '');
    const host = location.hostname || 'localhost';
    const fallback = `<p class="muted small clip-fallback" hidden>This video can't play in your browser. <a href="${esc(c.src)}" target="_blank" rel="noopener">Download / open it</a></p>`;
    if (c.type === 'file' && /\.gif$/i.test(c.src)) return `<img class="clip-gif" src="${esc(c.src)}" alt="">`;
    if (c.type === 'file' || c.type === 'video_url')
      return `<video src="${esc(c.src)}" controls ${auto ? 'autoplay' : ''} playsinline onerror="this.nextElementSibling.hidden=false"></video>${fallback}`;
    if (c.type === 'tiktok') return frame(`https://www.tiktok.com/embed/v2/${id}`);
    if (c.type === 'embed') {
      const url = {
        'youtube': `https://www.youtube-nocookie.com/embed/${id}?autoplay=${auto}&rel=0` + ['clip', 'clipt', 'start', 'end'].filter(k => c[k]).map(k => `&${k}=${encodeURIComponent(c[k])}`).join(''),
        'twitch-clip': `https://clips.twitch.tv/embed?clip=${id}&parent=${host}&autoplay=${!!auto}`,
        'twitch-vod': `https://player.twitch.tv/?video=${id}&parent=${host}&autoplay=${!!auto}`,
        'instagram': `https://www.instagram.com/reel/${id}/embed`,
        'streamable': `https://streamable.com/e/${id}${auto ? '?autoplay=1' : ''}`,
        'medal': `https://medal.tv/clip/${id}?autoplay=${auto}`,
      }[c.provider];
      if (url) return frame(url) + (c.link ? `<p class="small" style="margin:8px 0 0"><a href="${esc(c.link)}" target="_blank" rel="noopener">Open original ↗</a></p>` : '');
    }
    let domain = '';
    try { domain = new URL(c.link || c.src).hostname.replace(/^www\./, ''); } catch {}
    return `<div class="clip-link"><div class="clip-link-icon">🔗</div><p>This clip is on <b>${esc(domain || 'another site')}</b></p>
      <a class="btn btn-gold" href="${esc(c.link || c.src)}" target="_blank" rel="noopener noreferrer">Watch it there ↗</a></div>`;
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
    const page = (location.pathname.split('/').pop() || 'index').replace(/\.html$/, '');
    $$('.nav-links a').forEach(a => {
      const h = (a.getAttribute('href') || '').replace(/^\.\//, '').replace(/\.html$/, '') || 'index';
      if (h === page) a.classList.add('active');
    });

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

    // LIVE banner: detected automatically from TikTok (or forced in admin)
    live().then(L => {
      const banner = $('.live-banner');
      const on = L && (L.live || st.live);
      document.documentElement.classList.toggle('is-live', !!on);
      $$('.nav-links a[href="live"]').forEach(a => a.classList.toggle('nav-live', !!on));
      if (!banner || !on) return;
      banner.classList.add('on');
      banner.href = tiktokUrl + '/live';
      const n = L.now;
      $('.live-note', banner).textContent = n ? `${n.title || st.liveNote || 'Come hang out!'} · ${fmt(n.viewers)} watching` : (st.liveNote || 'Come hang out!');
    });

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
  return { api, state, live, clipHtml, settings, esc, $, $$, fmt, ready };
})();
