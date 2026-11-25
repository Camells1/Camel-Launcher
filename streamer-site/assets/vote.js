(async () => {
  const { $, esc } = Site;
  const box = $('#polls');
  const voted = (() => { try { return JSON.parse(localStorage.getItem('voted') || '{}'); } catch { return {}; } })();

  function closesIn(t) {
    const d = t - Date.now() / 1000;
    if (d < 3600) return `in ${Math.max(1, Math.round(d / 60))} min`;
    if (d < 86400) return `in ${Math.round(d / 3600)} hours`;
    return new Date(t * 1000).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function render(polls) {
    if (!polls.length) { box.innerHTML = '<section class="card center"><p class="muted">No polls right now. Check back after the next stream!</p></section>'; return; }
    box.innerHTML = polls.map(p => {
      const total = p.options.reduce((a, o) => a + o.votes, 0);
      const showResults = !p.open || p.id in voted;
      return `<section class="card" data-poll="${esc(p.id)}">
        <h2>${esc(p.question)}</h2>
        ${p.options.map((o, i) => {
          const pct = total ? Math.round(100 * o.votes / total) : 0;
          return `<button class="poll-opt ${voted[p.id] === i ? 'mine' : ''}" data-i="${i}" ${showResults ? 'disabled' : ''}>
            <div class="fill" style="width:${showResults ? pct : 0}%"></div>
            <span><b>${esc(o.text)}</b>${showResults ? `<em>${pct}% · ${o.votes}</em>` : ''}</span></button>`;
        }).join('')}
        <p class="muted small" style="margin:6px 0 0">${total} vote${total === 1 ? '' : 's'} · ${p.open ? (p.id in voted ? '✅ You voted' : '🟢 Open — tap to vote') : '⚫ Closed'}${p.open && p.closes ? ' · closes ' + closesIn(p.closes) : ''}</p>
      </section>`;
    }).join('');
  }

  box.addEventListener('click', async e => {
    const btn = e.target.closest('.poll-opt');
    if (!btn || btn.disabled) return;
    const card = btn.closest('[data-poll]'), id = card.dataset.poll, i = +btn.dataset.i;
    card.querySelectorAll('.poll-opt').forEach(b => b.disabled = true);
    const res = await Site.api('vote', { poll: id, option: i });
    if (res.error && !/already/i.test(res.error)) FX.toast(`<span class="toast-icon">⚠️</span><span><b>Hmm</b>${esc(res.error)}</span>`);
    else FX.unlock('voted');
    voted[id] = res.error ? -1 : i;
    try { localStorage.setItem('voted', JSON.stringify(voted)); } catch {}
    const s = await Site.api('state');
    render(s.polls || []);
  });

  const s = await Site.ready;
  if (s.error) { box.innerHTML = '<section class="card"><p>Polls need PHP on the web host.</p></section>'; return; }
  render(s.polls || []);
})();
