const titlebarBreadcrumb = document.getElementById('titlebar-breadcrumb');
const titlebarStatus = document.getElementById('titlebar-status');
const titlebarStatusName = document.getElementById('titlebar-status-name');
const titlebarStopBtn = document.getElementById('titlebar-stop-btn');
const titlebarLogo = document.getElementById('titlebar-logo');
const titlebarMinBtn = document.getElementById('titlebar-min-btn');
const titlebarMaxBtn = document.getElementById('titlebar-max-btn');
const titlebarCloseBtn = document.getElementById('titlebar-close-btn');

titlebarMinBtn.addEventListener('click', () => window.mc.minimizeWindow());
titlebarMaxBtn.addEventListener('click', () => window.mc.toggleMaximizeWindow());
titlebarCloseBtn.addEventListener('click', () => window.mc.closeWindow());
titlebarStopBtn.addEventListener('click', async () => {
  if (!playingInstanceId) return;
  if (currentSettings && currentSettings.confirmStopGame) {
    const ok = await confirmDialog({ title: 'Stop game', body: 'Stop the running game? Any unsaved progress in-world will be lost.', confirmLabel: 'Stop' });
    if (!ok) return;
  }
  if (playingInstanceId === activeInstanceId) instancePlayBtn.disabled = true;
  await window.mc.stop();
});

function updateMaxIcon(maximized) {
  titlebarMaxBtn.title = maximized ? 'Restore' : 'Maximize';
  titlebarMaxBtn.innerHTML = maximized
    ? '<svg viewBox="0 0 12 12"><rect x="3" y="3.5" width="5.5" height="5.5" rx="0.5" fill="none" stroke="currentColor" stroke-width="1.1"/><path d="M4.5 3.5V2.5a1 1 0 0 1 1-1H9a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1H8.5" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>'
    : '<svg viewBox="0 0 12 12"><rect x="2.5" y="2.5" width="7" height="7" rx="0.5" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>';
}
window.mc.onWindowState(({ maximized }) => updateMaxIcon(maximized));
window.mc.isWindowMaximized().then(updateMaxIcon);

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
  browse: document.getElementById('page-browse'),
  modpacks: document.getElementById('page-modpacks'),
  allServers: document.getElementById('page-all-servers'),
};

const brandLogo = document.getElementById('brand-logo');
const homeHeroLogo = document.getElementById('home-hero-logo');
const sidebarFootLogo = document.getElementById('sidebar-foot-logo');
const railBrowse = document.getElementById('rail-browse');
const railModpacks = document.getElementById('rail-modpacks');
const railAllServers = document.getElementById('rail-all-servers');

const discoverModpackSearch = document.getElementById('discover-modpack-search');
const discoverModpackResults = document.getElementById('discover-modpack-results');
const discoverModpackLoadMoreBtn = document.getElementById('discover-modpack-load-more-btn');
const discoverModpackCount = document.getElementById('discover-modpack-count');

const allServersTbody = document.getElementById('all-servers-tbody');
const allServersEmpty = document.getElementById('all-servers-empty');
const browseTargetSelect = document.getElementById('browse-target-select');
const browseSearchInput = document.getElementById('browse-search');
const browseResults = document.getElementById('browse-results');
const browseLoadMoreBtn = document.getElementById('browse-load-more-btn');
const browseResultsCount = document.getElementById('browse-results-count');
const browseNoInstances = document.getElementById('browse-no-instances');
const browseToolbar = browseTargetSelect.closest('.toolbar');

const railSkins = document.getElementById('rail-skins');
const jumpInSection = document.getElementById('jump-in-section');
const jumpInList = document.getElementById('jump-in-list');
const homeGreetingEyebrow = document.getElementById('home-greeting-eyebrow');
const homeGreetingName = document.getElementById('home-greeting-name');
const homeGreetingSub = document.getElementById('home-greeting-sub');

const skinPreviewImg = document.getElementById('skin-preview-img');
const skinEmpty = document.getElementById('skin-empty');
const skinVariantTabs = document.getElementById('skin-variant-tabs');
const skinUploadBtn = document.getElementById('skin-upload-btn');
const skinResetBtn = document.getElementById('skin-reset-btn');
const skinError = document.getElementById('skin-error');

const instanceTitle = document.getElementById('instance-title');
const instanceSubtitle = document.getElementById('instance-subtitle');
const instanceMetaPlaytime = document.getElementById('instance-meta-playtime');
const instanceMetaLastPlayed = document.getElementById('instance-meta-lastplayed');
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
const logSearchInput = document.getElementById('log-search');
const logColorizeToggle = document.getElementById('log-colorize');
const logWrapToggle = document.getElementById('log-wrap');
const logCountEl = document.getElementById('log-count');
const logCopyBtn = document.getElementById('log-copy-btn');
const logClearBtn = document.getElementById('log-clear-btn');
const logBottomBtn = document.getElementById('log-bottom-btn');
const logEmpty = document.getElementById('log-empty');

const installedMode = document.getElementById('installed-mode');
const browseMode = document.getElementById('browse-mode');
const browseContentBtn = document.getElementById('browse-content-btn');
const backToInstalledBtn = document.getElementById('back-to-installed-btn');
const updateAllBtn = document.getElementById('update-all-btn');
const installedFilterInput = document.getElementById('installed-filter');
const installedTbody = document.getElementById('installed-tbody');
const installedEmpty = document.getElementById('installed-empty');
const tableWrap = document.querySelector('.table-wrap');
const uploadFilesBtn = document.getElementById('upload-files-btn');
const installedTypeTabs = document.getElementById('installed-type-tabs');
const refreshInstalledBtn = document.getElementById('refresh-installed-btn');

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
const settingThemeTabs = document.getElementById('setting-theme-tabs');
const settingAccentRow = document.getElementById('setting-accent-row');
const settingReduceMotion = document.getElementById('setting-reduce-motion');
const settingLoaderTabs = document.getElementById('setting-loader-tabs');
const settingMinimizeOnPlay = document.getElementById('setting-minimize-on-play');
const settingConfirmStop = document.getElementById('setting-confirm-stop');
const settingAlwaysOnTop = document.getElementById('setting-always-on-top');
const settingAutoUpdate = document.getElementById('setting-auto-update');

const modalOverlay = document.getElementById('modal-overlay');
const newInstanceModal = document.getElementById('new-instance-modal');
const newInstanceSource = document.getElementById('new-instance-source');
const newInstanceCustom = document.getElementById('new-instance-custom');
const newInstanceModpack = document.getElementById('new-instance-modpack');
const modalName = document.getElementById('modal-name');
const modalVersion = document.getElementById('modal-version');
const modalLoader = document.getElementById('modal-loader');
const modalLoaderNote = document.getElementById('modal-loader-note');
const modalError = document.getElementById('modal-error');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalCreateBtn = document.getElementById('modal-create-btn');

const modpackSearchInput = document.getElementById('modpack-search');
const modpackResults = document.getElementById('modpack-results');
const modpackLoadMoreBtn = document.getElementById('modpack-load-more-btn');
const modpackCount = document.getElementById('modpack-count');
const modpackCloseBtn = document.getElementById('modpack-close-btn');

