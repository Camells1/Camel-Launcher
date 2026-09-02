const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginBtn = document.getElementById('login-btn');
const loginBtnLabel = loginBtn.querySelector('.btn-label');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const accountName = document.getElementById('account-name');
const accountAvatar = document.getElementById('account-avatar');
const sessionStatus = document.getElementById('session-status');
const statusDot = document.getElementById('status-dot');

const railHome = document.getElementById('rail-home');
const railSettings = document.getElementById('rail-settings');
const railAddInstance = document.getElementById('rail-add-instance');
const railInstances = document.getElementById('rail-instances');
const newInstanceBtn = document.getElementById('new-instance-btn');
const instanceGrid = document.getElementById('instance-grid');

const pages = {
  home: document.getElementById('page-home'),
  instance: document.getElementById('page-instance'),
  settings: document.getElementById('page-settings'),
};

const instanceTitle = document.getElementById('instance-title');
const instanceSubtitle = document.getElementById('instance-subtitle');
const instanceIconLg = document.getElementById('instance-icon-lg');
const deleteInstanceBtn = document.getElementById('delete-instance-btn');
const instancePlayBtn = document.getElementById('instance-play-btn');
const playBtnLabel = instancePlayBtn.querySelector('.btn-label');
const playBtnSpinner = instancePlayBtn.querySelector('.spinner');
const playGlyph = instancePlayBtn.querySelector('.play-glyph');
const stopGlyph = instancePlayBtn.querySelector('.stop-glyph');
const progressBox = document.getElementById('progress-box');
const progressText = document.getElementById('progress-text');
const logContent = document.getElementById('log-content');

const installedMode = document.getElementById('installed-mode');
const browseMode = document.getElementById('browse-mode');
const browseContentBtn = document.getElementById('browse-content-btn');
const backToInstalledBtn = document.getElementById('back-to-installed-btn');
const updateAllBtn = document.getElementById('update-all-btn');
const installedFilterInput = document.getElementById('installed-filter');
const installedTbody = document.getElementById('installed-tbody');
const installedEmpty = document.getElementById('installed-empty');
const tableWrap = document.querySelector('.table-wrap');

const starterRow = document.getElementById('starter-row');
const modSearchInput = document.getElementById('mod-search');
const searchResults = document.getElementById('search-results');
const loadMoreBtn = document.getElementById('load-more-btn');
const resultsCount = document.getElementById('results-count');

const settingMinMem = document.getElementById('setting-minmem');
const settingMaxMem = document.getElementById('setting-maxmem');
const settingJava = document.getElementById('setting-java');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const settingsSaved = document.getElementById('settings-saved');

const modalOverlay = document.getElementById('modal-overlay');
const modalName = document.getElementById('modal-name');
const modalVersion = document.getElementById('modal-version');
const modalError = document.getElementById('modal-error');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalCreateBtn = document.getElementById('modal-create-btn');

const confirmOverlay = document.getElementById('confirm-overlay');
const confirmTitle = document.getElementById('confirm-title');
const confirmBody = document.getElementById('confirm-body');
const confirmOkBtn = document.getElementById('confirm-ok-btn');
const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
const toastStack = document.getElementById('toast-stack');

const TRASH_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/></svg>';

// Instance swatches are drawn from a curated desert palette rather than a
// full-spectrum HSL hash, so a rail of instances always harmonises with the
// theme. All are mid-luminance so the dark initial on top stays legible.
const SWATCH_PALETTE = [
  '#d98b3f', // ochre
  '#c25f3c', // terracotta
  '#a8474a', // clay red
  '#8c6a3f', // dune shadow
  '#c9a227', // golden yellow
  '#6f8f5e', // desert sage
  '#4f9e86', // oasis teal
  '#9b6b8f', // dusk mauve
  '#b8763a', // sienna
  '#7d8a4e', // olive scrub
];

let currentSettings = null;
let instances = [];
let currentPage = 'home';
let activeInstanceId = null;
let playingInstanceId = null;
let installedModsCache = [];
let installedProjectIds = new Set();

let searchQuery = '';
let searchOffset = 0;
let searchTotal = 0;
const PAGE_SIZE = 30;
let lastResults = [];

function currentInstance() {
  return instances.find((i) => i.id === activeInstanceId) || null;
}

