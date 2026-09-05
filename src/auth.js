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

// msmc tags a rejection with a dotted reason code (err.ts, e.g.
// "error.auth.minecraft.entitlements") identifying exactly which step in the
// Microsoft -> Xbox Live -> Minecraft chain failed. These are copied from its
// own util/lexicon.js (not reachable via a supported import - msmc's
// package.json "exports" only exposes its top-level entry point) so a failed
// sign-in can say something more useful than a generic rejection notice.
const AUTH_REASON_TEXT = {
  'error.auth.xboxLive': 'Failed to sign in to Xbox Live.',
  'error.auth.xsts': 'Could not obtain an Xbox Live security token.',
  'error.auth.xsts.userNotFound': "This Microsoft account doesn't have an Xbox account set up. Sign in at xbox.com once to create one, then try again.",
  'error.auth.xsts.bannedCountry': 'Xbox Live is not available in the region this Microsoft account is registered to.',
  'error.auth.xsts.child': 'This is a child account. An adult needs to add it to a Microsoft Family group before it can sign in.',
  'error.auth.xsts.child.SK': 'South Korean law requires an adult to grant parental permissions for this account on the Xbox site before it can sign in.',
  'error.auth.minecraft.login': "Couldn't verify this Xbox account with Minecraft's servers.",
  'error.auth.minecraft.profile': "This Microsoft account doesn't appear to own Minecraft: Java Edition (no ownership entitlement found). If you bought it on Xbox/Game Pass, sign in with that exact account; if you own it through an old Mojang.com account, migrate it to a Microsoft account first at minecraft.net.",
  'error.auth.minecraft.entitlements': "Couldn't check this account's Minecraft ownership - Minecraft's entitlement server may be temporarily down. Try again shortly.",
};

function authRejectionMessage(err) {
  const code = err && typeof err.ts === 'string' ? err.ts : '';
  if (AUTH_REASON_TEXT[code]) return AUTH_REASON_TEXT[code];
  // Unknown/shortened code - fall back to whichever prefix we do recognize.
  const parts = code.split('.');
  while (parts.length) {
    parts.pop();
    const prefix = parts.join('.');
    if (AUTH_REASON_TEXT[prefix]) return AUTH_REASON_TEXT[prefix];
  }
  return 'Microsoft rejected this sign-in.';
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
    try {
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
    } catch (err) {
      // Same non-Error-throw quirk handled in refreshOne() below, but here it
      // must become a real Error - this one crosses the IPC boundary straight
      // to the login screen, and a plain object shows up there as the useless
      // literal string "[object Object]".
      if (err instanceof Error) throw err;
      if (isRejectedByAuthServer(err)) {
        throw new Error(authRejectionMessage(err));
      }
      throw new Error("Couldn't reach Microsoft's sign-in servers. Check your internet connection and try again.");
    }
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