const newInstanceImport = document.getElementById('new-instance-import');
const importProfileList = document.getElementById('import-profile-list');
const importDetails = document.getElementById('import-details');
const importName = document.getElementById('import-name');
const importVersion = document.getElementById('import-version');
const importLoader = document.getElementById('import-loader');
const importBtn = document.getElementById('import-btn');
const importCancelBtn = document.getElementById('import-cancel-btn');
const importError = document.getElementById('import-error');

// Mirrors the LOADERS table in src/launcher.js, which stays the source of
// truth - init() replaces this from `loaders:list` so the two can't drift.
let LOADER_LABELS = { fabric: 'Fabric', forge: 'Forge', quilt: 'Quilt', neoforge: 'NeoForge' };
function loaderLabel(loader) {
  return LOADER_LABELS[loader] || 'Vanilla';
}

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
const instSettingJvmArgs = document.getElementById('inst-setting-jvmargs');
const instIconPreview = document.getElementById('inst-icon-preview');
const instIconChooseBtn = document.getElementById('inst-icon-choose-btn');
const instIconResetBtn = document.getElementById('inst-icon-reset-btn');
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
const COPY_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15V5a1 1 0 0 1 1-1h9"/></svg>';

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
let installedTypeFilter = 'all';

// ---- Browse Mods (instance-agnostic search) ----
let browseQuery = '';
let browseOffset = 0;
let browseTotal = 0;
let lastBrowseResults = [];
let browseInstalledProjectIds = new Set();

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