function colorForId(id) {
  let hash = 0;
  for (let i = 0; i < String(id).length; i++) hash = (hash * 31 + String(id).charCodeAt(i)) >>> 0;
  return SWATCH_PALETTE[hash % SWATCH_PALETTE.length];
}

function initialFor(name) {
  return (name || '').trim().charAt(0).toUpperCase() || '?';
}

// Paints a swatch element: the colour rides on a CSS custom property so the
// stylesheet can derive the light/dark bevel edges from it via color-mix().
function paintSwatch(el, id) {
  el.style.setProperty('--swatch', colorForId(id));
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

function formatDownloads(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1000)}K`;
  return String(n || 0);
}

// Loads an icon into a slot without an inline onerror handler (which the CSP
// blocks) — a broken icon just leaves the empty inventory slot showing.
function fillIconSlot(slot, url) {
  if (!url) return;
  const img = document.createElement('img');
  img.alt = '';
  img.addEventListener('error', () => img.remove());
  img.src = url;
  slot.appendChild(img);
}

/* ---------- Toasts + themed confirm (replacing native alert/confirm) ---------- */

function toast(message, kind = 'info', ms = 4500) {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  const glyph = document.createElement('span');
  glyph.className = 'toast-glyph';
  glyph.textContent = kind === 'error' ? '✕' : kind === 'success' ? '✓' : '•';
  const msg = document.createElement('span');
  msg.className = 'toast-msg';
  msg.textContent = message;
  el.append(glyph, msg);
  toastStack.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 260);
  }, ms);
}

let confirmResolver = null;
function confirmDialog({ title, body, confirmLabel = 'Delete', danger = true }) {
  confirmTitle.textContent = title;
  confirmBody.textContent = body;
  confirmOkBtn.textContent = confirmLabel;
  confirmOkBtn.className = danger ? 'btn danger' : 'btn primary';
  confirmOverlay.classList.remove('hidden');
  confirmOkBtn.focus();
  return new Promise((resolve) => {
    confirmResolver = resolve;
  });
}
function closeConfirm(result) {
  confirmOverlay.classList.add('hidden');
  const resolve = confirmResolver;
  confirmResolver = null;
  if (resolve) resolve(result);
}
confirmOkBtn.addEventListener('click', () => closeConfirm(true));
confirmCancelBtn.addEventListener('click', () => closeConfirm(false));
confirmOverlay.addEventListener('click', (e) => {
  if (e.target === confirmOverlay) closeConfirm(false);
});

/* ---------- Pixel art ---------- */

function paintCamelPixelArt() {
  const art = window.camelArt;
  if (!art || !art.GRID) return;
  const { GRID: grid, PALETTE: palette } = art;
  const svgMarkup = grid
    .flatMap((row, y) =>
      [...row].map((code, x) => (code === '.' ? '' : `<rect x="${x}" y="${y}" width="1" height="1" fill="${palette[code]}"/>`))
    )
    .join('');
  document.querySelectorAll('.camel-pixel-slot').forEach((svg) => {
    svg.innerHTML = svgMarkup;
  });
}

function showApp() {
  loginScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
}
function showLogin() {
  loginScreen.classList.remove('hidden');
  appScreen.classList.add('hidden');
}

async function refreshAccountUi(account) {
  if (account && account.name) {
    accountName.textContent = account.name;
    if (account.uuid) accountAvatar.src = `https://crafatar.com/avatars/${account.uuid}?size=64&overlay`;
    showApp();
  } else {
    showLogin();
  }
}

/* ---------- Session status (right sidebar) ---------- */

function setSessionStatus(text, state) {
  sessionStatus.textContent = text;
  statusDot.className = state ? `status-dot ${state}` : 'status-dot';
}
function refreshSessionStatus(busy) {
  if (busy) return setSessionStatus('Preparing…', 'busy');
  if (playingInstanceId) {
    const inst = instances.find((i) => i.id === playingInstanceId);
    return setSessionStatus(`Running · ${inst ? inst.name : 'Minecraft'}`, 'live');
  }
  setSessionStatus('Idle', '');
}

async function init() {
  paintCamelPixelArt();
  const account = await window.mc.getAccount();
  await refreshAccountUi(account);
  if (!account) return;

  currentSettings = await window.mc.getSettings();
  settingMinMem.value = currentSettings.minMemoryMb;
  settingMaxMem.value = currentSettings.maxMemoryMb;
  settingJava.value = currentSettings.javaPath || '';

  instances = await window.mc.listInstances();
  renderRailInstances();
  renderInstanceGrid();
  refreshSessionStatus(false);
  showPage('home');
}

