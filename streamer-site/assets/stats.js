// Live tracker page: live status, top viewer count, charts and stream history.
(async () => {
  const { $, esc, fmt } = Site;
  const s = await Site.ready;
  const st = Site.settings(s);
  const tiktok = 'https://www.tiktok.com/@' + st.tiktok;

  const ago = t => {
    const d = Math.max(0, Date.now() / 1000 - t);
    if (d < 90) return 'just now';
    if (d < 3600) return Math.round(d / 60) + ' minutes ago';
    if (d < 86400 * 1.5) return Math.round(d / 3600) + ' hours ago';
    return Math.round(d / 86400) + ' days ago';
  };
  const dur = sec => {
    if (!sec || sec < 0) return '?';
    const h = Math.floor(sec / 3600), m = Math.round(sec % 3600 / 60);
    return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m} min`;
  };
  const day = t => new Date(t * 1000).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const clock = t => new Date(t * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  // ---------- line chart (one series, crosshair + tooltip on hover) ----------
  function niceMax(v) {
    if (v <= 5) return 5;
    const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function lineChart(box, pts, { xLabel, yLabel, tip, fromZero = true }) {
    const W = 760, H = 260, L = 44, R = 14, T = 14, B = 30;
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs) || x0 + 1;
    // round tick step (1, 2, 5 × 10ⁿ) so every axis label is a clean number
    const niceStep = raw => { const p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };
    const lo = fromZero ? 0 : Math.min(...ys), hi = Math.max(...ys, 1);
    const step = niceStep(Math.max((hi - lo) / 4, 1));
    let yMin = fromZero ? 0 : Math.max(0, Math.floor(lo / step) * step - step);  // fit the line to its own range (followers move slowly)
    let yMax = Math.ceil(hi / step) * step;
    if (yMax === hi && !fromZero) yMax += step;
    if (yMax <= yMin) yMax = yMin + step;
    const ticks = []; for (let v = yMin; v <= yMax + step / 2; v += step) ticks.push(v);
    const X = t => L + (W - L - R) * (x1 === x0 ? .5 : (t - x0) / (x1 - x0));
    const Y = v => T + (H - T - B) * (1 - (v - yMin) / (yMax - yMin));
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
    const area = `${line}L${X(x1).toFixed(1)},${Y(yMin)}L${X(x0).toFixed(1)},${Y(yMin)}Z`;
    const grid = ticks.map(v => {
      const y = Y(v);
      return `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="ch-grid"/><text x="${L - 8}" y="${y + 4}" class="ch-axis" text-anchor="end">${fmt(Math.round(v))}</text>`;
    }).join('');
    const nx = 5, xt = Array.from({ length: nx }, (_, i) => x0 + (x1 - x0) * i / (nx - 1));
    const xticks = (x1 === x0 ? [x0] : xt).map((t, i, a) => `<text x="${X(t)}" y="${H - 8}" class="ch-axis" text-anchor="${i === 0 && a.length > 1 ? 'start' : i === a.length - 1 && a.length > 1 ? 'end' : 'middle'}">${esc(xLabel(t))}</text>`).join('');
    const last = pts[pts.length - 1];
    box.innerHTML = `<div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(yLabel)}">
      ${grid}${xticks}
      <path d="${area}" class="ch-area"/><path d="${line}" class="ch-line"/>
      <circle cx="${X(last[0])}" cy="${Y(last[1])}" r="5" class="ch-end"/>
      <line class="ch-cross" y1="${T}" y2="${H - B}" x1="0" x2="0" visibility="hidden"/>
      <circle class="ch-dot" r="5" visibility="hidden"/>
      <rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent" class="ch-hit"/>
    </svg><div class="ch-tip" hidden></div></div>
    <details class="ch-table"><summary>Show as table</summary><div class="table-scroll"><table class="table"><tr><th>${esc(xLabel === clock ? 'Time' : 'Day')}</th><th>${esc(yLabel)}</th></tr>
      ${pts.slice().reverse().slice(0, 200).map(p => `<tr><td>${esc(tip(p).when)}</td><td>${fmt(p[1])}</td></tr>`).join('')}</table></div></details>`;
    const svg = box.querySelector('svg'), cross = svg.querySelector('.ch-cross'), dot = svg.querySelector('.ch-dot'), tipEl = box.querySelector('.ch-tip');
    svg.querySelector('.ch-hit').addEventListener('pointermove', e => {
      const r = svg.getBoundingClientRect(), mx = (e.clientX - r.left) / r.width * W;
      let best = pts[0];
      for (const p of pts) if (Math.abs(X(p[0]) - mx) < Math.abs(X(best[0]) - mx)) best = p;
      const cx = X(best[0]), cy = Y(best[1]);
      cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', cx); dot.setAttribute('cy', cy); dot.setAttribute('visibility', 'visible');
      const t = tip(best);
      tipEl.innerHTML = `<b>${fmt(best[1])}</b> ${esc(t.label)}<br><span>${esc(t.when)}</span>`;
      tipEl.hidden = false;
      const px = cx / W * r.width, py = cy / H * r.height;
      tipEl.style.left = Math.min(Math.max(px, 70), r.width - 70) + 'px';
      tipEl.style.top = Math.max(py - 12, 0) + 'px';
    });
    svg.querySelector('.ch-hit').addEventListener('pointerleave', () => {
      cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); tipEl.hidden = true;
    });
  }

  // ---------- render ----------
  function render(L) {
    if (!L) {
      $('#status').innerHTML = `<p class="muted">The live tracker needs PHP with curl on the web host. Ask your host to enable it.</p>`;
      return;
    }
    const live = L.autoLive && L.now;
    $('#statusCard').classList.toggle('on-air', !!live);

    if (live) {
      const n = L.now;
      $('#status').innerHTML = `
        <div class="air-badge"><span class="live-dot"></span> LIVE NOW</div>
        <h1 class="air-title">${esc(n.title || 'Live on TikTok')}</h1>
        <div class="air-stats">
          <div><b>${fmt(n.viewers)}</b><span>watching now</span></div>
          <div><b>${fmt(n.peak)}</b><span>peak this stream</span></div>
          <div><b>${dur(Date.now() / 1000 - n.start)}</b><span>live for</span></div>
          <div><b>${fmt(n.total)}</b><span>total viewers</span></div>
        </div>
        <a class="btn btn-tiktok btn-big" href="${tiktok}/live" target="_blank" rel="noopener">▶ Watch on TikTok</a>`;
    } else {
      const l = L.last;
      const lastLine = l
        ? `Last live <b>${ago(l.end || l.start)}</b>${l.end && !l.partial ? `, lasted ${dur(l.end - l.start)}` : ''}${l.total ? `, <b>${fmt(l.total)}</b> viewers` : ''}${l.title ? ` · “${esc(l.title)}”` : ''}`
        : 'No streams tracked yet.';
      $('#status').innerHTML = `
        <div class="air-badge off">OFFLINE</div>
        <h1 class="air-title">${L.live ? 'Live soon' : 'Not live right now'}</h1>
        <p class="muted" style="margin:0 0 18px">${lastLine}</p>
        <div class="btn-row status-actions">
          <a class="btn btn-discord" data-discord href="https://discord.gg/${esc(st.discordInvite)}" target="_blank" rel="noopener">🔔 Get pinged when he goes live</a>
          <a class="btn" href="${tiktok}" target="_blank" rel="noopener">TikTok profile</a>
        </div>`;
    }

    // tiles
    const p = L.profile || {}, pk = L.peak;
    $('#tiles').innerHTML = [
      [pk ? fmt(pk.viewers) : '—', 'top viewer count', pk ? day(pk.at) : 'record starts at the next live', true],
      [p.followers != null ? fmt(p.followers) : '—', 'TikTok followers', ''],
      [p.likes != null ? fmt(p.likes) : '—', 'likes', ''],
      [fmt(L.totals.streams), 'streams tracked', ''],
      [L.totals.hours ? L.totals.hours + 'h' : '—', 'hours live', 'tracked by this site'],
      [L.totals.avgPeak != null ? fmt(L.totals.avgPeak) : '—', 'average peak', ''],
    ].map(([v, label, sub, hero]) => `<div class="stat${hero ? ' stat-hero' : ''}"><b>${v}</b><span>${label}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`).join('');

    // viewers chart
    const c = L.chart;
    if (c && c.samples.length > 1) {
      $('#viewersTitle').textContent = c.live ? 'Viewers right now' : `Viewers last tracked stream · ${day(c.start)}`;
      lineChart($('#viewersChart'), c.samples, { xLabel: clock, yLabel: 'viewers', tip: p => ({ label: 'watching', when: day(p[0]) + ' ' + clock(p[0]) }) });
    } else {
      $('#viewersTitle').textContent = 'Viewers during a stream';
      $('#viewersChart').innerHTML = `<p class="muted">The chart fills in during his next live: the site saves the viewer count every minute.</p>`;
    }

    // followers chart
    const f = (L.followers || []).map(([d, n]) => [Date.parse(d + 'T12:00:00Z') / 1000, n]);
    if (f.length > 1) {
      const dayLabel = t => new Date(t * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      lineChart($('#followersChart'), f, { xLabel: dayLabel, yLabel: 'followers', fromZero: false, tip: p => ({ label: 'followers', when: day(p[0]) }) });
      const diff = f[f.length - 1][1] - f[0][1];
      $('#followersNote').textContent = `${diff >= 0 ? '+' : ''}${fmt(diff)} since ${day(f[0][0])}`;
    } else {
      $('#followersChart').innerHTML = `<p class="muted">${p.followers != null ? `<b>${fmt(p.followers)}</b> followers today. ` : ''}The growth chart fills in day by day.</p>`;
      $('#followersNote').textContent = '';
    }

    // history
    const rows = L.history || [];
    $('#history').innerHTML = rows.length ? `<div class="table-scroll"><table class="table hist">
      <tr><th>Date</th><th>Title</th><th>Length</th><th>Peak</th><th>Viewers</th></tr>
      ${rows.map(r => `<tr${pk && r.peak === pk.viewers && r.peak ? ' class="record"' : ''}>
        <td>${day(r.start)}<br><span class="muted small">${clock(r.start)}</span></td>
        <td>${esc(r.title || '—')}</td>
        <td>${r.end && !r.partial ? dur(r.end - r.start) : '?'}</td>
        <td>${r.peak ? fmt(r.peak) + (pk && r.peak === pk.viewers ? ' 🏆' : '') : '?'}</td>
        <td>${r.total ? fmt(r.total) : '?'}</td></tr>`).join('')}
    </table></div>` : '<p class="muted">The history fills in from his next stream on.</p>';

    $('#updated').textContent = L.ok ? `Updated ${new Date(L.checkedAt * 1000).toLocaleTimeString()} · data from TikTok` : 'Could not reach TikTok right now, showing saved data.';
  }

  let L = await Site.live();
  render(L);
  // keep it fresh: every 30 s while live, every 2 min otherwise
  const loop = async () => {
    L = await Site.live(true);
    render(L);
    setTimeout(loop, L && L.autoLive ? 30000 : 120000);
  };
  setTimeout(loop, L && L.autoLive ? 30000 : 120000);
})();

// =====================================================================
//  Top 5 most said in chat: counted automatically by the chat collector
//  (or the backup list from admin). Pops in like live chat, #1 last.
// =====================================================================
(async () => {
  const { $, $$, esc, fmt } = Site;
  const s = await Site.ready;
  let chat = s.chat || { source: 'manual', top: s.chatTop || [] };
  let view = 'top';
  const feed = $('#chatFeed');
  const COLORS = ['#f6c744', '#25f4ee', '#fe2c55', '#80ff20', '#b18cff'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rank = i => ['👑', '🥈', '🥉', '#4', '#5'][i];
  let lastKey = '';

  function bubble(r, i) {
    const el = document.createElement('div');
    el.className = 'chat-msg' + (i === 0 ? ' chat-top' : '');
    el.innerHTML = `<span class="chat-rank${i < 3 ? ' chat-medal' : ''}">${rank(i)}</span>
      <span class="chat-body"><b style="color:${COLORS[i]}">chat</b> ${esc(r.msg)}</span>
      <span class="chat-count">×${fmt(r.count)}</span>`;
    return el;
  }

  function list() { return ((view === 'all' ? chat.all : chat.top) || []).slice(0, 5); }

  function play(animate = true) {
    const top = list();
    $('#chatCard').hidden = !(chat.top || []).length && !(chat.all || []).length;
    const tabs = $('#chatTabs');
    tabs.hidden = chat.source !== 'auto';
    if (chat.source === 'auto') {
      tabs.querySelector('[data-v=top]').textContent = chat.live ? '🔴 This stream' : 'Last stream';
      $$('#chatTabs button').forEach(b => b.classList.toggle('on', b.dataset.v === view));
      $('#chatNote').textContent = chat.updated ? `Counted automatically from the live chat · updated ${new Date(chat.updated * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';
    }
    feed.innerHTML = '';
    if (!top.length) { feed.innerHTML = '<p class="muted">Nothing counted yet.</p>'; return; }
    top.map((r, i) => [r, i]).reverse().forEach(([r, i], n) => {
      const el = bubble(r, i);
      if (animate && !reduced) { el.classList.add('pop'); el.style.animationDelay = (n * 0.4) + 's'; }
      feed.prepend(el);
    });
  }

  $$('#chatTabs button').forEach(b => b.addEventListener('click', () => { view = b.dataset.v; play(); }));

  let shown = false;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !shown) { shown = true; play(); }
  }).observe($('#chatCard'));
  play(false);

  // gifts: this stream's coins + latest gifts
  function gifts(g) {
    if (!g || !g.latest || !g.latest.length) return;
    $('#giftCard').hidden = false;
    $('#giftTotal').textContent = g.coins ? `${fmt(g.coins)} coins this stream` : '';
    const ago = t => { const d = Date.now() / 1000 - t; return d < 90 ? 'just now' : d < 3600 ? Math.round(d / 60) + ' min ago' : Math.round(d / 3600) + ' h ago'; };
    $('#giftList').innerHTML = g.latest.map(x => `<div class="gift-row"><span class="gift-icon">🎁</span>
      <span class="gift-text"><b>${esc(x.u)}</b> sent <b>${esc(x.g)}</b>${x.n > 1 ? ` ×${fmt(x.n)}` : ''}</span>
      <span class="gift-coins">${fmt(x.coins)} 🪙</span><span class="muted small">${ago(x.t)}</span></div>`).join('');
  }
  gifts(s.gifts);

  // refresh every 30 s; only re-animate when the ranking changed
  setInterval(async () => {
    const fresh = await Site.api('chat').catch(() => null);
    if (!fresh || fresh.error) return;
    gifts(fresh.gifts);
    chat = fresh;
    const key = JSON.stringify(list());
    if (key !== lastKey) { lastKey = key; play(shown); }
  }, 30000);
  lastKey = JSON.stringify(list());
})();
