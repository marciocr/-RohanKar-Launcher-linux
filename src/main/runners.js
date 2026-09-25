'use strict';
/**
 * RohanKar Launcher — runners.js
 * Linux compatibility layer: detects Proton / Wine / umu-launcher and builds
 * the command used to run Windows executables.
 *
 * Runner ids (stored in settings.runner):
 *   'auto'            → first detected Proton, falling back to Wine
 *   'proton:<dir>'    → a specific Proton build (dir contains the `proton` script)
 *   'wine'            → system Wine
 *
 * Each game gets its own prefix under <prefixesDir>/<identifier>/ so saves and
 * registry tweaks never leak between games.
 */

const path = require('path');
const fs   = require('fs');
const os   = require('os');

const HOME = os.homedir();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function which(bin) {
  for (const dir of (process.env.PATH || '').split(':')) {
    if (!dir) continue;
    const full = path.join(dir, bin);
    try {
      fs.accessSync(full, fs.constants.X_OK);
      if (fs.statSync(full).isFile()) return full;
    } catch {}
  }
  return null;
}

function realpathOrNull(p) {
  try { return fs.realpathSync(p); } catch { return null; }
}

function listDirs(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isDirectory() || e.isSymbolicLink())
      .map(e => path.join(dir, e.name));
  } catch { return []; }
}

// ─── Steam detection ──────────────────────────────────────────────────────────

const STEAM_ROOT_CANDIDATES = [
  path.join(HOME, '.steam', 'steam'),
  path.join(HOME, '.steam', 'root'),
  path.join(HOME, '.local', 'share', 'Steam'),
  path.join(HOME, '.var', 'app', 'com.valvesoftware.Steam', '.local', 'share', 'Steam'),
  path.join(HOME, 'snap', 'steam', 'common', '.local', 'share', 'Steam'),
];

// All distinct Steam installs on this machine (native, Flatpak, Snap).
function findSteamRoots() {
  const seen  = new Set();
  const roots = [];
  for (const c of STEAM_ROOT_CANDIDATES) {
    const real = realpathOrNull(c);
    if (!real || seen.has(real)) continue;
    if (!fs.existsSync(path.join(real, 'steamapps')) && !fs.existsSync(path.join(real, 'userdata'))) continue;
    seen.add(real);
    roots.push(real);
  }
  return roots;
}

// Steam library folders (extra drives), parsed from libraryfolders.vdf.
function findSteamLibraries(steamRoot) {
  const libs = [steamRoot];
  const vdf  = path.join(steamRoot, 'steamapps', 'libraryfolders.vdf');
  try {
    const text = fs.readFileSync(vdf, 'utf8');
    for (const m of text.matchAll(/"path"\s+"([^"]+)"/g)) {
      const p = realpathOrNull(m[1].replace(/\\\\/g, '\\'));
      if (p && !libs.includes(p)) libs.push(p);
    }
  } catch {}
  return libs;
}

// ─── Proton detection ─────────────────────────────────────────────────────────

function isProtonDir(dir) {
  return fs.existsSync(path.join(dir, 'proton'));
}

// Sort so the "best default" comes first: GE-Proton (newest first), then
// Proton Experimental, then official Proton releases (newest first), then others.
function protonRank(name) {
  if (/^GE-Proton/i.test(name))       return 0;
  if (/experimental/i.test(name))     return 1;
  if (/^Proton \d/i.test(name))       return 2;
  return 3;
}

function detectProtonBuilds() {
  const dirs = new Set();

  for (const root of findSteamRoots()) {
    for (const d of listDirs(path.join(root, 'compatibilitytools.d'))) dirs.add(d);
    for (const lib of findSteamLibraries(root)) {
      for (const d of listDirs(path.join(lib, 'steamapps', 'common'))) {
        if (/proton/i.test(path.basename(d))) dirs.add(d);
      }
    }
  }
  // System-wide compat tools (distro packages such as proton-ge-custom)
  for (const d of listDirs('/usr/share/steam/compatibilitytools.d')) dirs.add(d);

  const builds = [];
  const seen   = new Set();
  for (const d of dirs) {
    const real = realpathOrNull(d);
    if (!real || seen.has(real) || !isProtonDir(real)) continue;
    seen.add(real);
    builds.push({ id: 'proton:' + real, name: path.basename(d), dir: real });
  }

  builds.sort((a, b) =>
    protonRank(a.name) - protonRank(b.name) ||
    b.name.localeCompare(a.name, undefined, { numeric: true })
  );

  // Same build in several Steam libraries (e.g. "Proton - Experimental" on two
  // drives) — add the library location so the Settings dropdown can tell them apart
  const counts = {};
  for (const b of builds) counts[b.name] = (counts[b.name] || 0) + 1;
  for (const b of builds) {
    if (counts[b.name] < 2) continue;
    const lib = b.dir.split(path.sep + 'steamapps' + path.sep)[0];
    b.name += ` (${lib.replace(HOME, '~')})`;
  }
  return builds;
}

// ─── Public: list available runners ───────────────────────────────────────────