// Draws an instance's identity into a swatch element. Prism Launcher and
// MultiMC both let an instance carry a real picture, which is what makes a
// long list of them scannable at a glance; we keep the generated letter
// swatch as the fallback so an instance is never blank. The swatch colour is
// painted either way, so it shows through while the file loads and comes
// straight back if the icon file goes missing.
function applyInstanceIcon(el, inst) {
  paintSwatch(el, inst.id);
  el.textContent = '';
  el.classList.remove('has-icon');
  if (!inst.iconUrl) {
    el.textContent = initialFor(inst.name);
    return;
  }
  el.classList.add('has-icon');
  const img = document.createElement('img');
  img.alt = '';
  img.addEventListener('error', () => {
    img.remove();
    el.classList.remove('has-icon');
    el.textContent = initialFor(inst.name);
  });
  img.src = inst.iconUrl;
  el.appendChild(img);
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

let currentAccountName = null;

async function refreshAccountUi(account) {
  if (account && account.name) {
    currentAccountName = account.name;
    accountName.textContent = account.name;
    if (account.uuid) accountAvatar.src = `https://crafatar.com/avatars/${account.uuid}?size=64&overlay`;
    showApp();
  } else {
    showLogin();
  }
}

// A quiet bit of life on the page you land on every single time - who's
// signed in, what time it is, and whether there's anything waiting for them.
function renderHomeGreeting() {
  const hour = new Date().getHours();
  homeGreetingEyebrow.textContent = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  homeGreetingName.textContent = currentAccountName || 'Traveler';
  if (!instances.length) {
    homeGreetingSub.textContent = 'Let’s get your first instance set up.';
  } else {
    const running = instances.find((i) => i.id === playingInstanceId);
    homeGreetingSub.textContent = running
      ? `${running.name} is running right now.`
      : `${instances.length} instance${instances.length === 1 ? '' : 's'} ready to play.`;
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
  const inst = playingInstanceId ? instances.find((i) => i.id === playingInstanceId) : null;
  titlebarStatus.classList.toggle('hidden', !playingInstanceId);
  if (playingInstanceId) titlebarStatusName.textContent = inst ? inst.name : 'Minecraft';
  if (busy) return setSessionStatus('Preparing…', 'busy');
  if (playingInstanceId) return setSessionStatus(`Running · ${inst ? inst.name : 'Minecraft'}`, 'live');
  setSessionStatus('Idle', '');
}

async function init() {
  paintCamelPixelArt();

  // src/launcher.js owns the list of installable loaders; adopt its labels so
  // the picker and every "Fabric · 1.21.1" style subtitle can't drift from it.
  try {
    const loaders = await window.mc.listLoaders();
    LOADER_LABELS = Object.fromEntries(loaders.map((l) => [l.id, l.label]));
  } catch {
    // keep the built-in defaults
  }

  const account = await window.mc.getAccount();
  await refreshAccountUi(account);
  if (!account) return;

  currentSettings = await window.mc.getSettings();
  settingMinMem.value = currentSettings.minMemoryMb;
  settingMaxMem.value = currentSettings.maxMemoryMb;
  settingJava.value = currentSettings.javaPath || '';
  applyAppearanceSettings(currentSettings);
  renderSettingsControls(currentSettings);

  instances = await window.mc.listInstances();
  renderRailInstances();
  renderInstanceGrid();
  renderHomeGreeting();
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
const PAGE_LABELS = {
  home: 'Home',
  skins: 'Skins',
  browse: 'Browse Mods',
  modpacks: 'Discover Modpacks',
  allServers: 'All Servers',
  settings: 'Settings',
};

function renderBreadcrumb(page) {
  const parts = ['Home'];
  if (page === 'instance') {
    const inst = currentInstance();
    parts.push(inst ? inst.name : 'Instance');
  } else if (page !== 'home') {
    parts.push(PAGE_LABELS[page] || page);
  }
  titlebarBreadcrumb.innerHTML = parts
    .map((label, i) => {
      const isLast = i === parts.length - 1;
      const crumb = `<span class="crumb${isLast ? ' current' : ''}">${escapeHtml(label)}</span>`;
      return i === 0 ? crumb : `<span class="sep">›</span>${crumb}`;
    })
    .join('');
}

function showPage(page) {
  currentPage = page;
  Object.entries(pages).forEach(([key, el]) => el.classList.toggle('active', key === page));
  railHome.classList.toggle('active', page === 'home');
  railSettings.classList.toggle('active', page === 'settings');
  railSkins.classList.toggle('active', page === 'skins');
  railBrowse.classList.toggle('active', page === 'browse');
  railModpacks.classList.toggle('active', page === 'modpacks');
  railAllServers.classList.toggle('active', page === 'allServers');
  document.querySelectorAll('.rail-swatch').forEach((el) => {
    el.classList.toggle('active', page === 'instance' && el.dataset.id === activeInstanceId);
  });
  renderBreadcrumb(page);
}

railHome.addEventListener('click', () => {
  renderInstanceGrid();
  renderHomeGreeting();
  loadRecentActivity();
  showPage('home');
});
railSettings.addEventListener('click', () => showPage('settings'));
railSkins.addEventListener('click', () => {
  loadSkin();
  showPage('skins');
});
railBrowse.addEventListener('click', () => {
  openBrowsePage();
  showPage('browse');
});
railModpacks.addEventListener('click', () => {
  if (!discoverModpackResults.childElementCount) runDiscoverModpackSearch(true);
  showPage('modpacks');
});
railAllServers.addEventListener('click', () => {
  loadAllServers();
  showPage('allServers');
});

function renderRailInstances() {
  railInstances.innerHTML = '';
  instances.forEach((inst) => {
    const btn = document.createElement('button');
    btn.className = 'rail-swatch';
    btn.dataset.id = inst.id;
    btn.title = inst.name;
    applyInstanceIcon(btn, inst);
    btn.addEventListener('click', () => openInstance(inst.id));
    railInstances.appendChild(btn);
  });
}

function renderInstanceGrid() {
  instanceGrid.innerHTML = '';
  if (!instances.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-hint mascot-empty';
    empty.innerHTML = `
      <svg class="camel-pixel-slot mascot-empty-camel" viewBox="0 0 33 20" xmlns="http://www.w3.org/2000/svg"></svg>
      <p class="muted">No instances yet. Click "New Instance" to create your first modpack.</p>
    `;
    instanceGrid.appendChild(empty);
    paintCamelPixelArt();
    return;
  }
  instances.forEach((inst, i) => {
    const card = document.createElement('div');
    card.className = 'instance-card';
    card.dataset.loader = inst.loader;
    card.style.setProperty('--stagger', i);
    const running = playingInstanceId === inst.id;
    card.innerHTML = `
      <div class="rail-swatch"></div>
      <button class="icon-btn ic-duplicate" title="Duplicate instance">${COPY_ICON}</button>
      <h4 class="ic-name">${escapeHtml(inst.name)}</h4>
      <div class="ic-meta">
        <span class="badge accent">${escapeHtml(loaderLabel(inst.loader))}</span>
        <span class="badge">${escapeHtml(inst.mcVersion)}</span>
        ${running ? '<span class="badge oasis">Running</span>' : inst.lastPlayedAt ? `<span class="ic-last-played">${timeAgo(inst.lastPlayedAt)}</span>` : ''}
      </div>
      <span class="ic-open">Open →</span>
    `;
    applyInstanceIcon(card.querySelector('.rail-swatch'), inst);
    card.addEventListener('click', () => openInstance(inst.id));
    card.querySelector('.ic-duplicate').addEventListener('click', (e) => {
      e.stopPropagation();
      duplicateInstance(inst);
    });
    instanceGrid.appendChild(card);
  });
}

function formatPlaytime(ms) {
  if (!ms) return '';
  const hours = ms / 3600000;
  if (hours < 1) return `${Math.max(1, Math.round(ms / 60000))} minutes played`;
  return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} hours played`;
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
  items.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'jump-in-card panel';
    card.style.setProperty('--stagger', i);
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
let skinRawUrl = null; // the flat texture URL Mojang wants back when resubmitting (e.g. on a variant switch)
let skinUuid = null;

function skinVariantOf(skins) {
  const active = (skins || []).find((s) => s.state === 'ACTIVE');
  return (active && active.variant && active.variant.toLowerCase()) || 'classic';
}

// Mojang's skin URL is the raw, unfolded 64x64 texture sheet - not something
// a player recognizes as "their skin". Crafatar (already used for the account
// avatar elsewhere in this app) renders an actual assembled character from
// the same UUID, so show that instead. Cache-busted since crafatar caches
// renders per UUID and won't otherwise notice a skin change right away.
function renderSkinPreview() {
  if (!skinUuid) return;
  skinPreviewImg.src = `https://crafatar.com/renders/body/${skinUuid}?overlay&size=400&t=${Date.now()}`;
  skinPreviewImg.classList.remove('hidden');
  skinEmpty.classList.add('hidden');
}

async function loadSkin() {
  skinError.textContent = '';
  try {
    const { uuid, skins: skinList } = await window.mc.getSkin();
    skinUuid = uuid;
    const active = (skinList || []).find((s) => s.state === 'ACTIVE');
    if (active) {
      skinRawUrl = active.url;
      skinCurrentVariant = skinVariantOf(skinList);
      renderSkinPreview();
    } else {
      skinRawUrl = null;
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
    if (variant === skinCurrentVariant || !skinRawUrl) return;
    skinVariantTabs.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
    try {
      const { skins: skinList } = await window.mc.setSkinFromUrl(skinRawUrl, variant);
      skinCurrentVariant = variant;
      const active = (skinList || []).find((s) => s.state === 'ACTIVE');
      if (active) skinRawUrl = active.url;
      renderSkinPreview();
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
      skinRawUrl = active.url;
      renderSkinPreview();
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

function refreshInstanceHeaderMeta(inst) {
  instanceSubtitle.textContent = `${loaderLabel(inst.loader)} · ${inst.mcVersion}`;
  instanceMetaPlaytime.querySelector('span').textContent = formatPlaytime(inst.totalPlaytimeMs);
  instanceMetaPlaytime.classList.toggle('hidden', !inst.totalPlaytimeMs);
  instanceMetaLastPlayed.querySelector('span').textContent = inst.lastPlayedAt ? `Last played ${timeAgo(inst.lastPlayedAt)}` : 'Never played';
}

// ---- Instance detail ----
async function openInstance(id) {
  activeInstanceId = id;
  const inst = currentInstance();
  if (!inst) return;

  instanceTitle.textContent = inst.name;
  refreshInstanceHeaderMeta(inst);
  instanceIconLg.className = 'instance-icon-lg rail-swatch';
  applyInstanceIcon(instanceIconLg, inst);

  setInstancePlayState(playingInstanceId === id ? 'running' : 'idle');
  progressBox.classList.toggle('hidden', playingInstanceId !== id);

  switchITab('content');
  showInstalledMode();
  installedFilterInput.value = '';
  installedTypeFilter = 'all';
  installedTypeTabs.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.itype === 'all'));
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
    if (currentSettings && currentSettings.confirmStopGame) {
      const ok = await confirmDialog({ title: 'Stop game', body: 'Stop the running game? Any unsaved progress in-world will be lost.', confirmLabel: 'Stop' });
      if (!ok) return;
    }
    instancePlayBtn.disabled = true;
    await window.mc.stop();
    return;
  }
  setInstancePlayState('installing');
  refreshSessionStatus(true);
  progressBox.classList.remove('hidden');
  progressText.textContent = 'Starting…';
  resetLog();
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
  if (instanceId === activeInstanceId) appendLogChunk(line);
});
window.mc.onExit(async ({ instanceId, code, error, crash }) => {
  if (playingInstanceId === instanceId) playingInstanceId = null;
  instances = await window.mc.listInstances();
  if (instanceId === activeInstanceId) {
    flushLogTail();
    setInstancePlayState('idle');
    progressText.textContent = error ? `Failed to start: ${error}` : `Game exited (code ${code ?? 'unknown'}).`;
    const inst = currentInstance();
    if (inst) refreshInstanceHeaderMeta(inst);
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

/* ==========================================================================
   LOG VIEWER

   Modelled on MultiMC/Prism Launcher's console: a monospace pane with
   per-level colouring, "Color lines"/"Wrap lines" toggles, Copy and Clear,
   and a search box. Prism's search is find-next; ours filters live instead,
   which is the long-standing request on their tracker and reads better in a
   tab you can't resize.

   The lines are held as an array rather than one growing string — you can't
   filter concatenated text cleanly — and re-rendered from that array.
   ========================================================================== */

const LOG_MAX_LINES = 5000; // matches the spirit of Prism's console line limit
let logLines = [];
let logPartial = ''; // stdout chunks split mid-line; hold the tail until its newline arrives
let logFilter = '';
let logFollow = true; // false while the user is reading history further up
let logShown = 0; // how many lines currently pass the filter (tracked, not recounted)

// Prism colours Warning orange and Error/Fatal red over its normal text; we
// mirror that. A stack-trace "\tat com.foo.Bar" line belongs with its
// exception, so those get flagged too.
function logLevelOf(line) {
  if (/\b(ERROR|FATAL|SEVERE)\b|Exception|\bCaused by:|^\s+at\s/.test(line)) return 'error';
  if (/\bWARN(ING)?\b/.test(line)) return 'warn';
  return '';
}

function logMatches(line) {
  return !logFilter || line.toLowerCase().includes(logFilter);
}

function logLineEl(line) {
  const el = document.createElement('div');
  const level = logLevelOf(line);
  el.className = level ? `log-line ${level}` : 'log-line';
  el.textContent = line;
  return el;
}

function isLogPinnedToBottom() {
  return logContent.scrollHeight - logContent.scrollTop - logContent.clientHeight < 24;
}

function scrollLogToBottom() {
  logContent.scrollTop = logContent.scrollHeight;
}

function updateLogChrome() {
  const total = logLines.length;
  logEmpty.classList.toggle('hidden', total > 0);
  if (!total) logCountEl.textContent = '';
  else if (logFilter) logCountEl.textContent = `${logShown} of ${total} lines`;
  else logCountEl.textContent = `${total} line${total === 1 ? '' : 's'}`;
  logBottomBtn.classList.toggle('hidden', logFollow || !total);
}

function renderLog() {
  const frag = document.createDocumentFragment();
  logShown = 0;
  for (const line of logLines) {
    if (!logMatches(line)) continue;
    frag.appendChild(logLineEl(line));
    logShown++;
  }
  if (logFilter && !logShown && logLines.length) {
    const none = document.createElement('div');
    none.className = 'log-line log-none';
    none.textContent = `No lines match "${logFilter}".`;
    frag.appendChild(none);
  }
  logContent.replaceChildren(frag);
  updateLogChrome();
  if (logFollow) scrollLogToBottom();
}

function pushLogLine(line) {
  logLines.push(line);
  if (logLines.length > LOG_MAX_LINES) {
    logLines.splice(0, logLines.length - LOG_MAX_LINES);
    return false; // dropped lines off the top, so the DOM needs a full rebuild
  }
  return true;
}

// Appends one raw stdout/stderr chunk, which may contain any number of
// newlines (or none at all).
function appendLogChunk(chunk) {
  logPartial += chunk;
  const parts = logPartial.split(/\r?\n/);
  logPartial = parts.pop();
  if (!parts.length) return;

  let incremental = true;
  const fresh = [];
  for (const line of parts) {
    if (!pushLogLine(line)) incremental = false;
    fresh.push(line);
  }
  if (!incremental) {
    renderLog();
    return;
  }
  // Fast path: only append the newly-matching lines instead of rebuilding.
  const frag = document.createDocumentFragment();
  for (const line of fresh) {
    if (!logMatches(line)) continue;
    frag.appendChild(logLineEl(line));
    logShown++;
  }
  if (frag.childNodes.length) {
    const noneRow = logContent.querySelector('.log-none');
    if (noneRow) noneRow.remove();
    logContent.appendChild(frag);
  }
  updateLogChrome();
  if (logFollow) scrollLogToBottom();
}

/** Flushes a last line that the process never terminated with a newline. */
function flushLogTail() {
  if (!logPartial) return;
  const tail = logPartial;
  logPartial = '';
  appendLogChunk(`${tail}\n`);
}

function resetLog() {
  logLines = [];
  logPartial = '';
  logFollow = true;
  logShown = 0;
  logContent.replaceChildren();
  updateLogChrome();
}

logContent.addEventListener('scroll', () => {
  const pinned = isLogPinnedToBottom();
  if (pinned === logFollow) return;
  // Scrolling up to read history detaches the view; coming back re-attaches
  // it. Without this the pane yanks you back down on every new line.
  logFollow = pinned;
  logBottomBtn.classList.toggle('hidden', logFollow || !logLines.length);
});

logBottomBtn.addEventListener('click', () => {
  logFollow = true;
  scrollLogToBottom();
  logBottomBtn.classList.add('hidden');
});

logSearchInput.addEventListener('input', () => {
  logFilter = logSearchInput.value.trim().toLowerCase();
  logFollow = true; // a new filter re-anchors the view at the newest match
  renderLog();
});

logColorizeToggle.addEventListener('change', () => {
  logContent.classList.toggle('no-color', !logColorizeToggle.checked);
});

logWrapToggle.addEventListener('change', () => {
  logContent.classList.toggle('no-wrap', !logWrapToggle.checked);
});

logCopyBtn.addEventListener('click', async () => {
  const text = logLines.filter(logMatches).join('\n');
  if (!text) return toast('Nothing to copy yet.', 'info');
  try {
    await navigator.clipboard.writeText(text);
    toast(logFilter ? 'Matching log lines copied.' : 'Log copied to the clipboard.', 'success');
  } catch (err) {
    toast(`Could not copy: ${err.message || err}`, 'error');
  }
});

logClearBtn.addEventListener('click', () => {
  resetLog();
  toast('Log cleared.', 'info', 2500);
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

// ---- Instance settings (per-instance Java/memory/JVM-arg overrides) ----
instanceSettingsBtn.addEventListener('click', () => {
  const inst = currentInstance();
  if (!inst) return;
  instSettingMinMem.value = inst.minMemoryMb || '';
  instSettingMaxMem.value = inst.maxMemoryMb || '';
  instSettingJava.value = inst.javaPath || '';
  instSettingJvmArgs.value = inst.jvmArgs || '';
  applyInstanceIcon(instIconPreview, inst);
  instIconResetBtn.disabled = !inst.iconUrl;
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
    jvmArgs: instSettingJvmArgs.value.trim() || null,
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

/* ---------- Custom instance icons ---------- */

// Repaints every place an instance's icon appears, then keeps the local cache
// in sync. Prism Launcher shows the instance icon in its list, its header and
// its dialogs; ours lives in the rail, the Home grid and the detail header.
function applyUpdatedInstance(updated) {
  instances = instances.map((i) => (i.id === updated.id ? updated : i));
  renderRailInstances();
  renderInstanceGrid();
  if (activeInstanceId === updated.id) {
    instanceIconLg.className = 'instance-icon-lg rail-swatch';
    applyInstanceIcon(instanceIconLg, updated);
    applyInstanceIcon(instIconPreview, updated);
    instIconResetBtn.disabled = !updated.iconUrl;
  }
}

async function chooseInstanceIcon() {
  const inst = currentInstance();
  if (!inst) return;
  try {
    const result = await window.mc.setInstanceIcon(inst.id);
    if (result.canceled) return;
    applyUpdatedInstance(result.instance);
    toast('Instance icon updated.', 'success');
  } catch (err) {
    toast(err.message || String(err), 'error');
  }
}

instanceIconLg.addEventListener('click', chooseInstanceIcon);
instIconChooseBtn.addEventListener('click', chooseInstanceIcon);
instIconResetBtn.addEventListener('click', async () => {
  const inst = currentInstance();
  if (!inst) return;
  try {
    applyUpdatedInstance(await window.mc.clearInstanceIcon(inst.id));
    toast('Icon reset to the default swatch.', 'success');
  } catch (err) {
    toast(err.message || String(err), 'error');
  }
});

/* ---------- Duplicate instance ---------- */

// Prism Launcher's "Copy Instance" dialog offers a checkbox per category
// (saves, mods, configs, resource packs, screenshots, servers). We copy all of
// them unconditionally and skip only what the launcher can re-download, which
// keeps the action one click instead of a form.
async function duplicateInstance(inst) {
  const ok = await confirmDialog({
    title: 'Duplicate instance',
    body: `Make a copy of "${inst.name}"? Mods, configs, worlds, options and saved servers are copied. Minecraft itself is re-downloaded the first time you launch the copy.`,
    confirmLabel: 'Duplicate',
    danger: false,
  });
  if (!ok) return;
  try {
    const copy = await window.mc.duplicateInstance(inst.id);
    instances.push(copy);
    renderRailInstances();
    renderInstanceGrid();
    toast(`Created "${copy.name}".`, 'success', 6000, {
      label: 'Open',
      onClick: () => openInstance(copy.id),
    });
  } catch (err) {
    toast(err.message || String(err), 'error');
  }
}

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
  // Scoped to this one control on purpose: the New Instance modal has its own
  // .seg-btn groups (source + loader picker) that must not be reset from here.
  contentTypeTabs.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.ptype === type));
  // Forge has none of the quick-add projects, so hide the whole section
  // rather than leaving an empty "Quick add" heading behind.
  const showStarters = type === 'mod' && starterModsForInstance().length > 0;
  document.querySelector('.starter-label').classList.toggle('hidden', !showStarters);
  starterRow.classList.toggle('hidden', !showStarters);
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

installedTypeTabs.querySelectorAll('.seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    installedTypeFilter = btn.dataset.itype;
    installedTypeTabs.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
    renderInstalledTable();
  });
});

refreshInstalledBtn.addEventListener('click', () => loadInstalledMods());

uploadFilesBtn.addEventListener('click', async () => {
  uploadFilesBtn.disabled = true;
  try {
    const result = await window.mc.uploadModFiles(activeInstanceId);
    if (result.canceled) return;
    await loadInstalledMods();
    toast(`Added ${result.added} file${result.added === 1 ? '' : 's'}.`, 'success');
  } catch (err) {
    toast(err.message || String(err), 'error');
  } finally {
    uploadFilesBtn.disabled = false;
  }
});

function renderInstalledTable() {
  const filterText = installedFilterInput.value.trim().toLowerCase();
  const filtered = installedModsCache.filter(
    (m) =>
      (!filterText || m.title.toLowerCase().includes(filterText)) &&
      (installedTypeFilter === 'all' || m.projectType === installedTypeFilter)
  );
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
        <div><div class="ct-title">${escapeHtml(mod.title)}</div><div class="ct-source">${mod.projectId ? 'Modrinth' : 'Local file'}${mod.projectType === 'resourcepack' ? ' · Resource Pack' : ''}</div></div>
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
function starterModsForInstance() {
  const inst = currentInstance();
  const loader = inst ? inst.loader : 'fabric';
  return ((currentSettings && currentSettings.starterMods) || []).filter(
    (mod) => !mod.loaders || mod.loaders.includes(loader)
  );
}

function renderStarterMods() {
  starterRow.innerHTML = '';
  starterModsForInstance().forEach((mod) => {
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
  lastResults.forEach((mod, i) => {
    const card = document.createElement('div');
    card.className = 'mod-card';
    card.style.setProperty('--stagger', i % 12);
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

// ---- Browse Mods (instance-agnostic search) ----
// Same Modrinth search/install pipeline as the per-instance Content tab, just
// with the "which instance" question asked up front via a dropdown instead of
// assumed from context - so searching for a mod never requires opening one first.
async function openBrowsePage() {
  const hasInstances = instances.length > 0;
  browseNoInstances.classList.toggle('hidden', hasInstances);
  browseToolbar.classList.toggle('hidden', !hasInstances);
  browseResults.classList.toggle('hidden', !hasInstances);
  if (!hasInstances) {
    browseResults.innerHTML = '';
    return;
  }
  const previousTarget = browseTargetSelect.value;
  browseTargetSelect.innerHTML = instances
    .map((inst) => `<option value="${inst.id}">${escapeHtml(inst.name)} (${escapeHtml(loaderLabel(inst.loader))} ${escapeHtml(inst.mcVersion)})</option>`)
    .join('');
  // Keep whatever was selected if it still exists, otherwise fall back to the
  // most recently played instance so the default target is usually the right one.
  const stillExists = instances.some((i) => i.id === previousTarget);
  const mostRecent = [...instances].sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0))[0];
  browseTargetSelect.value = stillExists ? previousTarget : (mostRecent || instances[0]).id;
  await refreshBrowseInstalledSet();
  if (!lastBrowseResults.length) runBrowseSearch(true);
  else renderBrowseResults();
}

async function refreshBrowseInstalledSet() {
  const targetId = browseTargetSelect.value;
  if (!targetId) {
    browseInstalledProjectIds = new Set();
    return;
  }
  const installed = await window.mc.listMods(targetId);
  browseInstalledProjectIds = new Set(installed.map((m) => m.projectId).filter(Boolean));
}

browseTargetSelect.addEventListener('change', async () => {
  await refreshBrowseInstalledSet();
  runBrowseSearch(true);
});

let browseSearchTimer = null;
browseSearchInput.addEventListener('input', () => {
  clearTimeout(browseSearchTimer);
  browseSearchTimer = setTimeout(() => runBrowseSearch(true), 350);
});

async function runBrowseSearch(reset) {
  const targetId = browseTargetSelect.value;
  if (!targetId) return;
  if (reset) {
    browseQuery = browseSearchInput.value.trim();
    browseOffset = 0;
    lastBrowseResults = [];
    browseResults.innerHTML = skeletonCards(6);
    browseResultsCount.textContent = '';
    browseLoadMoreBtn.classList.add('hidden');
  } else {
    browseLoadMoreBtn.disabled = true;
    browseLoadMoreBtn.textContent = 'Loading…';
  }
  try {
    const page = await window.mc.searchMods(targetId, browseQuery, {
      limit: PAGE_SIZE,
      offset: browseOffset,
      projectType: 'mod',
    });
    browseTotal = page.total;
    lastBrowseResults = reset ? page.hits : [...lastBrowseResults, ...page.hits];
    browseOffset += page.hits.length;
    renderBrowseResults();
  } catch (err) {
    browseResults.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'muted empty-note';
    p.textContent = `Couldn't reach Modrinth: ${err.message || err}`;
    browseResults.appendChild(p);
    toast(`Search failed: ${err.message || err}`, 'error');
  } finally {
    browseLoadMoreBtn.disabled = false;
    browseLoadMoreBtn.textContent = 'Load more mods';
  }
}

function renderBrowseResults() {
  browseResults.innerHTML = '';
  if (!lastBrowseResults.length) {
    const p = document.createElement('p');
    p.className = 'muted empty-note';
    p.textContent = 'No mods matched that search.';
    browseResults.appendChild(p);
  }
  lastBrowseResults.forEach((mod, i) => {
    const card = document.createElement('div');
    card.className = 'mod-card';
    card.style.setProperty('--stagger', i % 12);
    const already = browseInstalledProjectIds.has(mod.id) || browseInstalledProjectIds.has(mod.slug);
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
        const targetId = browseTargetSelect.value;
        btn.disabled = true;
        btn.textContent = 'Installing…';
        try {
          const result = await window.mc.installMod(targetId, mod, { projectType: 'mod' });
          browseInstalledProjectIds.add(mod.id);
          renderBrowseResults();
          const targetName = instances.find((i) => i.id === targetId)?.name || 'your instance';
          toast(`${describeInstall(mod.title, result)} → ${targetName}`, 'success');
        } catch (err) {
          btn.disabled = false;
          btn.textContent = 'Install';
          toast(err.message || String(err), 'error');
        }
      });
    }
    browseResults.appendChild(card);
  });
  browseResultsCount.textContent = browseTotal ? `${lastBrowseResults.length} of ${browseTotal} projects` : '';
  browseLoadMoreBtn.classList.toggle('hidden', lastBrowseResults.length >= browseTotal);
}
browseLoadMoreBtn.addEventListener('click', () => runBrowseSearch(false));

// ---- Discover Modpacks (standalone page - same pack search/install as the
// New Instance modal's Modpacks tab, just reachable without opening that modal) ----
let discoverModpackHits = [];
let discoverModpackTotal = 0;
let discoverModpackOffset = 0;
let discoverModpackSeq = 0;
let discoverModpackInstalling = false;
const DISCOVER_MODPACK_PAGE = 20;

async function runDiscoverModpackSearch(reset) {
  const seq = ++discoverModpackSeq;
  if (reset) {
    discoverModpackHits = [];
    discoverModpackOffset = 0;
    discoverModpackResults.innerHTML = '<p class="muted empty-note">Loading modpacks…</p>';
  }
  discoverModpackLoadMoreBtn.disabled = true;
  try {
    const res = await window.mc.searchModpacks(discoverModpackSearch.value.trim(), {
      limit: DISCOVER_MODPACK_PAGE,
      offset: discoverModpackOffset,
    });
    if (seq !== discoverModpackSeq) return;
    discoverModpackHits = reset ? res.hits : discoverModpackHits.concat(res.hits);
    discoverModpackTotal = res.total;
    discoverModpackOffset += res.hits.length;
    renderDiscoverModpackResults();
  } catch (err) {
    if (seq !== discoverModpackSeq) return;
    discoverModpackResults.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'muted empty-note';
    p.textContent = `Couldn't reach Modrinth: ${err.message || err}`;
    discoverModpackResults.appendChild(p);
  } finally {
    discoverModpackLoadMoreBtn.disabled = false;
  }
}

function renderDiscoverModpackResults() {
  discoverModpackResults.innerHTML = '';
  if (!discoverModpackHits.length) {
    const p = document.createElement('p');
    p.className = 'muted empty-note';
    p.textContent = 'No modpacks matched that search.';
    discoverModpackResults.appendChild(p);
  }
  discoverModpackHits.forEach((pack) => {
    const row = document.createElement('div');
    row.className = 'modpack-row';
    const loaders = loadersOfHit(pack);
    const mcVersion = newestGameVersion(pack);
    row.innerHTML = `
      <div class="icon-slot lg"></div>
      <div class="mp-info">
        <h4 class="mp-title">${escapeHtml(pack.title)}</h4>
        <p class="mp-desc">${escapeHtml(pack.description || '')}</p>
        <div class="mp-meta">
          ${loaders.map((l) => `<span class="badge accent">${escapeHtml(loaderLabel(l))}</span>`).join('')}
          ${mcVersion ? `<span class="badge">${escapeHtml(mcVersion)}</span>` : ''}
          <span class="downloads">${formatDownloads(pack.downloads)} downloads</span>
        </div>
      </div>
      <div class="mp-actions"><button class="btn primary small">Install</button></div>
    `;
    fillIconSlot(row.querySelector('.icon-slot'), pack.iconUrl);
    row.querySelector('button').addEventListener('click', () => installDiscoverModpack(pack, row));
    discoverModpackResults.appendChild(row);
  });
  discoverModpackCount.textContent = discoverModpackTotal ? `${discoverModpackHits.length} of ${discoverModpackTotal} modpacks` : '';
  discoverModpackLoadMoreBtn.classList.toggle('hidden', discoverModpackHits.length >= discoverModpackTotal);
}

async function installDiscoverModpack(pack, row) {
  if (discoverModpackInstalling) return;
  const btn = row.querySelector('button');
  discoverModpackInstalling = true;
  discoverModpackResults.querySelectorAll('button').forEach((b) => (b.disabled = true));
  btn.textContent = 'Installing…';
  try {
    const result = await window.mc.installModpack(pack);
    instances.push(result.instance);
    renderRailInstances();
    renderInstanceGrid();
    await openInstance(result.instance.id);
    toast(`Installed "${result.instance.name}" — ${result.modCount} mods, ${loaderLabel(result.instance.loader)} ${result.instance.mcVersion}.`, 'success');
  } catch (err) {
    toast(err.message || String(err), 'error');
    btn.textContent = 'Install';
  } finally {
    discoverModpackInstalling = false;
    discoverModpackResults.querySelectorAll('button').forEach((b) => (b.disabled = false));
  }
}

let discoverModpackSearchTimer;
discoverModpackSearch.addEventListener('input', () => {
  clearTimeout(discoverModpackSearchTimer);
  discoverModpackSearchTimer = setTimeout(() => runDiscoverModpackSearch(true), 320);
});
discoverModpackSearch.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    clearTimeout(discoverModpackSearchTimer);
    runDiscoverModpackSearch(true);
  }
});
discoverModpackLoadMoreBtn.addEventListener('click', () => runDiscoverModpackSearch(false));
window.mc.onModpackProgress(({ msg }) => {
  if (discoverModpackInstalling) {
    const btn = discoverModpackResults.querySelector('button:disabled');
    if (btn) btn.textContent = msg.replace(/\.\.\.$/, '…');
  }
});

// ---- All Servers (aggregated across every instance) ----
async function loadAllServers() {
  const list = await window.mc.listAllServers();
  allServersTbody.innerHTML = '';
  allServersEmpty.classList.toggle('hidden', list.length !== 0);
  list.forEach((server) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="ct-project"><div><div class="ct-title">${escapeHtml(server.name)}</div><div class="ct-source">${escapeHtml(server.address)}</div></div></td>
      <td class="ct-version">${escapeHtml(server.instanceName)}</td>
      <td class="ct-actions">
        <button class="btn small primary">${PLAY_ICON}Join</button>
        <button class="icon-btn danger" title="Remove server">${TRASH_ICON}</button>
      </td>
    `;
    tr.querySelector('.btn.primary').addEventListener('click', async () => {
      await openInstance(server.instanceId);
      startPlay(server.id);
    });
    tr.querySelector('.icon-btn').addEventListener('click', async () => {
      await window.mc.removeServer(server.instanceId, server.id);
      await loadAllServers();
    });
    allServersTbody.appendChild(tr);
  });
}

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
let selectedLoader = 'fabric';
let modpackInstalling = false;
let installingButton = null;

function setSelectedLoader(loader) {
  selectedLoader = loader;
  modalLoader.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.loader === loader));
  const label = loaderLabel(loader);
  modalLoaderNote.textContent =
    loader === 'neoforge'
      ? 'NeoForge will be installed automatically. It only exists for Minecraft 1.20.2 and newer.'
      : `${label} will be installed automatically for this version.`;
}
modalLoader.querySelectorAll('.seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => setSelectedLoader(btn.dataset.loader));
});

// Three ways to end up with an instance, the way Prism's Add Instance dialog
// offers "custom" and "install a published pack" from one place.
function setInstanceSource(source) {
  newInstanceSource.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.source === source));
  newInstanceCustom.classList.toggle('hidden', source !== 'custom');
  newInstanceModpack.classList.toggle('hidden', source !== 'modpack');
  newInstanceImport.classList.toggle('hidden', source !== 'import');
  newInstanceModal.classList.toggle('wide', source !== 'custom');
  if (source === 'modpack') {
    if (!modpackResults.childElementCount) runModpackSearch(true);
    modpackSearchInput.focus();
  } else if (source === 'import') {
    if (!importProfileList.childElementCount) loadImportProfiles();
  } else {
    modalName.focus();
  }
}
newInstanceSource.querySelectorAll('.seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => setInstanceSource(btn.dataset.source));
});

function openModal() {
  modalName.value = '';
  modalVersion.value = '1.21.1';
  modalError.textContent = '';
  setSelectedLoader((currentSettings && currentSettings.defaultLoader) || 'fabric');
  setInstanceSource('custom');
  modalOverlay.classList.remove('hidden');
  modalName.focus();
}
function closeModal() {
  if (modpackInstalling || importInstalling) return;
  modalOverlay.classList.add('hidden');
}
railAddInstance.addEventListener('click', openModal);
newInstanceBtn.addEventListener('click', openModal);
modalCancelBtn.addEventListener('click', closeModal);
modpackCloseBtn.addEventListener('click', closeModal);
importCancelBtn.addEventListener('click', closeModal);
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
    const inst = await window.mc.createInstance({ name, mcVersion, loader: selectedLoader });
    instances.push(inst);
    renderRailInstances();
    renderInstanceGrid();
    closeModal();
    await openInstance(inst.id);
    toast(`Created "${inst.name}" (${loaderLabel(inst.loader)} ${inst.mcVersion}).`, 'success');
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

// ---- Modpack browsing (Modrinth project_type:modpack) ----
// Same paging shape as the mod search: reset on a new query, append on
// "Load more". Installing one builds a whole instance in a single click.
let modpackHits = [];
let modpackTotal = 0;
let modpackOffset = 0;
let modpackSearchSeq = 0;
const MODPACK_PAGE = 20;

async function runModpackSearch(reset) {
  const seq = ++modpackSearchSeq;
  if (reset) {
    modpackHits = [];
    modpackOffset = 0;
    modpackResults.innerHTML = '<p class="muted empty-note">Loading modpacks…</p>';
  }
  modpackLoadMoreBtn.disabled = true;
  try {
    const res = await window.mc.searchModpacks(modpackSearchInput.value.trim(), {
      limit: MODPACK_PAGE,
      offset: modpackOffset,
    });
    // A slower earlier request must not overwrite a newer one's results.
    if (seq !== modpackSearchSeq) return;
    modpackHits = reset ? res.hits : modpackHits.concat(res.hits);
    modpackTotal = res.total;
    modpackOffset += res.hits.length;
    renderModpackResults();
  } catch (err) {
    if (seq !== modpackSearchSeq) return;
    modpackResults.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'muted empty-note';
    p.textContent = `Couldn't reach Modrinth: ${err.message || err}`;
    modpackResults.appendChild(p);
  } finally {
    modpackLoadMoreBtn.disabled = false;
  }
}

// A pack's search hit lists every game version it has ever supported; the
// newest is the one an install will actually land on.
function newestGameVersion(hit) {
  const versions = hit.gameVersions || [];
  return versions.length ? versions[versions.length - 1] : '';
}

// Plenty of packs ship for several loaders, so show every one they list
// rather than picking the first arbitrarily - which loader the install
// actually lands on is decided by the .mrpack's own manifest.
function loadersOfHit(hit) {
  return (hit.categories || []).filter((c) => LOADER_LABELS[c]);
}

function renderModpackResults() {
  modpackResults.innerHTML = '';
  if (!modpackHits.length) {
    const p = document.createElement('p');
    p.className = 'muted empty-note';
    p.textContent = 'No modpacks matched that search.';
    modpackResults.appendChild(p);
  }
  modpackHits.forEach((pack) => {
    const row = document.createElement('div');
    row.className = 'modpack-row';
    const loaders = loadersOfHit(pack);
    const mcVersion = newestGameVersion(pack);
    row.innerHTML = `
      <div class="icon-slot lg"></div>
      <div class="mp-info">
        <h4 class="mp-title">${escapeHtml(pack.title)}</h4>
        <p class="mp-desc">${escapeHtml(pack.description || '')}</p>
        <div class="mp-meta">
          ${loaders.map((l) => `<span class="badge accent">${escapeHtml(loaderLabel(l))}</span>`).join('')}
          ${mcVersion ? `<span class="badge">${escapeHtml(mcVersion)}</span>` : ''}
          <span class="downloads">${formatDownloads(pack.downloads)} downloads</span>
        </div>
      </div>
      <div class="mp-actions"><button class="btn primary small">Install</button></div>
    `;
    fillIconSlot(row.querySelector('.icon-slot'), pack.iconUrl);
    row.querySelector('button').addEventListener('click', () => installModpack(pack, row));
    modpackResults.appendChild(row);
  });
  modpackCount.textContent = modpackTotal ? `${modpackHits.length} of ${modpackTotal} modpacks` : '';
  modpackLoadMoreBtn.classList.toggle('hidden', modpackHits.length >= modpackTotal);
}

async function installModpack(pack, row) {
  if (modpackInstalling) return;
  const btn = row.querySelector('button');
  modpackInstalling = true;
  installingButton = btn;
  // Installing a pack pulls down dozens of mods, so every other Install button
  // is locked out until this one lands.
  modpackResults.querySelectorAll('button').forEach((b) => (b.disabled = true));
  btn.textContent = 'Installing…';
  try {
    const result = await window.mc.installModpack(pack);
    instances.push(result.instance);
    renderRailInstances();
    renderInstanceGrid();
    modpackInstalling = false;
    installingButton = null;
    closeModal();
    await openInstance(result.instance.id);
    toast(`Installed "${result.instance.name}" — ${result.modCount} mods, ${loaderLabel(result.instance.loader)} ${result.instance.mcVersion}.`, 'success');
  } catch (err) {
    toast(err.message || String(err), 'error');
    btn.textContent = 'Install';
  } finally {
    modpackInstalling = false;
    installingButton = null;
    modpackResults.querySelectorAll('button').forEach((b) => (b.disabled = false));
  }
}

let modpackSearchTimer;
modpackSearchInput.addEventListener('input', () => {
  clearTimeout(modpackSearchTimer);
  modpackSearchTimer = setTimeout(() => runModpackSearch(true), 320);
});
modpackSearchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    clearTimeout(modpackSearchTimer);
    runModpackSearch(true);
  }
});
modpackLoadMoreBtn.addEventListener('click', () => runModpackSearch(false));

