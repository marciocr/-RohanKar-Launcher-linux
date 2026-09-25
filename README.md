# RohanKar Launcher — Linux

> Linux port of [RohanKar Launcher](https://github.com/Kilted-Kraken/-RohanKar-Launcher), packaged as an AppImage, with Proton / Wine support for running the Windows games.

A desktop game launcher for the classic PC game collection uploaded to [Archive.org](https://archive.org/search?query=uploader%3Arohanjackson071%40gmail.com) by **rohanjackson071**. Browse, install, and launch games from a single polished interface — no account required.

<img width="1280" height="800" alt="Screenshot 2026-03-23 221326" src="https://github.com/user-attachments/assets/bd3b0e92-6f0f-4d99-9138-b4e0deae2155" />

---

## Features

### 🎮 Game Library
- Pulls the full game catalogue directly from Archive.org
- Search by title and sort by name, date archived, date published, or developer
- Installed games shown with a badge
- Option to show installed games first in the list

### 📦 Download & Install
- One-click download and automatic extraction (ZIP, 7z, RAR supported)
- Optionally deletes the archive after installation to save space
- Configurable download and install folder locations

### 🚀 Launching
- Automatically finds and launches the correct executable
- Smart exe picker for games with multiple launch options (e.g. DOSBox vs native)
- Set a default executable so future launches skip the picker
- Playtime tracking per game

### 🖼️ Game Detail Panel
- Hero banner image — pulled automatically from a `hero.png` bundled in the game's archive
- Archive.org description, year, download count, and file size
- Readme viewer (reads the readme packaged with the game)
- Archive.org user reviews tab
- Open install folder in your file manager

### 🔔 Updates
- Automatically checks for new releases on launch
- Notifies you when an update is available with a link to download it

### 🎮 Gamepad / Controller Support

- Full gamepad navigation with standard W3C layout (Xbox / PS controllers)
- Browse the game library, navigate menus, launch and install games entirely with a controller
- On-screen keyboard for text input (search, notes)
- Mouse mode via L3 toggle
- Contextual hint bar showing available controls

### 🎮 Add to Steam

- Add any installed game to your Steam library as a Non-Steam shortcut directly from the launcher
- Exe picker modal for games with multiple executables
- Writes correctly-formatted shortcuts.vdf matching Steam's own format

---

## Installation (Linux)

1. Go to the [latest release](https://github.com/marciocr/-RohanKar-Launcher-linux/releases/latest)
2. Download **RohanKar-Launcher-x.x.x-x86_64.AppImage**
3. Make it executable and run it:

```bash
chmod +x RohanKar-Launcher-*-x86_64.AppImage
./RohanKar-Launcher-*-x86_64.AppImage
```

> **Tip:** Tools such as [Gear Lever](https://flathub.org/apps/it.mijorus.gearlever) or AppImageLauncher add the AppImage to your application menu.

---

## Running Windows games (Proton / Wine)

Games from the archive are Windows builds, so the launcher runs them through a compatibility layer. Pick one in **Settings → Compatibility layer**:

| Runner | Where it is detected |
|---|---|
| **GE-Proton / custom builds** | `~/.steam/root/compatibilitytools.d/`, `/usr/share/steam/compatibilitytools.d/` |
| **Valve Proton** (Experimental, 9.0, …) | `steamapps/common/Proton*` in every Steam library (native, Flatpak and Snap Steam) |
| **System Wine** | `wine` on your `PATH` |

**Automatic** picks GE-Proton first, then Proton Experimental, then official Proton, then Wine.

If [umu-launcher](https://github.com/Open-Wine-Components/umu-launcher) is installed (`umu-run` on your `PATH`), Proton runs inside the Steam Linux Runtime, the same container Steam uses. This is the most compatible option. Without any Proton installed, umu downloads UMU-Proton on its own.

- Each game gets its own prefix in `~/.config/RohanKar Launcher/prefixes/<game>/`, where your saves live.
- Game output (Proton/Wine logs) is written to `~/.config/RohanKar Launcher/logs/<game>.log`.
- Playtime is tracked automatically while the game runs.

### Add to Steam / Steam Deck

**Add to Steam** creates a Non-Steam shortcut that starts the launcher in headless mode (`--launch <game>`). The game then runs through the same Proton setup and prefix as when you launch it from the launcher. You don't need to force a compatibility tool in the shortcut's properties. Restart Steam for the shortcut to appear.

---

## Requirements

- Linux x86_64 (built on Ubuntu 22.04, runs on glibc 2.35+ distros: Fedora, Arch, SteamOS, Mint…)
- Proton (via Steam or GE-Proton), umu-launcher, or Wine
- Internet connection (to browse and download games from Archive.org)
- `.zip` and `.7z` archives work out of the box. `.rar` needs 7-Zip or unrar from your distro:
  - Fedora: `sudo dnf install 7zip`
  - Ubuntu/Debian: `sudo apt install 7zip unrar`
  - Arch/SteamOS: `sudo pacman -S 7zip`

### Building from source

```bash
npm ci
npm run build:linux   # → dist/RohanKar-Launcher-<version>-x86_64.AppImage
```

---

## Notes for Game Uploaders

To include a hero banner image for your game, place a file named `hero.png` in the root of your archive alongside the game folder and readme. The launcher will automatically display it as the banner when your game is selected.

Recommended hero image dimensions: **1920 × 620px**

---

## Tech Stack

- [Electron](https://www.electronjs.org/)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [electron-updater](https://www.electron.build/auto-update)
- [Archive.org Advancedsearch API](https://archive.org/advancedsearch.php)

---

## License

This project is not affiliated with the Internet Archive. All games in the collection are property of their respective owners and are hosted publicly on Archive.org.
