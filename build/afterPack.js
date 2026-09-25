'use strict';
/**
 * electron-builder afterPack hook (Linux only).
 *
 * Replaces the app binary with a small shell wrapper that adds --no-sandbox
 * *at process start* when Chromium's sandbox can't work:
 *   - the AppImage can't ship the SUID chrome-sandbox helper, and
 *   - some distros (e.g. Ubuntu 24.04+) block unprivileged user namespaces.
 *
 * The flag must be on the real command line: app.commandLine.appendSwitch()
 * runs after the zygote has already started sandboxed, and the resulting
 * mismatch crashes the renderer (white window, /dev/shm FATAL in the log).
 */

const fs   = require('fs');
const path = require('path');

const WRAPPER = `#!/bin/sh
HERE="$(dirname "$(readlink -f "$0")")"
if [ -n "$APPIMAGE" ] && ! unshare -Ur true >/dev/null 2>&1; then
  set -- --no-sandbox "$@"
fi
exec "$HERE/@BIN@.bin" "$@"
`;

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'linux') return;

  const exeName = context.packager.executableName;
  const exePath = path.join(context.appOutDir, exeName);
  const binPath = exePath + '.bin';

  if (!fs.existsSync(binPath)) fs.renameSync(exePath, binPath);
  fs.writeFileSync(exePath, WRAPPER.replace('@BIN@', exeName), { mode: 0o755 });
};
