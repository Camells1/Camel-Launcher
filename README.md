# Camel Launcher 🐫

A custom Minecraft launcher for you and your friends, styled after the
Modrinth App: an instance rail on the left (one icon per modpack), a
Modrinth-powered content browser, sign-in with a Microsoft account (multiple
accounts, switchable), and a frameless window with its own custom title bar
(breadcrumb navigation, a live "now playing" pill). No ads.

Pick one of five accent colors in Settings → Appearance — Ochre, Oasis, Clay,
Mauve, Azure — and the whole app repaints: not just buttons, the entire
neutral palette, the animated backdrop scene behind the login/home screens
(desert, jungle, volcano, ocean, space, respectively), and even the real
camel-head app/taskbar icon. Each of the five pairs with both a dark and a
light variant, so there are ten looks in total, all built around the same
pixel-art camel mascot.

Each **instance** is a fully separate Minecraft install — its own version,
its own mod loader, its own mods/worlds/screenshots/servers — living under
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

- **`Camel Launcher Setup 1.1.0.exe`** — a real installer. Run it, click
  Install (no admin rights needed, it installs to your user profile), and
  you get a Start Menu entry, a desktop shortcut, and an uninstaller — just
  like any other app. This is what you want for your own PC, and the only
  one that auto-updates (see below).
- **`Camel Launcher 1.1.0.exe`** — a portable version, no install step, just
  double-click and run. Handy if you'd rather not install anything, or want
  to run it from a USB stick. Doesn't auto-update.

Send either one to your friends — same deal, they run it and sign in with
their own Microsoft account. Since it isn't signed with a paid code-signing
certificate, Windows SmartScreen will likely show an "unrecognized publisher"
warning the first time anyone runs it — click **More info → Run anyway**.
That's normal for small/indie apps, not a sign anything's wrong.

## First run

1. Click **Sign in with Microsoft** and log in with the account that owns
   Minecraft. You can add more accounts later from the account card in the
   sidebar and switch between them any time.
2. Click **+ New Instance** and pick one of three ways to end up with one:
   **Custom** (name it, pick a Minecraft version and a mod loader —
   Fabric/Forge/Quilt/NeoForge), **Modpacks** (install a complete,
   pre-configured pack from Modrinth in one click), or **Import** (already
   using the Modrinth App? Pull a profile's mod list straight over — see
   "How mod sharing works" below). Everyone in the group should end up with
   an instance on the same version + loader + mods to stay compatible for
   multiplayer.
3. Open the instance's **Content** tab, click **Browse content** — search or
   use the quick-add chips to install mods, resource packs, or shaders from
   Modrinth. Installing a mod that needs another one (like Fabric API)
   installs that automatically too. Back in Content: each item has an on/off
   toggle (disables without deleting), a remove button, **Update all**, and
   Export/Import to share your exact mod list with a friend as a file. The
   rail also has standalone **Browse Mods**, **Discover Modpacks**, and
   **All Servers** pages, so searching Modrinth or checking your saved
   servers never requires opening an instance first.
4. Check out the instance's other tabs: **Worlds** (your saves, with a
   folder shortcut), **Screenshots** (a gallery), and **Servers** (save
   favorites and "Play & Join" straight into one).
5. Hit **Play** in the instance header. First launch downloads the game +
   loader + assets, so it can take a few minutes; the button becomes **Stop**
   while running (with a matching status pill in the title bar), and a crash
   (if one happens) shows a summary with a link to the full crash report
   instead of just an exit code.
6. Click the **Skins** icon in the rail to preview, change, or reset your
   Minecraft skin without leaving the launcher.
7. Open **Settings** from the rail to pick a theme and accent color
   (Appearance), set default Java/memory/JVM options, check per-instance
   disk usage, and more — it's organized into sections down the left side
   rather than one long scrolling page.

Once you've played something, Home shows a **Jump in** strip of your most
recently played instances and servers for one-click relaunching.

## Requirements

