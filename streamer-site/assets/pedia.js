// Yokii-pedia: inside jokes explained + a soundboard.
(async () => {
  const { $, $$, esc } = Site;
  const s = await Site.ready;
  const all = s.pedia || [];
  let playing;

  function play(src, btn) {
    if (playing) { playing.pause(); playing.btn?.classList.remove('playing'); }
    const a = new Audio(src);
    a.btn = btn; playing = a;
    btn?.classList.add('playing');
    a.onended = () => btn?.classList.remove('playing');
    a.play().catch(() => btn?.classList.remove('playing'));
  }

  const sounds = all.filter(e => e.sound);
  $('#board').innerHTML = sounds.length
    ? sounds.map(e => `<button class="sb-btn" data-src="${esc(e.sound)}"><span>🔊</span>${esc(e.term)}</button>`).join('')
    : '<p class="muted">No sounds yet.</p>';

  function render(q = '') {
    const list = all.filter(e => (e.term + ' ' + e.desc).toLowerCase().includes(q.toLowerCase()));
    $('#entries').innerHTML = list.length ? list.map(e => `
      <article class="entry" id="e-${esc(e.id)}">
        <h2 class="entry-term">${esc(e.term)}</h2>
        ${e.desc ? `<p>${esc(e.desc)}</p>` : ''}
        ${e.sound ? `<button class="entry-play" data-src="${esc(e.sound)}">🔊 Play in soundboard</button>` : ''}
      </article>`).join('')
      : `<p class="muted">${all.length ? 'Nothing found.' : 'The Yokii-pedia is empty for now. Know an inside joke? Post it in the Discord!'}</p>`;
  }
  render();
  $('#search').addEventListener('input', e => render(e.target.value.trim()));
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-src]');
    if (b) play(b.dataset.src, b);
  });
  $('#count').textContent = all.length ? `${all.length} entr${all.length === 1 ? 'y' : 'ies'}` : '';
})();