function listRunners() {
  const protons = detectProtonBuilds();
  const wine    = which('wine');
  const umu     = which('umu-run');

  const runners = protons.map(p => ({ id: p.id, name: p.name, type: 'proton' }));
  if (wine) runners.push({ id: 'wine', name: 'System Wine', type: 'wine' });

  return {
    runners,
    umuAvailable: !!umu,
    steamRoots:   findSteamRoots(),
  };
}

// Resolve a runner id ('auto', 'proton:…', 'wine') to a concrete runner.
function resolveRunner(runnerId) {
  const protons = detectProtonBuilds();

  if (runnerId && runnerId.startsWith('proton:')) {
    const dir = runnerId.slice('proton:'.length);
    if (isProtonDir(dir)) return { type: 'proton', dir, name: path.basename(dir) };
    // Saved build was removed — fall through to auto
  }
  if (runnerId === 'wine' && which('wine')) return { type: 'wine' };

  if (protons.length) return { type: 'proton', dir: protons[0].dir, name: protons[0].name };
  if (which('wine'))  return { type: 'wine' };
  return null;
}

// ─── Environment ──────────────────────────────────────────────────────────────

// When running from an AppImage, AppRun may prepend bundled paths to library
// and search variables. Games must not inherit those, so strip any entry that
// points inside the mounted AppImage.
function cleanEnv() {
  const env    = { ...process.env };
  const appDir = env.APPDIR;
  if (appDir) {
    for (const key of ['LD_LIBRARY_PATH', 'LD_PRELOAD', 'PATH', 'XDG_DATA_DIRS', 'GST_PLUGIN_SYSTEM_PATH', 'GST_PLUGIN_SYSTEM_PATH_1_0', 'PYTHONPATH', 'PYTHONHOME', 'QT_PLUGIN_PATH', 'PERLLIB', 'GSETTINGS_SCHEMA_DIR']) {
      if (!env[key]) continue;
      const sep  = key === 'LD_PRELOAD' ? /[: ]/ : ':';
      const kept = env[key].split(sep).filter(p => p && !p.startsWith(appDir));
      if (kept.length) env[key] = kept.join(key === 'LD_PRELOAD' ? ' ' : ':');
      else delete env[key];
    }
  }
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.CHROME_DESKTOP;
  return env;
}

// ─── Public: build the launch command for an executable ───────────────────────
//
// Returns { cmd, args, env, cwd, runnerName } or { error }.

const WINDOWS_EXT = /\.(exe|bat|msi|com)$/i;

function buildLaunchCommand({ exePath, prefixDir, runnerId, useUmu }) {
  const cwd = path.dirname(exePath);
  const env = cleanEnv();

  // Native Linux binary / script — run it directly
  if (!WINDOWS_EXT.test(exePath)) {
    try { fs.chmodSync(exePath, fs.statSync(exePath).mode | 0o111); } catch {}
    return { cmd: exePath, args: [], env, cwd, runnerName: 'native' };
  }

  const runner = resolveRunner(runnerId);
  const umu    = useUmu ? which('umu-run') : null;

  fs.mkdirSync(prefixDir, { recursive: true });

  // umu-launcher runs Proton inside the Steam Linux Runtime (the same
  // container Steam uses), which is the most compatible way to run Proton
  // outside of Steam. With no Proton installed it downloads UMU-Proton itself.
  if (umu && runner?.type !== 'wine') {
    env.WINEPREFIX = path.join(prefixDir, 'pfx');
    env.GAMEID     = env.GAMEID || 'umu-default';
    env.STORE      = env.STORE  || 'none';
    if (runner?.type === 'proton') env.PROTONPATH = runner.dir;
    return { cmd: umu, args: [exePath], env, cwd, runnerName: `umu (${runner?.name || 'UMU-Proton'})` };
  }

  if (!runner) {
    return { error: 'No Proton or Wine found. Install Steam + Proton (or GE-Proton), umu-launcher, or Wine.' };
  }

  if (runner.type === 'proton') {
    const steamRoot = findSteamRoots()[0] || '';
    env.STEAM_COMPAT_DATA_PATH           = prefixDir;
    env.STEAM_COMPAT_CLIENT_INSTALL_PATH = steamRoot;
    env.STEAM_COMPAT_INSTALL_PATH        = cwd;
    env.SteamAppId  = env.SteamAppId  || '0';
    env.SteamGameId = env.SteamGameId || '0';
    return {
      cmd:  path.join(runner.dir, 'proton'),
      args: ['waitforexitandrun', exePath],
      env, cwd,
      runnerName: runner.name,
    };
  }

  // System Wine — separate prefix dir so it never touches a Proton prefix
  env.WINEPREFIX = path.join(prefixDir, 'wine');
  fs.mkdirSync(env.WINEPREFIX, { recursive: true });
  return { cmd: which('wine'), args: [exePath], env, cwd, runnerName: 'Wine' };
}

module.exports = {
  which,
  findSteamRoots,
  listRunners,
  buildLaunchCommand,
};