loginBtn.addEventListener('click', async () => {
  loginError.textContent = '';
  loginBtn.disabled = true;
  loginBtnLabel.textContent = 'Signing in…';
  try {
    const account = await window.mc.login();
    await refreshAccountUi(account);
    await init();
  } catch (err) {
    loginError.textContent = err.message || String(err);
  } finally {
    loginBtn.disabled = false;
    loginBtnLabel.textContent = 'Sign in with Microsoft';
  }
});

logoutBtn.addEventListener('click', async () => {
  await window.mc.logout();
  showLogin();
});

// ---- Page routing ----
function showPage(page) {
  currentPage = page;
  Object.entries(pages).forEach(([key, el]) => el.classList.toggle('active', key === page));
  railHome.classList.toggle('active', page === 'home');
  railSettings.classList.toggle('active', page === 'settings');
  document.querySelectorAll('.rail-swatch').forEach((el) => {
    el.classList.toggle('active', page === 'instance' && el.dataset.id === activeInstanceId);
  });
}

railHome.addEventListener('click', () => {
  renderInstanceGrid();
  showPage('home');
});
railSettings.addEventListener('click', () => showPage('settings'));

function renderRailInstances() {
  railInstances.innerHTML = '';
  instances.forEach((inst) => {
    const btn = document.createElement('button');
    btn.className = 'rail-swatch';
    btn.dataset.id = inst.id;
    btn.title = inst.name;
    paintSwatch(btn, inst.id);
    btn.textContent = initialFor(inst.name);
    btn.addEventListener('click', () => openInstance(inst.id));
    railInstances.appendChild(btn);
  });
}

function renderInstanceGrid() {
  instanceGrid.innerHTML = '';
  if (!instances.length) {
    const empty = document.createElement('p');
    empty.className = 'muted empty-hint';
    empty.textContent = 'No instances yet. Click "New Instance" to create your first modpack.';
    instanceGrid.appendChild(empty);
    return;
  }
  instances.forEach((inst) => {
    const card = document.createElement('div');
    card.className = 'instance-card';
    const running = playingInstanceId === inst.id;
    card.innerHTML = `
      <div class="rail-swatch"></div>
      <h4 class="ic-name">${escapeHtml(inst.name)}</h4>
      <div class="ic-meta">
        <span class="badge accent">Fabric</span>
        <span class="badge">${escapeHtml(inst.mcVersion)}</span>
        ${running ? '<span class="badge oasis">Running</span>' : ''}
      </div>
      <span class="ic-open">Open →</span>
    `;
    paintSwatch(card.querySelector('.rail-swatch'), inst.id);
    card.querySelector('.rail-swatch').textContent = initialFor(inst.name);
    card.addEventListener('click', () => openInstance(inst.id));
    instanceGrid.appendChild(card);
  });
}

// ---- Instance detail ----
async function openInstance(id) {
  activeInstanceId = id;
  const inst = currentInstance();
  if (!inst) return;

  instanceTitle.textContent = inst.name;
  instanceSubtitle.textContent = `Fabric · ${inst.mcVersion}`;
  instanceIconLg.className = 'instance-icon-lg rail-swatch';
  paintSwatch(instanceIconLg, inst.id);
  instanceIconLg.textContent = initialFor(inst.name);

  setInstancePlayState(playingInstanceId === id ? 'running' : 'idle');
  progressBox.classList.toggle('hidden', playingInstanceId !== id);

  switchITab('content');
  showInstalledMode();
  installedFilterInput.value = '';
  await loadInstalledMods();

  showPage('instance');
}

function setInstancePlayState(phase) {
  instancePlayBtn.disabled = phase === 'installing';
  playBtnSpinner.classList.toggle('hidden', phase !== 'installing');
  playGlyph.classList.toggle('hidden', phase !== 'idle');
  stopGlyph.classList.toggle('hidden', phase !== 'running');
  instancePlayBtn.classList.toggle('danger', phase === 'running');
  instancePlayBtn.classList.toggle('primary', phase !== 'running');
  playBtnLabel.textContent = phase === 'installing' ? 'Working…' : phase === 'running' ? 'Stop' : 'Play';
}

