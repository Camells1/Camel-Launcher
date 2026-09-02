# Camel Launcher 🐫

A custom Minecraft launcher for you and your friends, styled after the
Modrinth App: an instance rail on the left (one icon per modpack), a
Modrinth-powered content browser with search/toggle/update per instance, and
sign-in with a Microsoft account. Desert theme, blocky pixel-art camel, no ads.

Each **instance** is a fully separate Minecraft install — its own version,
its own Fabric loader, its own mods/saves — living under
`%APPDATA%/Camel Launcher/instances/<id>/`. Make one per modpack, or one per
friend group. None of it touches the official launcher, Lunar, etc.

## Running it (development)

```bash
npm install
npm start
```

If PowerShell blocks `npm` with an execution-policy error, use `npm.cmd start` instead.

## Installing it as a real app on your PC

```bash
npm run dist
```

This produces two files in `dist/`:

- **`Camel Launcher Setup 1.0.0.exe`** — a real installer. Run it, click
  Install (no admin rights needed, it installs to your user profile), and
  you get a Start Menu entry, a desktop shortcut, and an uninstaller — just
  like any other app. This is what you want for your own PC.
- **`Camel Launcher 1.0.0.exe`** — a portable version, no install step, just
  double-click and run. Handy if you'd rather not install anything, or want
  to run it from a USB stick.

Send either one to your friends — same deal, they run it and sign in with
their own Microsoft account. Since it isn't signed with a paid code-signing
certificate, Windows SmartScreen will likely show an "unrecognized publisher"
warning the first time anyone runs it — click **More info → Run anyway**.
That's normal for small/indie apps, not a sign anything's wrong.

## Auto-updates

Camel Launcher can update itself. About five seconds after the window opens, it
quietly asks an *update feed* whether a newer version exists. If one does, it
downloads it in the background — a small progress bar with a percentage appears
in the bottom-right corner — and when the download finishes it shows
**"Update ready — restarting..."**, closes, installs silently, and reopens on the
new version. No installer to click through.

### Right now this does nothing, and that's on purpose

There is no update server yet, so `package.json` points at an obvious
placeholder:

```json
"publish": [
  { "provider": "generic", "url": "https://example.com/camel-launcher-updates/" }
]
```

**`https://example.com/camel-launcher-updates/` is not a real URL** — nothing is
hosted there and nothing ever will be. Until you replace it, every update check
fails. That is handled: the failure is logged to the main-process console and
**nothing is shown in the UI**. The launcher behaves exactly as it did before.

(In a `npm start` dev run the check is skipped entirely — `electron-updater`
only runs in a packaged app.)

### Turning it on for real

1. **Find somewhere to host files.** Any plain static file host over HTTPS
   works — a GitHub Releases page, an S3 bucket, Cloudflare R2, Netlify, or a
   web server you own. There's no server-side code involved; the updater only
   does plain HTTP GETs for the static files you upload in step 5.
2. **Point the app at it.** Replace the placeholder `url` in `package.json` →
   `build` → `publish` with your own (keep the trailing slash):

   ```json
   "publish": [
     { "provider": "generic", "url": "https://updates.yoursite.net/camel-launcher/" }
   ]
   ```

   If you'd rather use GitHub Releases, swap the whole block for
   `{ "provider": "github", "owner": "your-github-username", "repo": "CustomMCLauncher" }`
   and attach the build output to a public release instead — everything else
   below works the same.
3. **Bump the version** in `package.json` (`"version": "1.0.1"`, etc). The
   updater only acts when the hosted version is *newer* than the installed one,
   so shipping an update always means bumping this first.
4. **Build:** `npm run dist`.
5. **Upload these three files from `dist/` to that URL:**
   - `latest.yml` — the update manifest (version number + checksum). Generated
     automatically by `npm run dist`; this is the file the app fetches to decide
     whether an update exists.
   - `Camel Launcher Setup <version>.exe` — the installer that gets downloaded.
   - `Camel Launcher Setup <version>.exe.blockmap` — lets the updater download
     only the changed chunks instead of the whole 110 MB installer.

   Keep older installers up there too if you like; only `latest.yml` decides
   what's current.
6. That's it. Anyone running an older *installed* copy picks it up the next time
   they open the launcher.

### Things worth knowing

