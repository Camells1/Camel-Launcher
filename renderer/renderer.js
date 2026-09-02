const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const accountName = document.getElementById('account-name');
const accountAvatar = document.getElementById('account-avatar');

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

const TRASH_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/></svg>';

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
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return `hsl(${hash % 360}, 55%, 42%)`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDownloads(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1000)}K`;
  return String(n || 0);
}

function paintCamelPixelArt() {
  const { GRID: grid, PALETTE: palette } = window.camelArt;
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
    accountAvatar.src = account.uuid ? `https://crafatar.com/avatars/${account.uuid}?size=64&overlay` : '';
    showApp();
  } else {
    showLogin();
  }
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
  showPage('home');
}

loginBtn.addEventListener('click', async () => {
  loginError.textContent = '';
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in...';
  try {
    const account = await window.mc.login();
    await refreshAccountUi(account);
    await init();
  } catch (err) {
    loginError.textContent = err.message || String(err);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign in with Microsoft';
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
    btn.style.background = colorForId(inst.id);
    btn.textContent = inst.name.trim().charAt(0).toUpperCase() || '?';
    btn.addEventListener('click', () => openInstance(inst.id));
    railInstances.appendChild(btn);
  });
}

function renderInstanceGrid() {
  instanceGrid.innerHTML = '';
  if (!instances.length) {
    instanceGrid.innerHTML =
      '<p class="muted empty-hint">No instances yet. Click "+ New Instance" to create your first modpack.</p>';
    return;
  }
  instances.forEach((inst) => {
    const card = document.createElement('div');
    card.className = 'instance-card';
    card.innerHTML = `
      <div class="rail-swatch" style="background:${colorForId(inst.id)}">${escapeHtml(inst.name.trim().charAt(0).toUpperCase() || '?')}</div>
      <h4>${escapeHtml(inst.name)}</h4>
      <p class="muted small">Fabric · ${escapeHtml(inst.mcVersion)}</p>
    `;
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
  instanceIconLg.style.background = colorForId(inst.id);
  instanceIconLg.textContent = inst.name.trim().charAt(0).toUpperCase() || '?';
  instanceIconLg.className = 'instance-icon-lg rail-swatch';

  setInstancePlayState(playingInstanceId === id ? 'running' : 'idle');
  progressBox.classList.toggle('hidden', playingInstanceId !== id);

  switchITab('content');
  showInstalledMode();
  await loadInstalledMods();

  showPage('instance');
}

function setInstancePlayState(phase) {
  instancePlayBtn.disabled = phase === 'installing';
  playBtnSpinner.classList.toggle('hidden', phase !== 'installing');
  playBtnLabel.textContent = phase === 'installing' ? 'Working...' : phase === 'running' ? 'Stop' : 'Play';
}

instancePlayBtn.addEventListener('click', async () => {
  if (playingInstanceId === activeInstanceId) {
    instancePlayBtn.disabled = true;
    await window.mc.stop();
    return;
  }
  setInstancePlayState('installing');
  progressBox.classList.remove('hidden');
  progressText.textContent = 'Starting...';
  logContent.textContent = '';
  try {
    await window.mc.play(activeInstanceId);
    playingInstanceId = activeInstanceId;
    setInstancePlayState('running');
  } catch (err) {
    progressText.textContent = `Error: ${err.message || err}`;
    setInstancePlayState('idle');
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
});

deleteInstanceBtn.addEventListener('click', async () => {
  const inst = currentInstance();
  if (!inst) return;
  if (!confirm(`Delete "${inst.name}" and all its files (Minecraft, mods, saves)? This cannot be undone.`)) return;
  try {
    await window.mc.removeInstance(inst.id, { deleteFiles: true });
    instances = instances.filter((i) => i.id !== inst.id);
    activeInstanceId = null;
    renderRailInstances();
    renderInstanceGrid();
    showPage('home');
  } catch (err) {
    alert(err.message || String(err));
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
  installedEmpty.classList.toggle('hidden', installedModsCache.length !== 0);

  filtered.forEach((mod) => {
    const tr = document.createElement('tr');
    const inst = currentInstance();
    tr.innerHTML = `
      <td class="ct-project">
        <img src="${mod.iconUrl || ''}" onerror="this.style.visibility='hidden'" />
        <div><div class="ct-title">${escapeHtml(mod.title)}</div><div class="ct-source muted">Modrinth</div></div>
      </td>
      <td class="ct-version">${escapeHtml(inst ? inst.mcVersion : '')}</td>
      <td class="ct-actions">
        <label class="switch"><input type="checkbox" ${mod.enabled ? 'checked' : ''} /><span class="switch-slider"></span></label>
        <button class="icon-btn danger" title="Remove">${TRASH_ICON}</button>
      </td>
    `;
    tr.querySelector('.switch input').addEventListener('change', async () => {
      await window.mc.toggleMod(activeInstanceId, mod.filename);
      await loadInstalledMods();
    });
    tr.querySelector('.icon-btn').addEventListener('click', async () => {
      if (!confirm(`Remove ${mod.title}?`)) return;
      await window.mc.removeMod(activeInstanceId, mod.filename);
      await loadInstalledMods();
    });
    installedTbody.appendChild(tr);
  });
}

updateAllBtn.addEventListener('click', async () => {
  updateAllBtn.disabled = true;
  updateAllBtn.textContent = 'Updating...';
  try {
    const { updated } = await window.mc.updateAllMods(activeInstanceId);
    await loadInstalledMods();
    updateAllBtn.textContent = updated ? `Updated ${updated}` : 'Up to date';
  } catch (err) {
    updateAllBtn.textContent = 'Update failed';
    alert(err.message || String(err));
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
  (currentSettings.starterMods || []).forEach((mod) => {
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
  chip.textContent = `Installing ${mod.title}...`;
  try {
    await window.mc.installMod(activeInstanceId, { slug: mod.slug, title: mod.title });
    await loadInstalledMods();
    renderStarterMods();
    renderSearchResults();
  } catch (err) {
    chip.disabled = false;
    chip.textContent = `+ ${mod.title}`;
    alert(`Couldn't install ${mod.title}: ${err.message || err}`);
  }
}

let searchTimer = null;
modSearchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => runSearch(true), 350);
});

async function runSearch(reset) {
  if (reset) {
    searchQuery = modSearchInput.value.trim();
    searchOffset = 0;
    lastResults = [];
    searchResults.innerHTML = '<p class="muted">Loading mods...</p>';
  }
  const page = await window.mc.searchMods(activeInstanceId, searchQuery, { limit: PAGE_SIZE, offset: searchOffset });
  searchTotal = page.total;
  lastResults = reset ? page.hits : [...lastResults, ...page.hits];
  searchOffset += page.hits.length;
  renderSearchResults();
  renderStarterMods();
}

function renderSearchResults() {
  searchResults.innerHTML = '';
  lastResults.forEach((mod) => {
    const card = document.createElement('div');
    card.className = 'mod-card';
    const already = installedProjectIds.has(mod.id) || installedProjectIds.has(mod.slug);
    card.innerHTML = `
      <img src="${mod.iconUrl || ''}" onerror="this.style.visibility='hidden'" />
      <div class="mod-info">
        <h4>${escapeHtml(mod.title)}<span class="downloads">${formatDownloads(mod.downloads)} downloads</span></h4>
        <p>${escapeHtml(mod.description || '')}</p>
        <div class="mod-actions">
          <button class="btn small primary" ${already ? 'disabled' : ''}>${already ? 'Installed' : 'Install'}</button>
        </div>
      </div>
    `;
    const btn = card.querySelector('button');
    if (!already) {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Installing...';
        try {
          await window.mc.installMod(activeInstanceId, mod);
          await loadInstalledMods();
          renderStarterMods();
          renderSearchResults();
        } catch (err) {
          btn.disabled = false;
          btn.textContent = 'Install';
          alert(err.message || String(err));
        }
      });
    }
    searchResults.appendChild(card);
  });
  resultsCount.textContent = searchTotal ? `${lastResults.length} of ${searchTotal} mods` : '';
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
modalCreateBtn.addEventListener('click', async () => {
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
  } catch (err) {
    modalError.textContent = err.message || String(err);
  } finally {
    modalCreateBtn.disabled = false;
  }
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
