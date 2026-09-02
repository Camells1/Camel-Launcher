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
