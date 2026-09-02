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
  skins: document.getElementById('page-skins'),
};

const railSkins = document.getElementById('rail-skins');
const jumpInSection = document.getElementById('jump-in-section');
const jumpInList = document.getElementById('jump-in-list');

const skinPreviewImg = document.getElementById('skin-preview-img');
const skinEmpty = document.getElementById('skin-empty');
const skinVariantTabs = document.getElementById('skin-variant-tabs');
const skinUploadBtn = document.getElementById('skin-upload-btn');
const skinResetBtn = document.getElementById('skin-reset-btn');
const skinError = document.getElementById('skin-error');

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

const instanceSettingsBtn = document.getElementById('instance-settings-btn');
const instanceSettingsOverlay = document.getElementById('instance-settings-overlay');
const instSettingMinMem = document.getElementById('inst-setting-minmem');
const instSettingMaxMem = document.getElementById('inst-setting-maxmem');
const instSettingJava = document.getElementById('inst-setting-java');
const instanceSettingsCancelBtn = document.getElementById('instance-settings-cancel-btn');
const instanceSettingsSaveBtn = document.getElementById('instance-settings-save-btn');

const accountCardToggle = document.getElementById('account-card-toggle');
const accountList = document.getElementById('account-list');

const updateBadge = document.getElementById('update-badge');
const exportModpackBtn = document.getElementById('export-modpack-btn');
const importModpackBtn = document.getElementById('import-modpack-btn');
const contentTypeTabs = document.getElementById('content-type-tabs');

const worldsTbody = document.getElementById('worlds-tbody');
const worldsEmpty = document.getElementById('worlds-empty');
const openWorldsFolderBtn = document.getElementById('open-worlds-folder-btn');

const screenshotsGrid = document.getElementById('screenshots-grid');
const screenshotsEmpty = document.getElementById('screenshots-empty');
const openScreenshotsFolderBtn = document.getElementById('open-screenshots-folder-btn');

const serverNameInput = document.getElementById('server-name-input');
const serverAddressInput = document.getElementById('server-address-input');
const addServerBtn = document.getElementById('add-server-btn');
const serversTbody = document.getElementById('servers-tbody');
const serversEmpty = document.getElementById('servers-empty');

const TRASH_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/></svg>';
const FOLDER_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></svg>';
const PLAY_ICON = '<svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l13 8-13 8z"/></svg>';

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
let currentContentType = 'mod';

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

