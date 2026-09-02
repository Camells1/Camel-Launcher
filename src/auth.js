const { Auth } = require('msmc');

// msmc signals "the server explicitly rejected this request" by throwing a
// plain `{ response, ts }` object (see its errorResponse() helper) - not a
// real Error. A 4xx there means the refresh token itself was refused (expired
// or revoked), which is the only case where wiping the saved login is correct.
// Anything else (a thrown Error from the network layer - DNS, TLS, timeouts,
// or a 5xx from an auth server that's just down) is transient and must not
// cost the user their saved session.
function isRejectedByAuthServer(err) {
  const status = err && err.response && err.response.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

/**
 * Wraps msmc's Microsoft -> Xbox -> Minecraft login chain and persists
 * just enough (a refresh token + profile) to restore a session on next launch.
 */
class AuthManager {
  constructor(accountStore) {
    this.accountStore = accountStore;
    this.authManager = new Auth('select_account');
  }

  /** Pops an Electron login window, returns { name, uuid, accessToken } on success. */
  async login(parentWindow) {
    const xbox = await this.authManager.launch('electron', {
      parent: parentWindow,
      width: 520,
      height: 700,
    });
    const mc = await xbox.getMinecraft();
    if (!mc.profile || !mc.profile.name) {
      throw new Error('This Microsoft account does not own Minecraft.');
    }
    const account = {
      name: mc.profile.name,
      uuid: mc.profile.id,
      accessToken: mc.mcToken,
      refreshToken: xbox.save(),
    };
    this.accountStore.setAll(account);
    return account;
  }

  /** Tries to silently restore the last session using the saved refresh token. */
  async restore() {
    const saved = this.accountStore.getAll();
    if (!saved.refreshToken) return null;
    try {
      const xbox = await this.authManager.refresh(saved.refreshToken);
      const mc = await xbox.getMinecraft();
      const account = {
        name: mc.profile.name,
        uuid: mc.profile.id,
        accessToken: mc.mcToken,
        refreshToken: xbox.save(),
      };
      this.accountStore.setAll(account);
      return account;
    } catch (err) {
      if (isRejectedByAuthServer(err)) {
        console.error('Saved login was rejected by the auth server (expired/revoked), signing out:', err.ts);
        this.logout();
      } else {
        // Network/TLS/DNS hiccup, or the auth server itself is down. Don't
        // punish the user for a transient blip by throwing away their login -
        // just fail this attempt and let them try again next launch.
        console.error('Could not reach the auth server to restore session (keeping saved login for next try):', err && err.message ? err.message : err);
      }
      return null;
    }
  }

  getSavedAccount() {
    const saved = this.accountStore.getAll();
    return saved.name ? saved : null;
  }

  logout() {
    this.accountStore.setAll({ name: undefined, uuid: undefined, accessToken: undefined, refreshToken: undefined });
  }
}

module.exports = { AuthManager };