// A pack install is slow enough to need live feedback, so the row's own button
// doubles as the progress readout.
window.mc.onModpackProgress(({ msg }) => {
  if (installingButton) installingButton.textContent = msg.replace(/\.\.\.$/, '…');
});

// ---- Import from Modrinth App ----
// Lets a friend bring their own Modrinth App mod list in without any help -
// no chat, no scripts, just picking a profile from a list on their own PC.
let importInstalling = false;
let importSelectedLoader = 'fabric';
let selectedImportProfile = null;

importLoader.querySelectorAll('.seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    importSelectedLoader = btn.dataset.loader;
    importLoader.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
  });
});

async function loadImportProfiles() {
  selectedImportProfile = null;
  importDetails.classList.add('hidden');
  importBtn.disabled = true;
  importError.textContent = '';
  importProfileList.innerHTML = '<p class="muted empty-note">Looking for Modrinth App profiles…</p>';
  try {
    const profiles = await window.mc.listModrinthAppProfiles();
    if (!profiles.length) {
      importProfileList.innerHTML = '<p class="muted empty-note">No Modrinth App profiles found on this PC. Install some mods in the Modrinth App first, then come back here.</p>';
      return;
    }
    importProfileList.innerHTML = '';
    profiles.forEach((profile) => {
      const row = document.createElement('div');
      row.className = 'modpack-row';
      row.innerHTML = `
        <div class="mp-info">
          <p class="mp-title"></p>
          <div class="mp-meta">
            <span class="badge oasis">${profile.modCount} enabled</span>
            ${profile.disabledCount ? `<span class="badge">${profile.disabledCount} disabled</span>` : ''}
          </div>
        </div>
        <div class="mp-actions"><button type="button" class="btn small secondary">Select</button></div>
      `;
      row.querySelector('.mp-title').textContent = profile.name;
      row.querySelector('button').addEventListener('click', () => selectImportProfile(profile, row));
      importProfileList.appendChild(row);
    });
  } catch (err) {
    importProfileList.innerHTML = `<p class="muted empty-note">Couldn't scan for Modrinth App profiles: ${escapeHtml(err.message || String(err))}</p>`;
  }
}