- **Only the installer build auto-updates.** `Camel Launcher <version>.exe` (the
  portable one) has nowhere to install itself to, so it silently skips updates.
  Friends who want auto-updates should use `Camel Launcher Setup <version>.exe`.
- **The NSIS settings matter.** `perMachine: false` keeps the app installed in
  the user profile, which is what lets the silent update install run without a
  UAC admin prompt. If you ever switch it to `true`, auto-updates will start
  popping an admin prompt (or fail). `oneClick: false` is fine — the updater
  passes `/S` (silent) and `--force-run` (reopen afterwards) explicitly.
- **Testing before you go live:** point a packaged build at a local static
  server without editing `package.json` by setting an env var, e.g.
  `set CAMEL_UPDATE_FEED_URL=http://localhost:8080/` before launching. Serve the
  `dist/` folder from that port and it will behave exactly like real hosting.
- **Where the code lives:** `src/updater.js` (main process: checks, downloads,
  relaunches) and `renderer/updater.js` (the progress overlay, which builds its
  own DOM and styles so it doesn't depend on the rest of the UI).

## First run

1. Click **Sign in with Microsoft** and log in with the account that owns Minecraft.
2. Click **+ New Instance**, give it a name and a Minecraft version Fabric supports
   (defaults to `1.21.1`). Everyone in the group should create an instance with the
   same version + mods so you're compatible for multiplayer.
3. Open the instance, click **Browse content** — use the search bar or the quick-add
   chips (Fabric API, Sodium, etc.) to install mods straight from Modrinth.
   Back in the **Content** tab, each installed mod has an on/off toggle (disables it
   without deleting it) and a remove button; **Update all** re-checks every installed
   mod against the newest compatible build.
4. Hit **Play** in the instance header. First launch downloads Minecraft + Fabric +
   assets, so it can take a few minutes; the button becomes **Stop** while it's running.

## Requirements

- **Java 21+** must already be installed (get it free from
  [adoptium.net](https://adoptium.net) if `java -version` doesn't work in a
  terminal). The launcher auto-detects common install locations; if it can't
  find yours, paste the path to `javaw.exe` into Settings.
- Windows only, currently (uses Windows-style Java auto-detect paths).

## How mod sharing works

There's no shared server — everyone runs their own copy of the app, creates an
instance with the same Minecraft version, and installs the same mods from
Modrinth. As long as those match, you'll all be compatible for multiplayer.
(Server-side-only mods still need to be installed on whatever server you play
on, separately.)

## Notes on the Microsoft login

This uses the same public login flow the official Minecraft Launcher uses
(via the [msmc](https://github.com/Hanro50/MSMC) library), so no extra setup
is required. If Microsoft ever rate-limits that shared client ID, you can
register your own free app at https://portal.azure.com (App registrations →
New registration → enable "Public client/native" flows → copy the
Application (client) ID) and plug it into `src/auth.js`. (Note: if your
Microsoft account has no Azure AD directory yet, the portal will ask you to
join the free Microsoft 365 Developer Program first — no credit card needed.)

## Project layout

- `main.js` — Electron main process, all the IPC wiring
- `src/auth.js` — Microsoft/Xbox/Minecraft login (via `msmc`)
- `src/instances.js` — multi-instance data model (create/rename/delete, per-instance folders)
- `src/launcher.js` — installs vanilla + Fabric, launches the game (via `@xmcl/core` / `@xmcl/installer`)
- `src/modrinth.js` — mod search/browse + download/update from the Modrinth API
- `src/javaFinder.js` — locates a local Java install
- `src/store.js` — tiny JSON-file settings/account storage
- `src/camelArt.js` — the pixel-art camel logo, shared by the UI and the icon generator
- `scripts/generate-icon.js` — rasterizes `camelArt.js` into `build/icon.png` (the window/taskbar icon)
- `renderer/` — the UI (plain HTML/CSS/JS, no build step)

## Known limitations (v1)

- Only one instance can play at a time.
- Install progress is stage-based ("Downloading Minecraft...", "Installing
  Fabric...") rather than a byte-level progress bar.
- No auto-download of Java — you need it installed already.
- No automatic mod dependency resolution (e.g. installing a mod that needs
  Fabric API won't install Fabric API for you automatically — just grab it
  from the starter row too).
- Updating a disabled mod via "Update all" re-enables it.
- Memory/Java settings are global, not per-instance.
- Single account only (no multi-account switching yet, though the account
  card is laid out to support it later).
