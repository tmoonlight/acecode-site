const DOWNLOAD_PAGE = 'https://acecode.cc/download/';
const CDN = 'https://acecodedownload.b-cdn.net';
const FORMATS = { windows: ['zip'], macos: ['pkg', 'dmg'], linux: ['tar'] };

export function downloadPlatform(browser, hints = {}) {
  const ua = browser.userAgent || '';
  const platform = browser.userAgentData?.platform || browser.platform || '';
  const source = `${platform} ${ua}`;
  if (/android|iphone|ipad|ipod|cros/i.test(source) ||
      (/mac/i.test(platform) && browser.maxTouchPoints > 1)) return null;
  const os = /win/i.test(platform) || /windows nt/i.test(ua) ? 'windows'
    : /mac/i.test(source) ? 'macos' : /linux|x11/i.test(source) ? 'linux' : null;
  if (!os) return null;
  let arch = /aarch64|arm64/i.test(source) ? 'arm64'
    : /armv7|armv8l/i.test(source) ? 'armv7'
    : /x86_64|amd64|win64|x64/i.test(source) ? 'x64' : null;
  if (hints.architecture === 'arm') arch = hints.bitness === '32' ? 'armv7' : 'arm64';
  if (hints.architecture === 'x86') arch = hints.bitness === '32' ? 'x86' : 'x64';
  return { os, arch: arch || (os === 'macos' ? 'arm64' : 'x64') };
}

export function latestDownload(manifest, platform) {
  const release = manifest.releases?.find(item => item.version === manifest.latest && !item.prerelease);
  if (!release || typeof release.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(release.version)) return null;
  const result = { version: release.version, file: null };
  if (!platform || !FORMATS[platform.os]) return result;
  for (const kind of FORMATS[platform.os]) {
    const file = release.packages?.find(item => {
      if (item.platform !== platform.os || item.arch !== platform.arch || item.kind !== kind ||
          typeof item.file !== 'string' || !/^[\w.+-]+$/.test(item.file)) return false;
      try {
        const url = new URL(item.url);
        return url.origin === CDN && !url.username && !url.password && !url.search && !url.hash &&
          url.pathname === `/${release.tag}/${encodeURIComponent(item.file)}`;
      } catch { return false; }
    });
    if (file) return { ...result, file };
  }
  return result;
}

async function initDownload() {
  const button = document.getElementById('latest-download');
  if (!button) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const manifestRequest = fetch(new URL('../aceupdate.json', location.href), {
      signal: controller.signal, cache: 'no-cache',
    }).then(response => {
      if (!response.ok) throw new Error('Release manifest unavailable');
      return response.json();
    });
    let hintTimeout;
    const hintsRequest = Promise.race([
      Promise.resolve().then(() => navigator.userAgentData?.getHighEntropyValues?.(['architecture', 'bitness']))
        .catch(() => null),
      new Promise(resolve => { hintTimeout = setTimeout(() => resolve(null), 500); }),
    ]).finally(() => clearTimeout(hintTimeout));
    const [manifest, hints] = await Promise.all([manifestRequest, hintsRequest]);
    const platform = downloadPlatform(navigator, hints || {});
    const choice = latestDownload(manifest, platform);
    if (!choice) return;
    document.getElementById('latest-download-version').textContent = ` ${choice.version}`;
    if (choice.file) {
      button.href = choice.file.url;
      button.download = choice.file.file;
      const names = { windows: 'Windows', macos: 'macOS', linux: 'Linux' };
      const detail = document.getElementById('latest-download-platform');
      detail.textContent = `${names[platform.os]} · ${platform.arch === 'arm64' ? 'ARM64' : platform.arch}`;
      detail.hidden = false;
    }
  } catch {
    button.href = DOWNLOAD_PAGE;
  } finally {
    clearTimeout(timeout);
  }
}

if (typeof document !== 'undefined') void initDownload();