function selectImportProfile(profile, row) {
  selectedImportProfile = profile;
  importProfileList.querySelectorAll('.modpack-row').forEach((r) => r.classList.remove('active-row'));
  importProfileList.querySelectorAll('button').forEach((b) => (b.textContent = 'Select'));
  row.classList.add('active-row');
  row.querySelector('button').textContent = 'Selected';
  importDetails.classList.remove('hidden');
  importName.value = profile.name;
  importError.textContent = '';
  importBtn.disabled = false;
}

async function runImport() {
  if (importInstalling || !selectedImportProfile) return;
  const name = importName.value.trim() || selectedImportProfile.name;
  const mcVersion = importVersion.value.trim();
  if (!mcVersion) {
    importError.textContent = 'Enter the Minecraft version that profile uses.';
    return;
  }
  importError.textContent = '';
  importInstalling = true;
  importBtn.disabled = true;
  importBtn.textContent = 'Importing…';
  try {
    const result = await window.mc.importFromModrinthApp({ name, mcVersion, loader: importSelectedLoader }, selectedImportProfile.name);
    instances.push(result.instance);
    renderRailInstances();
    renderInstanceGrid();
    importInstalling = false;
    closeModal();
    await openInstance(result.instance.id);
    const parts = [];
    if (result.matchedCount) parts.push(`${result.matchedCount} from Modrinth`);
    if (result.copiedCount) parts.push(`${result.copiedCount} copied as-is`);
    if (result.disabledCount) parts.push(`${result.disabledCount} carried over disabled`);
    toast(`Imported "${result.instance.name}" — ${parts.join(', ') || 'nothing to install'}.`, 'success');
  } catch (err) {
    importError.textContent = err.message || String(err);
  } finally {
    importInstalling = false;
    importBtn.disabled = false;
    importBtn.textContent = 'Import';
  }
}
importBtn.addEventListener('click', runImport);

