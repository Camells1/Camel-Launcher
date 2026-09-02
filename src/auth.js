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

function toAccountRecord(mc, xbox) {
  return {
    name: mc.profile.name,
    uuid: mc.profile.id,
    accessToken: mc.mcToken,
    refreshToken: xbox.save(),
  };
}

/**
 * Wraps msmc's Microsoft -> Xbox -> Minecraft login chain. Supports several
 * signed-in accounts at once (a "friend group launcher" commonly means a
 * shared PC with more than one Microsoft account), persisting each one's
 * refresh token so all of them can be silently restored on next launch.
 */
class AuthManager {
  constructor(accountStore) {
    this.accountStore = accountStore;
    this.authManager = new Auth('select_account');
    this.migrateLegacySingleAccount();
  }

  // v1 stored one flat {name, uuid, accessToken, refreshToken} object. Lift
  // it into the new {accounts: [...], activeUuid} shape without losing it.
  migrateLegacySingleAccount() {
    const data = this.accountStore.getAll();
    if (Array.isArray(data.accounts)) return;
    if (!data.refreshToken) {
      this.accountStore.setAll({ accounts: [], activeUuid: null });
      return;
    }
    const account = { name: data.name, uuid: data.uuid, accessToken: data.accessToken, refreshToken: data.refreshToken };
    this.accountStore.setAll({ accounts: [account], activeUuid: account.uuid });
  }

  getAccounts() {
    return this.accountStore.get('accounts') || [];
  }

  getActiveUuid() {
    return this.accountStore.get('activeUuid') || null;
  }

  upsertAccount(account) {
    const accounts = this.getAccounts().filter((a) => a.uuid !== account.uuid);
    accounts.push(account);
    this.accountStore.set('accounts', accounts);
  }

  /** Pops an Electron login window, adds the account, and makes it active. */
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
    const account = toAccountRecord(mc, xbox);
    this.upsertAccount(account);
    this.accountStore.set('activeUuid', account.uuid);
    return account;
  }

  /** Tries to silently refresh one saved account. Returns the refreshed record, or null. */
  async refreshOne(account) {
    try {
      const xbox = await this.authManager.refresh(account.refreshToken);
      const mc = await xbox.getMinecraft();
      const fresh = toAccountRecord(mc, xbox);
      this.upsertAccount(fresh);
      return fresh;
    } catch (err) {
      if (isRejectedByAuthServer(err)) {
        console.error(`Saved login for ${account.name} was rejected by the auth server (expired/revoked), removing it:`, err.ts);
        this.removeAccount(account.uuid);
      } else {
        console.error(`Could not reach the auth server to refresh ${account.name} (keeping saved login for next try):`, err && err.message ? err.message : err);
      }
      return null;
    }
  }

  /** Tries to silently restore the active account using its saved refresh token. */
  async restore() {
    const active = this.getAccounts().find((a) => a.uuid === this.getActiveUuid());
    if (!active) return null;
    return this.refreshOne(active);
  }

  /** Switches the active account and refreshes its token. Returns the refreshed record, or null if that failed. */
  async switchAccount(uuid) {
    const account = this.getAccounts().find((a) => a.uuid === uuid);
    if (!account) throw new Error('That account is no longer saved.');
    this.accountStore.set('activeUuid', uuid);
    return this.refreshOne(account);
  }

  removeAccount(uuid) {
    const accounts = this.getAccounts().filter((a) => a.uuid !== uuid);
    this.accountStore.set('accounts', accounts);
    if (this.getActiveUuid() === uuid) {
      this.accountStore.set('activeUuid', accounts.length ? accounts[0].uuid : null);
    }
  }

  getSavedAccount() {
    return this.getAccounts().find((a) => a.uuid === this.getActiveUuid()) || null;
  }

  logout() {
    this.removeAccount(this.getActiveUuid());
  }
}

module.exports = { AuthManager };