function toast(message, kind = 'info', ms = 4500, action = null) {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  const glyph = document.createElement('span');
  glyph.className = 'toast-glyph';
  glyph.textContent = kind === 'error' ? '✕' : kind === 'success' ? '✓' : '•';
  const msg = document.createElement('span');
  msg.className = 'toast-msg';
  msg.textContent = message;
  el.append(glyph, msg);
  if (action) {
    const btn = document.createElement('button');
    btn.className = 'link-btn toast-action';
    btn.textContent = action.label;
    btn.addEventListener('click', action.onClick);
    el.append(btn);
    ms = Math.max(ms, 9000);
  }
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

/* ---------- Multi-account switcher ---------- */

let accountListOpen = false;

function closeAccountList() {
  accountListOpen = false;
  accountList.classList.add('hidden');
  accountCardToggle.setAttribute('aria-expanded', 'false');
}

async function toggleAccountList() {
  accountListOpen = !accountListOpen;
  accountCardToggle.setAttribute('aria-expanded', String(accountListOpen));
  accountList.classList.toggle('hidden', !accountListOpen);
  if (accountListOpen) await renderAccountList();
}

async function renderAccountList() {
  const accounts = await window.mc.listAccounts();
  accountList.innerHTML = '';
  accounts.forEach((acc) => {
    const row = document.createElement('button');
    row.className = `account-list-item${acc.active ? ' active' : ''}`;
    row.type = 'button';
    row.innerHTML = `
      <div class="avatar-slot"><img src="https://crafatar.com/avatars/${acc.uuid}?size=32&overlay" alt="" /></div>
      <span class="acct-name">${escapeHtml(acc.name)}</span>
      ${acc.active ? '' : `<button type="button" class="icon-btn danger acct-remove" title="Forget this account">${TRASH_ICON}</button>`}
    `;
    if (!acc.active) {
      row.addEventListener('click', async (e) => {
        if (e.target.closest('.acct-remove')) return;
        try {
          const account = await window.mc.switchAccount(acc.uuid);
          await refreshAccountUi(account);
          closeAccountList();
          toast(`Switched to ${account.name}.`, 'success');
        } catch (err) {
          toast(err.message || String(err), 'error');
        }
      });
      row.querySelector('.acct-remove').addEventListener('click', async (e) => {
        e.stopPropagation();
        await window.mc.removeAccount(acc.uuid);
        toast(`Forgot ${acc.name}.`, 'info');
        await renderAccountList();
      });
    }
    accountList.appendChild(row);
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'account-list-add';
  addBtn.type = 'button';
  addBtn.textContent = '+ Add another account';
  addBtn.addEventListener('click', async () => {
    addBtn.disabled = true;
    addBtn.textContent = 'Signing in…';
    try {
      const account = await window.mc.addAnotherAccount();
      await refreshAccountUi(account);
      closeAccountList();
      toast(`Signed in as ${account.name}.`, 'success');
    } catch (err) {
      toast(err.message || String(err), 'error');
    } finally {
      addBtn.disabled = false;
      addBtn.textContent = '+ Add another account';
    }
  });
  accountList.appendChild(addBtn);
}

accountCardToggle.addEventListener('click', toggleAccountList);
document.addEventListener('click', (e) => {
  if (accountListOpen && !e.target.closest('#account-card-toggle') && !e.target.closest('#account-list')) closeAccountList();
});

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
  loadRecentActivity();
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
  railSkins.classList.toggle('active', page === 'skins');
  document.querySelectorAll('.rail-swatch').forEach((el) => {
    el.classList.toggle('active', page === 'instance' && el.dataset.id === activeInstanceId);
  });
}

railHome.addEventListener('click', () => {
  renderInstanceGrid();
  loadRecentActivity();
  showPage('home');
});
railSettings.addEventListener('click', () => showPage('settings'));
railSkins.addEventListener('click', () => {
  loadSkin();
  showPage('skins');
});

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

function timeAgo(ms) {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'yesterday';
  if (day < 7) return `${day} days ago`;
  return new Date(ms).toLocaleDateString();
}

// "Jump in" - a merged, most-recent-first feed of instances and saved
// servers you've actually launched, matching the "recently played" pattern
// from Modrinth's own Home page.
async function loadRecentActivity() {
  const items = await window.mc.getRecentActivity(6);
  jumpInSection.classList.toggle('hidden', items.length === 0);
  jumpInList.innerHTML = '';
  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'jump-in-card panel';
    card.innerHTML = `
      <div class="rail-swatch"></div>
      <div class="jump-info">
        <div class="jump-name">${escapeHtml(item.name)}</div>
        <div class="jump-sub">${escapeHtml(item.subtitle)}</div>
      </div>
      <span class="jump-ago">${timeAgo(item.lastPlayedAt)}</span>
      <button class="icon-btn primary jump-play" title="Play">${PLAY_ICON}</button>
    `;
    paintSwatch(card.querySelector('.rail-swatch'), item.instanceId);
    card.querySelector('.rail-swatch').textContent = initialFor(item.name);
    card.addEventListener('click', async () => {
      await openInstance(item.instanceId);
      if (item.type === 'server') switchITab('servers');
    });
    card.querySelector('.jump-play').addEventListener('click', async (e) => {
      e.stopPropagation();
      await openInstance(item.instanceId);
      startPlay(item.type === 'server' ? item.serverId : undefined);
    });
    jumpInList.appendChild(card);
  });
}

// ---- Skins ----
let skinCurrentVariant = 'classic';

function skinVariantOf(skins) {
  const active = (skins || []).find((s) => s.state === 'ACTIVE');
  return (active && active.variant && active.variant.toLowerCase()) || 'classic';
}

async function loadSkin() {
  skinError.textContent = '';
  try {
    const { skins: skinList } = await window.mc.getSkin();
    const active = (skinList || []).find((s) => s.state === 'ACTIVE');
    if (active) {
      skinPreviewImg.src = active.url;
      skinPreviewImg.classList.remove('hidden');
      skinEmpty.classList.add('hidden');
      skinCurrentVariant = skinVariantOf(skinList);
    } else {
      skinPreviewImg.classList.add('hidden');
      skinEmpty.classList.remove('hidden');
    }
    skinVariantTabs.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.variant === skinCurrentVariant));
  } catch (err) {
    skinError.textContent = err.message || String(err);
  }
}