window.mc.onModrinthAppProgress(({ msg }) => {
  if (importInstalling) importBtn.textContent = msg.replace(/\.\.\.$/, '…');
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

// ---- Appearance & behavior: applied live and saved immediately on click,
// unlike the Java/Memory fields above which need an explicit Save. ----
function applyAppearanceSettings(settings) {
  const accent = settings.accentColor || 'ochre';
  document.documentElement.dataset.theme = settings.theme || 'dark';
  document.documentElement.dataset.accent = accent;
  document.documentElement.classList.toggle('reduce-motion', !!settings.reduceMotion);
  brandLogo.src = `assets/logos/logo-${accent}.png`;
  titlebarLogo.src = `assets/logos/logo-${accent}.png`;
  homeHeroLogo.src = `assets/logos/logo-${accent}.png`;
  sidebarFootLogo.src = `assets/logos/logo-${accent}.png`;
  window.mc.setAppIcon(accent);
}

function renderSettingsControls(settings) {
  settingThemeTabs.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.theme === (settings.theme || 'dark')));
  settingAccentRow.querySelectorAll('.accent-swatch').forEach((b) => b.classList.toggle('active', b.dataset.accent === (settings.accentColor || 'ochre')));
  settingLoaderTabs.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.loader === (settings.defaultLoader || 'fabric')));
  settingReduceMotion.checked = !!settings.reduceMotion;
  settingMinimizeOnPlay.checked = !!settings.minimizeOnPlay;
  settingConfirmStop.checked = settings.confirmStopGame !== false;
  settingAlwaysOnTop.checked = !!settings.alwaysOnTop;
  settingAutoUpdate.checked = settings.autoCheckUpdates !== false;
}