instancePlayBtn.addEventListener('click', async () => {
  if (playingInstanceId === activeInstanceId) {
    instancePlayBtn.disabled = true;
    await window.mc.stop();
    return;
  }
  setInstancePlayState('installing');
  refreshSessionStatus(true);
  progressBox.classList.remove('hidden');
  progressText.textContent = 'Starting…';
  logContent.textContent = '';
  try {
    await window.mc.play(activeInstanceId);
    playingInstanceId = activeInstanceId;
    setInstancePlayState('running');
    refreshSessionStatus(false);
    renderInstanceGrid();
  } catch (err) {
    progressText.textContent = `Error: ${err.message || err}`;
    setInstancePlayState('idle');
    refreshSessionStatus(false);
    toast(err.message || String(err), 'error');
  }
});

window.mc.onProgress(({ instanceId, msg }) => {
  if (instanceId === activeInstanceId) progressText.textContent = msg;
});
window.mc.onLog(({ instanceId, line }) => {
  if (instanceId === activeInstanceId) {
    logContent.textContent += line;
    logContent.scrollTop = logContent.scrollHeight;
  }
});
window.mc.onExit(({ instanceId, code, error }) => {
  if (playingInstanceId === instanceId) playingInstanceId = null;
  if (instanceId === activeInstanceId) {
    setInstancePlayState('idle');
    progressText.textContent = error ? `Failed to start: ${error}` : `Game exited (code ${code ?? 'unknown'}).`;
  }
  refreshSessionStatus(false);
  renderInstanceGrid();
  if (error) toast(`Failed to start: ${error}`, 'error');
});

deleteInstanceBtn.addEventListener('click', async () => {
  const inst = currentInstance();
  if (!inst) return;
  const ok = await confirmDialog({
    title: 'Delete instance',
    body: `Delete "${inst.name}" and all of its files — Minecraft, mods and saves? This cannot be undone.`,
    confirmLabel: 'Delete forever',
  });
  if (!ok) return;
  try {
    await window.mc.removeInstance(inst.id, { deleteFiles: true });
    instances = instances.filter((i) => i.id !== inst.id);
    activeInstanceId = null;
    renderRailInstances();
    renderInstanceGrid();
    showPage('home');
    toast(`Deleted "${inst.name}".`, 'success');
  } catch (err) {
    toast(err.message || String(err), 'error');
  }
});

// ---- Instance tabs ----
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => switchITab(btn.dataset.itab));
});
function switchITab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.itab === tab));
  document.querySelectorAll('.itab').forEach((el) => el.classList.toggle('active', el.id === `itab-${tab}`));
}

// ---- Content: installed table ----
function showInstalledMode() {
  installedMode.classList.remove('hidden');
  browseMode.classList.add('hidden');
}
function showBrowseMode() {
  installedMode.classList.add('hidden');
  browseMode.classList.remove('hidden');
  // Paint the quick-add chips straight away so the "Quick add" heading is
  // never left standing over an empty row while the search request is out.
  renderStarterMods();
  if (!lastResults.length) runSearch(true);
}
browseContentBtn.addEventListener('click', showBrowseMode);
backToInstalledBtn.addEventListener('click', async () => {
  showInstalledMode();
  await loadInstalledMods();
});

async function loadInstalledMods() {
  installedModsCache = await window.mc.listMods(activeInstanceId);
  installedProjectIds = new Set(installedModsCache.map((m) => m.projectId).filter(Boolean));
  renderInstalledTable();
}

installedFilterInput.addEventListener('input', renderInstalledTable);