skinVariantTabs.querySelectorAll('.seg-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const variant = btn.dataset.variant;
    if (variant === skinCurrentVariant) return;
    skinVariantTabs.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
    try {
      const { skins: skinList } = await window.mc.setSkinFromUrl(skinPreviewImg.src, variant);
      skinCurrentVariant = variant;
      const active = (skinList || []).find((s) => s.state === 'ACTIVE');
      if (active) skinPreviewImg.src = active.url;
      toast('Model updated.', 'success');
    } catch (err) {
      toast(err.message || String(err), 'error');
      loadSkin();
    }
  });
});

skinUploadBtn.addEventListener('click', async () => {
  skinUploadBtn.disabled = true;
  skinError.textContent = '';
  try {
    const result = await window.mc.uploadSkin(skinCurrentVariant);
    if (result.canceled) return;
    const active = (result.skins || []).find((s) => s.state === 'ACTIVE');
    if (active) {
      skinPreviewImg.src = active.url;
      skinPreviewImg.classList.remove('hidden');
      skinEmpty.classList.add('hidden');
    }
    toast('Skin updated.', 'success');
  } catch (err) {
    skinError.textContent = err.message || String(err);
  } finally {
    skinUploadBtn.disabled = false;
  }
});

skinResetBtn.addEventListener('click', async () => {
  skinResetBtn.disabled = true;
  try {
    await window.mc.resetSkin();
    await loadSkin();
    toast('Reset to the default skin.', 'success');
  } catch (err) {
    toast(err.message || String(err), 'error');
  } finally {
    skinResetBtn.disabled = false;
  }
});

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
  setContentType('mod');
  await loadInstalledMods();
  refreshUpdateBadge();

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

// Shared by the header Play button and each server row's "Play & Join".
async function startPlay(serverId) {
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
    await window.mc.play(activeInstanceId, serverId);
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
}
instancePlayBtn.addEventListener('click', () => startPlay());