async function saveAppearancePatch(patch) {
  currentSettings = { ...currentSettings, ...(await window.mc.setSettings(patch)) };
  applyAppearanceSettings(currentSettings);
}

settingThemeTabs.querySelectorAll('.seg-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    settingThemeTabs.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
    await saveAppearancePatch({ theme: btn.dataset.theme });
  });
});

settingAccentRow.querySelectorAll('.accent-swatch').forEach((btn) => {
  btn.addEventListener('click', async () => {
    settingAccentRow.querySelectorAll('.accent-swatch').forEach((b) => b.classList.toggle('active', b === btn));
    await saveAppearancePatch({ accentColor: btn.dataset.accent });
  });
});

settingLoaderTabs.querySelectorAll('.seg-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    settingLoaderTabs.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
    await saveAppearancePatch({ defaultLoader: btn.dataset.loader });
  });
});

settingReduceMotion.addEventListener('change', () => saveAppearancePatch({ reduceMotion: settingReduceMotion.checked }));
settingMinimizeOnPlay.addEventListener('change', () => saveAppearancePatch({ minimizeOnPlay: settingMinimizeOnPlay.checked }));
settingConfirmStop.addEventListener('change', () => saveAppearancePatch({ confirmStopGame: settingConfirmStop.checked }));
settingAlwaysOnTop.addEventListener('change', () => saveAppearancePatch({ alwaysOnTop: settingAlwaysOnTop.checked }));
settingAutoUpdate.addEventListener('change', () => saveAppearancePatch({ autoCheckUpdates: settingAutoUpdate.checked }));

// ---- Easter egg: 1/100 chance an elephant wanders across the login screen ----
if (Math.random() < 0.01) {
  document.getElementById('elephant-walk').classList.remove('hidden');
  document.getElementById('elephant-caption').classList.remove('hidden');
}

init();