function renderInstalledTable() {
  const filterText = installedFilterInput.value.trim().toLowerCase();
  const filtered = installedModsCache.filter((m) => !filterText || m.title.toLowerCase().includes(filterText));
  installedTbody.innerHTML = '';

  // Three distinct states rather than one: nothing installed, nothing
  // matching the filter, or rows.
  if (!installedModsCache.length) {
    installedEmpty.textContent = 'No content installed yet — click "Browse content" to add some.';
    installedEmpty.classList.remove('hidden');
  } else if (!filtered.length) {
    installedEmpty.textContent = 'No installed content matches that filter.';
    installedEmpty.classList.remove('hidden');
  } else {
    installedEmpty.classList.add('hidden');
  }
  if (tableWrap) tableWrap.classList.toggle('hidden', filtered.length === 0);

  const inst = currentInstance();
  filtered.forEach((mod) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="ct-project">
        <div class="icon-slot"></div>
        <div><div class="ct-title">${escapeHtml(mod.title)}</div><div class="ct-source">Modrinth</div></div>
      </td>
      <td class="ct-version">${escapeHtml(inst ? inst.mcVersion : '')}</td>
      <td class="ct-actions">
        <label class="switch" title="${mod.enabled ? 'Disable' : 'Enable'}"><input type="checkbox" ${mod.enabled ? 'checked' : ''} /><span class="switch-slider"></span></label>
        <button class="icon-btn danger" title="Remove">${TRASH_ICON}</button>
      </td>
    `;
    fillIconSlot(tr.querySelector('.icon-slot'), mod.iconUrl);
    tr.querySelector('.switch input').addEventListener('change', async () => {
      await window.mc.toggleMod(activeInstanceId, mod.filename);
      await loadInstalledMods();
    });
    tr.querySelector('.icon-btn').addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Remove content',
        body: `Remove "${mod.title}" from this instance?`,
        confirmLabel: 'Remove',
      });
      if (!ok) return;
      await window.mc.removeMod(activeInstanceId, mod.filename);
      await loadInstalledMods();
      toast(`Removed "${mod.title}".`, 'success');
    });
    installedTbody.appendChild(tr);
  });
}

updateAllBtn.addEventListener('click', async () => {
  updateAllBtn.disabled = true;
  updateAllBtn.textContent = 'Updating…';
  try {
    const { updated } = await window.mc.updateAllMods(activeInstanceId);
    await loadInstalledMods();
    updateAllBtn.textContent = updated ? `Updated ${updated}` : 'Up to date';
    toast(updated ? `Updated ${updated} project${updated === 1 ? '' : 's'}.` : 'Everything is already up to date.', 'success');
  } catch (err) {
    updateAllBtn.textContent = 'Update failed';
    toast(err.message || String(err), 'error');
  } finally {
    setTimeout(() => {
      updateAllBtn.disabled = false;
      updateAllBtn.textContent = 'Update all';
    }, 2000);
  }
});

// ---- Content: browse mode ----
function renderStarterMods() {
  starterRow.innerHTML = '';
  ((currentSettings && currentSettings.starterMods) || []).forEach((mod) => {
    const chip = document.createElement('button');
    const already = installedProjectIds.has(mod.slug);
    chip.className = already ? 'chip installed' : 'chip';
    chip.textContent = already ? `✓ ${mod.title}` : `+ ${mod.title}`;
    chip.disabled = already;
    chip.addEventListener('click', () => quickInstall(mod, chip));
    starterRow.appendChild(chip);
  });
}

async function quickInstall(mod, chip) {
  chip.disabled = true;
  chip.textContent = `Installing ${mod.title}…`;
  try {
    await window.mc.installMod(activeInstanceId, { slug: mod.slug, title: mod.title });
    await loadInstalledMods();
    renderStarterMods();
    renderSearchResults();
    toast(`Installed "${mod.title}".`, 'success');
  } catch (err) {
    chip.disabled = false;
    chip.textContent = `+ ${mod.title}`;
    toast(`Couldn't install ${mod.title}: ${err.message || err}`, 'error');
  }
}

let searchTimer = null;
modSearchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => runSearch(true), 350);
});

function skeletonCards(n) {
  return Array.from({ length: n })
    .map(
      () => `
      <div class="skel-card">
        <div class="skel skel-icon"></div>
        <div class="skel-lines">
          <div class="skel skel-line w60"></div>
          <div class="skel skel-line w90"></div>
          <div class="skel skel-line w40"></div>
        </div>
      </div>`
    )
    .join('');
}

async function runSearch(reset) {
  if (reset) {
    searchQuery = modSearchInput.value.trim();
    searchOffset = 0;
    lastResults = [];
    searchResults.innerHTML = skeletonCards(6);
    resultsCount.textContent = '';
    loadMoreBtn.classList.add('hidden');
  } else {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Loading…';
  }
  try {
    const page = await window.mc.searchMods(activeInstanceId, searchQuery, { limit: PAGE_SIZE, offset: searchOffset });
    searchTotal = page.total;
    lastResults = reset ? page.hits : [...lastResults, ...page.hits];
    searchOffset += page.hits.length;
    renderSearchResults();
    renderStarterMods();
  } catch (err) {
    searchResults.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'muted empty-note';
    p.textContent = `Couldn't reach Modrinth: ${err.message || err}`;
    searchResults.appendChild(p);
    toast(`Search failed: ${err.message || err}`, 'error');
  } finally {
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = 'Load more mods';
  }
}