window.mc.onProgress(({ instanceId, msg }) => {
  if (instanceId === activeInstanceId) progressText.textContent = msg;
});
window.mc.onLog(({ instanceId, line }) => {
  if (instanceId === activeInstanceId) {
    logContent.textContent += line;
    logContent.scrollTop = logContent.scrollHeight;
  }
});
window.mc.onExit(({ instanceId, code, error, crash }) => {
  if (playingInstanceId === instanceId) playingInstanceId = null;
  if (instanceId === activeInstanceId) {
    setInstancePlayState('idle');
    progressText.textContent = error ? `Failed to start: ${error}` : `Game exited (code ${code ?? 'unknown'}).`;
  }
  refreshSessionStatus(false);
  renderInstanceGrid();
  if (error) {
    toast(`Failed to start: ${error}`, 'error');
  } else if (crash) {
    const summary = crash.description || crash.exceptionLine || 'The game crashed.';
    toast(`Crashed: ${summary}`, 'error', 8000, {
      label: 'View report',
      onClick: () => window.mc.openPath(crash.path),
    });
  }
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

// ---- Instance settings (per-instance Java/memory overrides) ----
instanceSettingsBtn.addEventListener('click', () => {
  const inst = currentInstance();
  if (!inst) return;
  instSettingMinMem.value = inst.minMemoryMb || '';
  instSettingMaxMem.value = inst.maxMemoryMb || '';
  instSettingJava.value = inst.javaPath || '';
  instanceSettingsOverlay.classList.remove('hidden');
});
instanceSettingsCancelBtn.addEventListener('click', () => instanceSettingsOverlay.classList.add('hidden'));
instanceSettingsOverlay.addEventListener('click', (e) => {
  if (e.target === instanceSettingsOverlay) instanceSettingsOverlay.classList.add('hidden');
});
instanceSettingsSaveBtn.addEventListener('click', async () => {
  const inst = currentInstance();
  if (!inst) return;
  const patch = {
    minMemoryMb: instSettingMinMem.value ? parseInt(instSettingMinMem.value, 10) : null,
    maxMemoryMb: instSettingMaxMem.value ? parseInt(instSettingMaxMem.value, 10) : null,
    javaPath: instSettingJava.value.trim() || null,
  };
  try {
    const updated = await window.mc.updateInstance(inst.id, patch);
    instances = instances.map((i) => (i.id === updated.id ? updated : i));
    instanceSettingsOverlay.classList.add('hidden');
    toast('Instance settings saved.', 'success');
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
  if (tab === 'worlds') loadWorlds();
  else if (tab === 'screenshots') loadScreenshots();
  else if (tab === 'servers') loadServers();
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

// ---- Content type: Mods / Resource Packs / Shaders ----
function setContentType(type) {
  currentContentType = type;
  document.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.ptype === type));
  const isMods = type === 'mod';
  document.querySelector('.starter-label').classList.toggle('hidden', !isMods);
  starterRow.classList.toggle('hidden', !isMods);
  modSearchInput.placeholder =
    type === 'resourcepack' ? 'Search resource packs on Modrinth...' : type === 'shader' ? 'Search shader packs on Modrinth...' : 'Search all of Modrinth...';
}
contentTypeTabs.querySelectorAll('.seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    // Servers aren't a Modrinth-search category - they're this instance's own
    // saved server list, which already has a full tab. Jump there instead of
    // duplicating that UI inside Browse.
    if (btn.dataset.ptype === 'server') {
      showInstalledMode();
      switchITab('servers');
      return;
    }
    setContentType(btn.dataset.ptype);
    runSearch(true);
  });
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

const updateAllLabel = updateAllBtn.querySelector('.btn-label');

updateAllBtn.addEventListener('click', async () => {
  updateAllBtn.disabled = true;
  updateAllLabel.textContent = 'Updating…';
  try {
    const { updated } = await window.mc.updateAllMods(activeInstanceId);
    await loadInstalledMods();
    updateAllLabel.textContent = updated ? `Updated ${updated}` : 'Up to date';
    toast(updated ? `Updated ${updated} project${updated === 1 ? '' : 's'}.` : 'Everything is already up to date.', 'success');
    refreshUpdateBadge();
  } catch (err) {
    updateAllLabel.textContent = 'Update failed';
    toast(err.message || String(err), 'error');
  } finally {
    setTimeout(() => {
      updateAllBtn.disabled = false;
      updateAllLabel.textContent = 'Update all';
    }, 2000);
  }
});

// Checks (without downloading) how many installed mods have a newer build,
// and badges the Update all button. Best-effort: a lookup failure just means
// no badge, never an error the player has to deal with.
async function refreshUpdateBadge() {
  updateBadge.classList.add('hidden');
  try {
    const { updatable } = await window.mc.checkModUpdates(activeInstanceId);
    if (updatable > 0) {
      updateBadge.textContent = String(updatable);
      updateBadge.classList.remove('hidden');
    }
  } catch {
    // silent - this is a nice-to-have indicator, not a critical path
  }
}

exportModpackBtn.addEventListener('click', async () => {
  try {
    const result = await window.mc.exportModpack(activeInstanceId);
    if (!result.canceled) toast(`Exported to ${result.filePath}.`, 'success');
  } catch (err) {
    toast(err.message || String(err), 'error');
  }
});

importModpackBtn.addEventListener('click', async () => {
  try {
    const result = await window.mc.importModpack(activeInstanceId);
    if (result.canceled) return;
    await loadInstalledMods();
    refreshUpdateBadge();
    if (result.failed.length) {
      toast(`Installed ${result.installed}, ${result.failed.length} failed.`, 'error');
    } else {
      toast(`Installed ${result.installed} mod${result.installed === 1 ? '' : 's'} from the modpack.`, 'success');
    }
  } catch (err) {
    toast(err.message || String(err), 'error');
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

// Turns an installProject() result (the primary project + any auto-installed
// required dependencies) into a friendly toast message.
function describeInstall(title, installedList) {
  const extras = (installedList || []).slice(1).map((m) => m.title);
  return extras.length ? `Installed "${title}" (+ ${extras.join(', ')}).` : `Installed "${title}".`;
}

async function quickInstall(mod, chip) {
  chip.disabled = true;
  chip.textContent = `Installing ${mod.title}…`;
  try {
    const result = await window.mc.installMod(activeInstanceId, { slug: mod.slug, title: mod.title }, { projectType: 'mod' });
    await loadInstalledMods();
    renderStarterMods();
    renderSearchResults();
    refreshUpdateBadge();
    toast(describeInstall(mod.title, result), 'success');
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
    const page = await window.mc.searchMods(activeInstanceId, searchQuery, {
      limit: PAGE_SIZE,
      offset: searchOffset,
      projectType: currentContentType,
    });
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
          const result = await window.mc.installMod(activeInstanceId, mod, { projectType: currentContentType });
          if (currentContentType === 'mod') {
            await loadInstalledMods();
            renderStarterMods();
            refreshUpdateBadge();
          } else {
            installedProjectIds.add(mod.id);
          }
          renderSearchResults();
          toast(describeInstall(mod.title, result), 'success');
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

// ---- Worlds ----
function formatDate(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

async function loadWorlds() {
  const list = await window.mc.listWorlds(activeInstanceId);
  worldsTbody.innerHTML = '';
  worldsEmpty.classList.toggle('hidden', list.length !== 0);
  list.forEach((world) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="ct-title">${escapeHtml(world.name)}</td>
      <td class="ct-version">${formatDate(world.lastPlayed)}</td>
      <td class="ct-actions">
        <button class="icon-btn" title="Open folder">${FOLDER_ICON}</button>
        <button class="icon-btn danger" title="Delete world">${TRASH_ICON}</button>
      </td>
    `;
    tr.querySelectorAll('.icon-btn')[0].addEventListener('click', () => window.mc.openWorldFolder(activeInstanceId, world.name));
    tr.querySelectorAll('.icon-btn')[1].addEventListener('click', async () => {
      const ok = await confirmDialog({ title: 'Delete world', body: `Permanently delete "${world.name}"? This cannot be undone.`, confirmLabel: 'Delete forever' });
      if (!ok) return;
      await window.mc.deleteWorld(activeInstanceId, world.name);
      await loadWorlds();
      toast(`Deleted world "${world.name}".`, 'success');
    });
    worldsTbody.appendChild(tr);
  });
}
openWorldsFolderBtn.addEventListener('click', () => window.mc.openWorldFolder(activeInstanceId, ''));

// ---- Screenshots ----
async function loadScreenshots() {
  const list = await window.mc.listScreenshots(activeInstanceId);
  screenshotsGrid.innerHTML = '';
  screenshotsEmpty.classList.toggle('hidden', list.length !== 0);
  list.forEach((shot) => {
    const card = document.createElement('div');
    card.className = 'screenshot-card';
    card.innerHTML = `
      <img src="${shot.url}" alt="${escapeHtml(shot.name)}" loading="lazy" />
      <button class="icon-btn danger shot-remove" title="Delete screenshot">${TRASH_ICON}</button>
    `;
    card.querySelector('.shot-remove').addEventListener('click', async (e) => {
      e.stopPropagation();
      await window.mc.deleteScreenshot(activeInstanceId, shot.name);
      await loadScreenshots();
    });
    screenshotsGrid.appendChild(card);
  });
}
openScreenshotsFolderBtn.addEventListener('click', () => window.mc.openScreenshotsFolder(activeInstanceId));

// ---- Servers ----
async function loadServers() {
  const list = await window.mc.listServers(activeInstanceId);
  serversTbody.innerHTML = '';
  serversEmpty.classList.toggle('hidden', list.length !== 0);
  list.forEach((server) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="ct-title">${escapeHtml(server.name)}</td>
      <td class="ct-version">${escapeHtml(server.address)}</td>
      <td class="ct-actions">
        <button class="btn small primary">${PLAY_ICON}Join</button>
        <button class="icon-btn danger" title="Remove server">${TRASH_ICON}</button>
      </td>
    `;
    tr.querySelector('.btn.primary').addEventListener('click', () => startPlay(server.id));
    tr.querySelector('.icon-btn').addEventListener('click', async () => {
      await window.mc.removeServer(activeInstanceId, server.id);
      await loadServers();
    });
    serversTbody.appendChild(tr);
  });
}
addServerBtn.addEventListener('click', async () => {
  const name = serverNameInput.value.trim();
  const address = serverAddressInput.value.trim();
  if (!name || !address) {
    toast('A server needs both a name and an address.', 'error');
    return;
  }
  try {
    await window.mc.addServer(activeInstanceId, { name, address });
    serverNameInput.value = '';
    serverAddressInput.value = '';
    await loadServers();
    toast(`Added "${name}".`, 'success');
  } catch (err) {
    toast(err.message || String(err), 'error');
  }
});

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
