const fs = require('fs');

const API_BASE = 'https://api.minecraftservices.com';

async function apiCall(accessToken, pathname, options = {}) {
  const res = await fetch(`${API_BASE}${pathname}`, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Mojang API error ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`);
  }
  return res.status === 204 ? null : res.json();
}

/** Fetches the account's current profile - name, skins (with URLs), capes. */
async function getProfile(accessToken) {
  return apiCall(accessToken, '/minecraft/profile');
}

/** Uploads a local PNG as the account's new skin. variant is 'classic' (Steve) or 'slim' (Alex). */
async function uploadSkin(accessToken, filePath, variant = 'classic') {
  const buffer = fs.readFileSync(filePath);
  const form = new FormData();
  form.set('variant', variant);
  form.set('file', new Blob([buffer], { type: 'image/png' }), 'skin.png');
  return apiCall(accessToken, '/minecraft/profile/skins', { method: 'POST', body: form });
}

/** Sets a skin from an already-hosted URL (e.g. reapplying a previously-used skin). */
async function setSkinFromUrl(accessToken, url, variant = 'classic') {
  return apiCall(accessToken, '/minecraft/profile/skins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ variant, url }),
  });
}

/** Resets to the account's default (Steve/Alex) skin. */
async function resetSkin(accessToken) {
  await apiCall(accessToken, '/minecraft/profile/skins/active', { method: 'DELETE' });
}

module.exports = { getProfile, uploadSkin, setSkinFromUrl, resetSkin };