function renderSearchResults() {
  searchResults.innerHTML = '';
  if (!lastResults.length) {
    const p = document.createElement('p');
    p.className = 'muted empty-note';
    p.textContent = 'No mods matched that search.';
    searchResults.appendChild(p);
  }
  lastResults.forEach((mod) => {
    const card = document.createElement('div');
    card.className = 'mod-card';
    const already = installedProjectIds.has(mod.id) || installedProjectIds.has(mod.slug);
    card.innerHTML = `
      <div class="icon-slot lg"></div>
      <div class="mod-info">
        <h4 class="mod-title">${escapeHtml(mod.title)}</h4>
        <span class="downloads">${formatDownloads(mod.downloads)} downloads</span>
        <p class="mod-desc">${escapeHtml(mod.description || '')}</p>
        <div class="mod-actions">
          <button class="btn small ${already ? 'secondary' : 'primary'}" ${already ? 'disabled' : ''}>${already ? '✓ Installed' : 'Install'}</button>
        </div>
      </div>
    `;
    fillIconSlot(card.querySelector('.icon-slot'), mod.iconUrl);
    const btn = card.querySelector('button');
    if (!already) {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Installing…';
        try {
          await window.mc.installMod(activeInstanceId, mod);
          await loadInstalledMods();
          renderStarterMods();
          renderSearchResults();
          toast(`Installed "${mod.title}".`, 'success');
        } catch (err) {
          btn.disabled = false;
          btn.textContent = 'Install';
          toast(err.message || String(err), 'error');
        }
      });
    }
    searchResults.appendChild(card);
  });
  resultsCount.textContent = searchTotal ? `${lastResults.length} of ${searchTotal} projects` : '';
  loadMoreBtn.classList.toggle('hidden', lastResults.length >= searchTotal);
}
loadMoreBtn.addEventListener('click', () => runSearch(false));

// ---- New instance modal ----
function openModal() {
  modalName.value = '';
  modalVersion.value = '1.21.1';
  modalError.textContent = '';
  modalOverlay.classList.remove('hidden');
  modalName.focus();
}
function closeModal() {
  modalOverlay.classList.add('hidden');
}
railAddInstance.addEventListener('click', openModal);
newInstanceBtn.addEventListener('click', openModal);
modalCancelBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

async function createInstanceFromModal() {
  const name = modalName.value.trim();
  const mcVersion = modalVersion.value.trim();
  if (!name || !mcVersion) {
    modalError.textContent = 'Name and version are both required.';
    return;
  }
  modalCreateBtn.disabled = true;
  try {
    const inst = await window.mc.createInstance({ name, mcVersion });
    instances.push(inst);
    renderRailInstances();
    renderInstanceGrid();
    closeModal();
    await openInstance(inst.id);
    toast(`Created "${inst.name}".`, 'success');
  } catch (err) {
    modalError.textContent = err.message || String(err);
  } finally {
    modalCreateBtn.disabled = false;
  }
}
modalCreateBtn.addEventListener('click', createInstanceFromModal);
[modalName, modalVersion].forEach((input) => {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createInstanceFromModal();
  });
});

// Escape closes whichever layer is on top.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!confirmOverlay.classList.contains('hidden')) closeConfirm(false);
  else if (!modalOverlay.classList.contains('hidden')) closeModal();
});

// ---- Settings page ----
saveSettingsBtn.addEventListener('click', async () => {
  const patch = {
    minMemoryMb: parseInt(settingMinMem.value, 10) || 2048,
    maxMemoryMb: parseInt(settingMaxMem.value, 10) || 4096,
    javaPath: settingJava.value.trim(),
  };
  currentSettings = { ...currentSettings, ...(await window.mc.setSettings(patch)) };
  settingsSaved.classList.remove('hidden');
  setTimeout(() => settingsSaved.classList.add('hidden'), 2000);
});

// ---- Easter egg: 1/100 chance an elephant wanders across the login screen ----
if (Math.random() < 0.01) {
  document.getElementById('elephant-walk').classList.remove('hidden');
  document.getElementById('elephant-caption').classList.remove('hidden');
}

init();