- **Java 21+** must already be installed (get it free from
  [adoptium.net](https://adoptium.net) if `java -version` doesn't work in a
  terminal). The launcher auto-detects common install locations; set a custom
  path in Settings (globally) or per-instance in that instance's gear-icon
  settings if it can't find yours.
- Windows only, currently (uses Windows-style Java auto-detect paths).

## How mod sharing works

There's no shared server — everyone runs their own copy of the app, creates
an instance with the same Minecraft version + loader, and installs the same
mods from Modrinth. There are a few ways to actually get there together:
install the same modpack via Discover Modpacks, import the `.json` file one
person exported from Content → Export, or — if a friend already has a mod
list built up in the Modrinth App — pull it straight over with **New
Instance → Import**, which matches their local files against Modrinth by
content hash and installs each one properly (anything not found on Modrinth
gets copied across as-is, and disabled mods stay disabled). As long as
everyone's mods match, you'll all be compatible for multiplayer.
(Server-side-only mods still need to be installed on whatever server you
play on, separately.)

## Auto-updates

Camel Launcher can update itself. About five seconds after the window opens, it
quietly asks an *update feed* whether a newer version exists. If one does, it
downloads it in the background — a small progress bar with a percentage appears
in the bottom-right corner — and when the download finishes it shows
**"Update ready — restarting..."**, closes, installs silently, and reopens on the
new version. No installer to click through.

### It's live

`package.json` → `build` → `publish` points at a real GitHub repo:

```json
"publish": [
  { "provider": "github", "owner": "Camells1", "repo": "Camel-Launcher" }
]
```

[github.com/Camells1/Camel-Launcher](https://github.com/Camells1/Camel-Launcher)
already has a v1.1.0 release published on it, so an installed copy that's
behind will pick up the newer build the next time it's opened — no further
setup needed. (In a `npm start` dev run the check is skipped entirely —
`electron-updater` only runs in a packaged app — and a failed check, e.g. no
network, is just logged to the main-process console with nothing shown in
the UI, so a temporary hiccup never looks like an error to whoever's playing.)

### Shipping a new update

1. **Bump the version** in `package.json` (`"version": "1.1.1"`, etc). The
   updater only acts when the published version is *newer* than the installed
   one, so shipping an update always means bumping this first.
2. **Build:** `npm run dist`. This produces (among other things) three files
   in `dist/` that matter for the update feed:
   - `latest.yml` — the update manifest (version number + checksum). This is
     the file the app fetches to decide whether an update exists.
   - `Camel Launcher Setup <version>.exe` — the installer that gets downloaded.
   - `Camel Launcher Setup <version>.exe.blockmap` — lets the updater download
     only the changed chunks instead of the whole 110 MB installer.
3. **Publish a GitHub Release** on `Camells1/Camel-Launcher` tagged to match
   the bumped version (e.g. `v1.1.1`), and attach those three files as release
   assets. (electron-builder can also do this step for you in one command —
   set a `GH_TOKEN` env var with `repo` access and run
   `npm run dist -- --publish always` instead of a plain `npm run dist`.)
   Keep older releases up there too if you like; only the newest `latest.yml`
   decides what's current.
4. That's it. Anyone running an older *installed* copy picks it up the next
   time they open the launcher.

### Pointing this at a different repo (or a plain static host)

Forked this and want updates to go to your own copy instead? Replace the
`owner`/`repo` in `package.json` → `build` → `publish` with your own — every
step above works the same against your fork. You don't need GitHub at all,
either: any plain static file host over HTTPS works (an S3 bucket, Cloudflare
R2, Netlify, your own web server). Swap the `publish` block for
`{ "provider": "generic", "url": "https://updates.yoursite.net/camel-launcher/" }`
and upload the same three files from step 2 there instead — the updater just
does plain HTTP GETs, no server-side code involved.

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
- **A build needs headroom on disk.** The NSIS packaging step writes a
  multi-hundred-MB compressed intermediate before producing the final
  installer; if `npm run dist` fails with something like `no files found` for
  a `.7z` file, free up disk space and rebuild — it silently corrupts rather
  than clearly erroring when the disk is nearly full.

## Notes on the Microsoft login

This uses the same public login flow the official Minecraft Launcher uses
(via the [msmc](https://github.com/Hanro50/MSMC) library), so no extra setup
is required. If Microsoft ever rate-limits that shared client ID, you can
register your own free app at https://portal.azure.com (App registrations →
New registration → enable "Public client/native" flows → copy the
Application (client) ID) and plug it into `src/auth.js`. (Note: if your
Microsoft account has no Azure AD directory yet, the portal will ask you to
join the free Microsoft 365 Developer Program first — no credit card needed.)

Session restore is resilient to network blips on purpose: only an explicit
rejection from Microsoft's auth server (an expired/revoked token) signs an
account out. A DNS hiccup, a captive proxy, or Microsoft's servers being
briefly down just fails that one attempt and tries again next launch — it
won't silently forget your login over a bad connection.

## Project layout

- `main.js` — Electron main process, all the IPC wiring; also owns the frameless
  `BrowserWindow` and the minimize/maximize/close handlers the custom title bar calls into
- `preload.js` — the `contextBridge` that exposes a safe `window.mc.*` API to the renderer
- `src/auth.js` — Microsoft/Xbox/Minecraft login (via `msmc`); supports multiple saved accounts
- `src/instances.js` — multi-instance data model (create/rename/duplicate/delete, per-instance folders, per-instance Java/memory/JVM-arg overrides, custom icons, playtime tracking)
- `src/launcher.js` — installs the game + mod loader, launches it (via `@xmcl/core` / `@xmcl/installer`)
- `src/modrinth.js` — mod/resourcepack/shader/modpack search + download/update from the Modrinth API
- `src/modpackDiscovery.js` — browsing and one-click installing full Modrinth modpacks
- `src/modrinthAppImport.js` — finds a friend's local Modrinth App profiles and matches their mod files against Modrinth by content hash, for the New Instance → Import flow
- `src/skins.js` — view/upload/reset the signed-in account's skin (Mojang profile API)
- `src/worlds.js`, `src/screenshots.js`, `src/servers.js` — per-instance saves/screenshots/favorite-servers management
- `src/crashReports.js` — summarizes the newest crash report after a non-zero exit
- `src/modpack.js` — export/import *your own* instance's installed-mod list as a shareable file (distinct from `modpackDiscovery.js`, which browses Modrinth's public modpacks)
- `src/javaFinder.js` — locates a local Java install
- `src/store.js` — tiny JSON-file settings/account storage; also holds the default settings (theme, accent color, memory, etc.)
- `src/camelArt.js` — the pixel-art camel logo, shared by the UI and the icon generator
- `src/updater.js` / `renderer/updater.js` — auto-update (see above)
- `scripts/generate-icon.js` — rasterizes `camelArt.js` into `build/icon.png` (the window/taskbar icon)
- `build/icons/` — one pre-recolored app icon per accent color (`icon-<accent>.png`); swapped in as the real OS taskbar/window icon when you change the accent in Settings
- `renderer/assets/logos/` — one pre-recolored camel-head logo per accent color, used as the rail brand mark, title bar logo, home hero icon, and sidebar footer icon
- `renderer/` — the UI (plain HTML/CSS/JS, no build step, no framework): the custom title bar, the theming system (`data-theme`/`data-accent` on `<html>`, driving the whole palette plus the animated desert/jungle/volcano/ocean/space backdrop scenes), and the categorized Settings page all live in `renderer/index.html` + `renderer/renderer.js` + `renderer/style.css`

## Known limitations

- Only one instance can play at a time.
- Install progress is stage-based ("Downloading Minecraft...", "Installing
  the loader...") rather than a byte-level progress bar.
- No auto-download of Java — you need it installed already.
- Updating a disabled mod via "Update all" re-enables it.
- Instance duplication copies mods/config/saves/servers/icon but not the
  downloaded game/loader/library/asset files — those just re-download on the
  copy's first launch, which is faster than copying gigabytes but does mean
  the copy needs a network connection before it can play.
