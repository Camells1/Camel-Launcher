/*
 * Auto-update overlay.
 *
 * Deliberately self-contained: this file injects its own <style> block and its
 * own DOM, uses a `camel-updater-` class prefix that nothing else uses, and
 * never reads or depends on any markup or CSS from index.html / style.css. That
 * keeps it safe from UI redesigns - it only talks to the main process through
 * the window.mc bridge.
 *
 * It stays completely invisible unless an update is actually being downloaded,
 * so the (currently normal) "no update feed configured" failure shows nothing.
 */
(() => {
  'use strict';

  if (window.__camelUpdaterMounted) return;
  window.__camelUpdaterMounted = true;

  const mc = window.mc;
  if (!mc || typeof mc.onUpdateStatus !== 'function' || typeof mc.onUpdateProgress !== 'function') {
    // Preload doesn't expose the update API (older build) - nothing to do.
    return;
  }

  const CSS = `
.camel-updater-root {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 2147483000;
  width: 320px;
  max-width: calc(100vw - 36px);
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(226, 170, 90, 0.38);
  background: rgba(28, 19, 11, 0.97);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
  color: #f3e6d2;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
  line-height: 1.4;
  text-align: left;
  pointer-events: none;
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 220ms ease, transform 220ms ease;
}
.camel-updater-root, .camel-updater-root * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
.camel-updater-root.camel-updater-visible {
  opacity: 1;
  transform: translateY(0);
}
.camel-updater-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 9px;
}
.camel-updater-title {
  font-size: 13px;
  font-weight: 600;
  color: #f6e9d5;
}
.camel-updater-pct {
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #e2aa5a;
}
.camel-updater-track {
  position: relative;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}
.camel-updater-fill {
  height: 100%;
  width: 0%;
  border-radius: 999px;
  background: linear-gradient(90deg, #c9873a, #ecc077);
  transition: width 200ms ease;
}
.camel-updater-track.camel-updater-indeterminate .camel-updater-fill {
  width: 38%;
  animation: camel-updater-slide 1.25s ease-in-out infinite;
}
@keyframes camel-updater-slide {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(275%); }
}
.camel-updater-sub {
  margin-top: 8px;
  font-size: 11px;
  color: rgba(243, 230, 210, 0.62);
  min-height: 14px;
}
`;

  const style = document.createElement('style');
  style.id = 'camel-updater-styles';
  style.textContent = CSS;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.className = 'camel-updater-root';
  root.setAttribute('role', 'status');
  root.setAttribute('aria-live', 'polite');
  root.innerHTML = `
    <div class="camel-updater-head">
      <span class="camel-updater-title">Update available</span>
      <span class="camel-updater-pct"></span>
    </div>
    <div class="camel-updater-track"><div class="camel-updater-fill"></div></div>
    <div class="camel-updater-sub"></div>
  `;

  const mount = () => document.body.appendChild(root);
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount, { once: true });

  const titleEl = root.querySelector('.camel-updater-title');
  const pctEl = root.querySelector('.camel-updater-pct');
  const trackEl = root.querySelector('.camel-updater-track');
  const fillEl = root.querySelector('.camel-updater-fill');
  const subEl = root.querySelector('.camel-updater-sub');

  // 'idle' -> 'downloading' -> 'ready'. Tracked so a late/unrelated status (a
  // manual re-check resolving to "none", say) can't yank the banner away while
  // a download is running or while we're about to restart.
  let phase = 'idle';

  function show() {
    root.classList.add('camel-updater-visible');
  }

  function hide() {
    root.classList.remove('camel-updater-visible');
  }

  function setIndeterminate(on) {
    trackEl.classList.toggle('camel-updater-indeterminate', on);
    if (on) fillEl.style.width = '';
  }

  function formatMb(bytes) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  mc.onUpdateStatus((payload) => {
    const state = payload && payload.state;
    const version = payload && payload.version;

    // Once we're showing "restarting", nothing may change the banner - the app
    // is seconds from quitting and a stray status must not blank it out.
    if (phase === 'ready') return;

    if (state === 'available') {
      phase = 'downloading';
      titleEl.textContent = version ? `Downloading update ${version}` : 'Downloading update';
      pctEl.textContent = '';
      subEl.textContent = 'Starting download...';
      setIndeterminate(true);
      show();
      return;
    }

    if (state === 'ready') {
      phase = 'ready';
      titleEl.textContent = 'Update ready - restarting...';
      pctEl.textContent = '100%';
      subEl.textContent = 'Camel Launcher will reopen on the new version.';
      setIndeterminate(false);
      fillEl.style.width = '100%';
      show();
      return;
    }

    // 'checking', 'none' and 'error' are all silent on purpose: with no update
    // feed hosted yet, failures are the expected case and must not show UI.
    // A stray 'none' while downloading is meaningless (it can only come from a
    // second, unrelated check), but a real 'error' should clear a stuck bar.
    if (state === 'error' || (state === 'none' && phase !== 'downloading')) {
      phase = 'idle';
      hide();
    }
  });

  mc.onUpdateProgress((p) => {
    if (phase === 'ready') return;
    phase = 'downloading';
    const percent = Math.max(0, Math.min(100, (p && p.percent) || 0));
    setIndeterminate(false);
    fillEl.style.width = `${percent}%`;
    pctEl.textContent = `${Math.round(percent)}%`;
    if (titleEl.textContent.indexOf('Downloading') !== 0) titleEl.textContent = 'Downloading update';
    subEl.textContent = p && p.total
      ? `${formatMb(p.transferred || 0)} of ${formatMb(p.total)}`
      : 'Downloading...';
    show();
  });
})();
