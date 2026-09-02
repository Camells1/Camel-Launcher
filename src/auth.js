const { Auth } = require('msmc');

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
      console.error('Failed to restore session, clearing saved account:', err.message);
      this.logout();
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
