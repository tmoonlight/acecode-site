/*
 * ACECode 下载页脚本。
 *
 * - 版本、更新说明、安装包与校验值读取 GitHub Releases 导出的公开清单。
 * - 所有安装包使用包含版本号的 CDN 链接。
 * - 兼容严格 CSP:不使用 eval、内联脚本、内联样式或 style 属性,所有 DOM 经 createElement 构造。
 */
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const MANIFEST_URL = new URL(root.dataset.manifest || '../aceupdate.json', location.href);
  const FILE_BASE = new URL(root.dataset.fileBase || '../', location.href);
  const RELEASES_URL = 'https://github.com/tmoonlight/acecode/releases';
  const PAGE_SIZE = 20;
  const PROBE_CONCURRENCY = 6;
  const REQUEST_TIMEOUT_MS = 8000;
  const FIRST_PAINT_WAIT_MS = 2500;
  const SAFE_FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/;
  const SHA256_HEX = /^[0-9a-f]{64}$/i;

  const PLATFORM_ORDER = ['windows', 'macos', 'linux', 'extension', 'other'];
  const PLATFORMS = {
    windows: {
      name: 'Windows',
      badge: 'WIN',
      archs: ['x64', 'arm64'],
      archNames: { x64: 'x64', arm64: 'ARM64' },
      defaultArch: 'x64',
      subtitle: '免安装压缩包，含桌面端与终端版',
      hints: [
        ['解压到任意目录，运行 ', { code: 'acecode-desktop.exe' }, ' 打开桌面端，或在终端运行 ', { code: 'acecode.exe' }, '。'],
        '桌面端需要 Microsoft Edge WebView2 运行时；请保留解压后的完整目录。',
      ],
    },
    macos: {
      name: 'macOS',
      badge: 'MAC',
      archs: ['arm64', 'x64'],
      archNames: { arm64: 'Apple 芯片', x64: 'Intel 芯片' },
      defaultArch: 'arm64',
      subtitle: 'Apple 芯片与 Intel 芯片分别提供',
      hints: [
        ['双击 PKG 按提示安装到当前用户，完成后在 ', { code: '~/Applications' }, ' 中打开 ACECode。'],
        '不确定芯片类型？在苹果菜单 >「关于本机」中查看。',
      ],
    },
    linux: {
      name: 'Linux',
      badge: 'LINUX',
      archs: ['x64', 'arm64', 'armv7'],
      archNames: { x64: 'x64', arm64: 'ARM64', armv7: 'ARMv7' },
      defaultArch: 'x64',
      subtitle: 'tar.gz 压缩包，含桌面端与终端版',
      hints: [
        ['解压后在目录中运行 ', { code: './acecode' }, '；桌面端运行 ', { code: './acecode-desktop' }, '，需要 WebKitGTK 4.1。'],
        'glibc 较旧的发行版请改用「旧系统兼容包」。',
      ],
    },
    extension: {
      name: '浏览器扩展',
      badge: 'EXT',
      archs: ['any'],
      archNames: { any: 'Chrome / Edge' },
      defaultArch: 'any',
      subtitle: 'ACE Browser Bridge',
      hints: ['解压后在浏览器扩展管理页开启开发者模式，选择「加载已解压的扩展程序」。'],
    },
    other: {
      name: '其它',
      badge: 'OTHER',
      archs: [],
      archNames: {},
      defaultArch: null,
      subtitle: '',
      hints: [],
    },
  };

  // rank 越小越靠前:同一架构下 rank 最小的文件作为主下载按钮。
  const KINDS = {
    setup: { label: '安装程序', rank: 0 },
    zip: { label: '免安装包', rank: 1 },
    portable: { label: '便携包', rank: 2 },
    pkg: { label: '安装包', rank: 0 },
    appzip: { label: '应用压缩包', rank: 1 },
    dmg: { label: '磁盘映像', rank: 2 },
    mactar: { label: '压缩包', rank: 3 },
    tar: { label: '压缩包', rank: 0 },
    update: { label: '升级包', rank: 2 },
    oldtar: { label: '旧系统兼容包', rank: 3 },
    extension: { label: '扩展包', rank: 0 },
    other: { label: '升级包', rank: 9 },
  };

  // aceupdate.json 的 target → [平台, 架构, 类型]
  const TARGETS = {
    'windows-x64': ['windows', 'x64', 'zip'],
    'windows-arm64': ['windows', 'arm64', 'zip'],
    'macos-x64': ['macos', 'x64', 'appzip'],
    'macos-arm64': ['macos', 'arm64', 'appzip'],
    'linux-x64-updater-v1': ['linux', 'x64', 'update'],
    'linux-arm64-updater-v1': ['linux', 'arm64', 'update'],
    'chrome-extension': ['extension', 'any', 'extension'],
  };

  // 发布流程放进 aupdate、但不写进清单的文件命名规则;{v} 替换为版本号。
  const EXTRA_FILES = [
    ['ACECode-{v}-windows-x64-setup.exe', 'windows', 'x64', 'setup'],
    ['ACECode-{v}-windows-arm64-setup.exe', 'windows', 'arm64', 'setup'],
    ['acecode-{v}-windows-x64.zip', 'windows', 'x64', 'zip'],
    ['acecode-{v}-windows-arm64.zip', 'windows', 'arm64', 'zip'],
    ['acecode-{v}-windows-x64-portable.zip', 'windows', 'x64', 'portable'],
    ['acecode-{v}-windows-arm64-portable.zip', 'windows', 'arm64', 'portable'],
    ['ACECode-{v}-macos-arm64.pkg', 'macos', 'arm64', 'pkg'],
    ['ACECode-{v}-macos-x64.pkg', 'macos', 'x64', 'pkg'],
    ['ACECode-{v}-macos-arm64.dmg', 'macos', 'arm64', 'dmg'],
    ['ACECode-{v}-macos-x64.dmg', 'macos', 'x64', 'dmg'],
    ['ACECode-{v}-macos-arm64-update.zip', 'macos', 'arm64', 'appzip'],
    ['ACECode-{v}-macos-x64-update.zip', 'macos', 'x64', 'appzip'],
    ['acecode-{v}-macos-arm64.tar.gz', 'macos', 'arm64', 'mactar'],
    ['acecode-{v}-macos-x64.tar.gz', 'macos', 'x64', 'mactar'],
    ['acecode-{v}-linux-x64.tar.gz', 'linux', 'x64', 'tar'],
    ['acecode-{v}-linux-arm64.tar.gz', 'linux', 'arm64', 'tar'],
    ['acecode-{v}-linux-armv7.tar.gz', 'linux', 'armv7', 'tar'],
    ['acecode-{v}-linux-old-x64.tar.gz', 'linux', 'x64', 'oldtar'],
    ['acecode-{v}-linux-old-arm64.tar.gz', 'linux', 'arm64', 'oldtar'],
    ['acecode-{v}-linux-old-armv7.tar.gz', 'linux', 'armv7', 'oldtar'],
    ['acecode-{v}-linux-x64-update.zip', 'linux', 'x64', 'update'],
    ['acecode-{v}-linux-arm64-update.zip', 'linux', 'arm64', 'update'],
    ['ace-browser-bridge-{v}.zip', 'extension', 'any', 'extension'],
  ];

  const state = {
    releases: [],
    latestStable: null,
    latestPreview: null,
    platform: detectPlatform(),
    channel: 'stable',
    query: '',
    limit: PAGE_SIZE,
    open: new Set(),
    resolved: new Map(),
  };

  const $ = (id) => doc.getElementById(id);

  // ---------- DOM 工具 ----------

  function h(tag, props, ...children) {
    const el = doc.createElement(tag);
    if (props) {
      for (const key of Object.keys(props)) {
        const value = props[key];
        if (value == null || value === false) continue;
        if (key === 'class') el.className = value;
        else if (value === true) el.setAttribute(key, '');
        else el.setAttribute(key, String(value));
      }
    }
    appendChildren(el, children);
    return el;
  }

  function appendChildren(el, children) {
    for (const child of children) {
      if (child == null || child === false) continue;
      if (Array.isArray(child)) appendChildren(el, child);
      else el.append(child instanceof Node ? child : String(child));
    }
  }

  // 反引号包裹的片段渲染为 <code>,其余按纯文本处理。
  function inlineCode(text) {
    const out = [];
    const pattern = /`([^`]+)`/g;
    let last = 0;
    let match;
    while ((match = pattern.exec(text))) {
      if (match.index > last) out.push(text.slice(last, match.index));
      out.push(h('code', null, match[1]));
      last = pattern.lastIndex;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }

  function richText(parts) {
    const list = Array.isArray(parts) ? parts : [parts];
    return list.map((part) => (typeof part === 'string' ? inlineCode(part) : h('code', null, part.code)));
  }

  function pixelLoader() {
    return h('span', { class: 'pixel-loader', 'aria-hidden': 'true' },
      Array.from({ length: 8 }, () => h('i')));
  }

  function copyButton(text, toastText, label, ariaLabel) {
    return h('button', {
      type: 'button',
      class: 'mini-button',
      'data-copy': text,
      'data-copy-label': toastText,
      'aria-label': ariaLabel || null,
    }, label || '复制');
  }

  // ---------- 版本与说明解析 ----------

  function parseVersion(raw) {
    const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(String(raw).trim());
    if (!match) return null;
    return {
      major: Number(match[1]),
      minor: Number(match[2]),
      patch: Number(match[3]),
      pre: match[4] ? match[4].split('.') : [],
    };
  }

  // 与 semver 一致:正式版高于同号预览版,预览标识逐段比较(数字段按数值)。
  function compareVersions(a, b) {
    for (const key of ['major', 'minor', 'patch']) {
      if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1;
    }
    if (!a.pre.length || !b.pre.length) {
      if (a.pre.length === b.pre.length) return 0;
      return a.pre.length ? -1 : 1;
    }
    const length = Math.max(a.pre.length, b.pre.length);
    for (let i = 0; i < length; i += 1) {
      const x = a.pre[i];
      const y = b.pre[i];
      if (x === undefined) return -1;
      if (y === undefined) return 1;
      const xNumeric = /^\d+$/.test(x);
      const yNumeric = /^\d+$/.test(y);
      if (xNumeric && yNumeric) {
        const diff = Number(x) - Number(y);
        if (diff) return diff < 0 ? -1 : 1;
      } else if (xNumeric !== yNumeric) {
        return xNumeric ? -1 : 1;
      } else if (x !== y) {
        return x < y ? -1 : 1;
      }
    }
    return 0;
  }

  // 把 "1. xxx。2. yyy。" 这类写在一行里的编号拆开;只在编号从 1 开始且连续递增时才拆。
  function splitInlineNumbered(line) {
    const pattern = /(^|[\s。；;！!？?，,])(\d{1,2})[.、．](?!\d)/g;
    const cuts = [];
    let match;
    while ((match = pattern.exec(line))) {
      const number = Number(match[2]);
      if (!cuts.length ? number === 1 && match.index === 0 : number === cuts[cuts.length - 1].number + 1) {
        cuts.push({ at: match.index + match[1].length, number });
      }
    }
    if (cuts.length < 2) return [line];
    return cuts.map((cut, i) => line.slice(cut.at, i + 1 < cuts.length ? cuts[i + 1].at : undefined).trim());
  }

  function parseNotes(text) {
    const clean = String(text || '').replace(/\r\n?/g, '\n').trim();
    if (!clean) return { ordered: false, items: [] };
    let lines = clean.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.length === 1) lines = splitInlineNumbered(lines[0]);
    const numbered = lines.filter((line) => /^\d{1,2}[.、．)）](?!\d)/.test(line)).length;
    const items = lines
      .map((line) => line.replace(/^(?:\d{1,2}[.、．)）](?!\d)|[-*•·])\s*/, '').trim())
      .filter(Boolean);
    return { ordered: items.length > 1 && numbered * 2 >= lines.length, items };
  }

  // ---------- 文件分类 ----------

  function platformMeta(id) {
    return PLATFORMS[id] || PLATFORMS.other;
  }

  function archName(meta, arch) {
    if (meta.archNames[arch]) return meta.archNames[arch];
    return arch === 'any' ? '通用' : String(arch || '').toUpperCase();
  }

  function kindLabel(file) {
    return (KINDS[file.kind] || KINDS.other).label;
  }

  function formatOf(name) {
    const lower = name.toLowerCase();
    if (lower.endsWith('.tar.gz')) return 'TAR.GZ';
    const match = /\.([a-z0-9]+)$/.exec(lower);
    return match ? match[1].toUpperCase() : '文件';
  }

  function classifyTarget(target, fileName) {
    const known = TARGETS[target];
    if (known) return { platform: known[0], arch: known[1], kind: known[2] };
    const match = /^(windows|macos|linux)-([a-z0-9]+)/i.exec(target);
    if (match) return { platform: match[1].toLowerCase(), arch: match[2].toLowerCase(), kind: 'other' };
    if (/extension|bridge/i.test(target) || /^ace-browser-bridge/i.test(fileName)) {
      return { platform: 'extension', arch: 'any', kind: 'extension' };
    }
    return { platform: 'other', arch: 'any', kind: 'other' };
  }

  function fileUrl(name) {
    return new URL(encodeURIComponent(name), FILE_BASE).href;
  }

  function makeFile(name, info, extra) {
    return {
      name,
      url: fileUrl(name),
      platform: info.platform,
      arch: info.arch,
      kind: info.kind,
      size: extra.size || null,
      sha256: extra.sha256 || null,
    };
  }

  function manifestFile(pkg) {
    if (!pkg || typeof pkg.file !== 'string' || !SAFE_FILE_NAME.test(pkg.file)) return null;
    if (typeof pkg.url !== 'string') return null;
    let url;
    try { url = new URL(pkg.url); } catch (_) { return null; }
    if (url.origin !== 'https://acecodedownload.b-cdn.net' ||
        !/^\/v[^/]+\/[^/]+$/.test(url.pathname)) return null;
    const info = pkg.platform && PLATFORMS[pkg.platform]
      ? { platform: pkg.platform, arch: pkg.arch || 'any', kind: pkg.kind || 'other' }
      : classifyTarget(String(pkg.target || ''), pkg.file);
    const size = Number(pkg.size);
    const file = makeFile(pkg.file, info, {
      size: Number.isFinite(size) && size > 0 ? size : null,
      sha256: typeof pkg.sha256 === 'string' && SHA256_HEX.test(pkg.sha256)
        ? pkg.sha256.toLowerCase() : null,
    });
    file.url = url.href;
    return file;
  }

  function platformIndex(id) {
    const index = PLATFORM_ORDER.indexOf(id);
    return index < 0 ? PLATFORM_ORDER.length : index;
  }

  function archIndex(file) {
    const archs = platformMeta(file.platform).archs;
    const index = archs.indexOf(file.arch);
    return index < 0 ? archs.length : index;
  }

  function sortFiles(files) {
    return files.sort((a, b) =>
      platformIndex(a.platform) - platformIndex(b.platform) ||
      archIndex(a) - archIndex(b) ||
      (KINDS[a.kind] || KINDS.other).rank - (KINDS[b.kind] || KINDS.other).rank ||
      a.name.localeCompare(b.name));
  }

  function uniquePlatforms(files) {
    const ids = [];
    for (const file of files) if (!ids.includes(file.platform)) ids.push(file.platform);
    return ids.sort((a, b) => platformIndex(a) - platformIndex(b));
  }

  // 同一平台按架构分组,每组内已按 rank 排好序,第一个即主下载。
  function archGroups(files, platformId) {
    const groups = [];
    for (const file of sortFiles(files.filter((f) => f.platform === platformId))) {
      let group = groups.find((g) => g.arch === file.arch);
      if (!group) {
        group = { arch: file.arch, files: [] };
        groups.push(group);
      }
      group.files.push(file);
    }
    return groups;
  }

  function preferredArch(platformId, archs) {
    const meta = platformMeta(platformId);
    const detected = state.platform.os === platformId ? state.platform.arch : null;
    if (detected && archs.includes(detected)) return detected;
    if (meta.defaultArch && archs.includes(meta.defaultArch)) return meta.defaultArch;
    return archs[0] || null;
  }

  function pickRecommended(files, platformId) {
    const groups = archGroups(files, platformId);
    if (!groups.length) return null;
    const arch = preferredArch(platformId, groups.map((g) => g.arch));
    return (groups.find((g) => g.arch === arch) || groups[0]).files[0];
  }

  function describeFile(file) {
    const meta = platformMeta(file.platform);
    const parts = [meta.name];
    if (file.arch !== 'any') parts.push(archName(meta, file.arch));
    parts.push(kindLabel(file));
    return parts.join(' · ');
  }

  // ---------- 格式化 ----------

  const pad2 = (n) => String(n).padStart(2, '0');

  function formatDate(date) {
    if (!date) return '日期未知';
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function formatDateTime(date) {
    if (!date) return '日期未知';
    return `${formatDate(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  }

  const relativeFormatter = typeof Intl !== 'undefined' && Intl.RelativeTimeFormat
    ? new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' })
    : null;

  function formatRelative(date) {
    if (!date || !relativeFormatter) return '';
    const seconds = (date.getTime() - Date.now()) / 1000;
    const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (const [unit, size] of units) {
      if (Math.abs(seconds) >= size) return relativeFormatter.format(Math.round(seconds / size), unit);
    }
    return '刚刚';
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '大小未知';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return `${unit === 0 || value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
  }

  function shortHash(hash) {
    return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
  }

  // ---------- 平台检测 ----------

  function detectPlatform() {
    const nav = navigator;
    const ua = nav.userAgent || '';
    const hint = (nav.userAgentData && nav.userAgentData.platform) || nav.platform || '';
    let os = 'unknown';
    if (/android|iphone|ipad|ipod/i.test(ua)) os = 'mobile';
    else if (/win/i.test(hint) || /windows nt/i.test(ua)) os = 'windows';
    else if (/mac/i.test(hint) || /macintosh|mac os x/i.test(ua)) os = (nav.maxTouchPoints || 0) > 1 ? 'mobile' : 'macos';
    else if (/linux|x11|cros|chrome os/i.test(`${hint} ${ua}`)) os = 'linux';

    let arch = null;
    if (/aarch64|arm64/i.test(`${hint} ${ua}`)) arch = 'arm64';
    else if (/armv7|armv8l/i.test(`${hint} ${ua}`)) arch = 'armv7';
    else if (os === 'linux' && /x86_64|amd64/i.test(`${hint} ${ua}`)) arch = 'x64';
    return { os, arch };
  }

  // 高熵 UA 只在安全上下文(HTTPS / localhost)里可用;拿不到时维持默认架构。
  async function refinePlatform() {
    const data = navigator.userAgentData;
    if (!data || typeof data.getHighEntropyValues !== 'function') return;
    try {
      const values = await data.getHighEntropyValues(['architecture', 'bitness']);
      if (values.architecture === 'arm') state.platform.arch = values.bitness === '32' ? 'armv7' : 'arm64';
      else if (values.architecture === 'x86' && values.bitness === '64') state.platform.arch = 'x64';
    } catch (_) {
      // 忽略:无法获取时按默认架构推荐。
    }
  }

  // ---------- 网络 ----------

  async function fetchWithTimeout(url, options, timeout) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeout || REQUEST_TIMEOUT_MS) : 0;
    try {
      return await fetch(url, Object.assign({ credentials: 'same-origin' }, options, controller ? { signal: controller.signal } : {}));
    } finally {
      clearTimeout(timer);
    }
  }

  function userError(message) {
    const error = new Error(message);
    error.userMessage = message;
    return error;
  }

  async function loadManifest() {
    let response;
    try {
      response = await fetchWithTimeout(MANIFEST_URL.href, { cache: 'no-cache', headers: { Accept: 'application/json' } }, 15000);
    } catch (_) {
      throw userError('网络请求失败或超时，请检查网络后重试。');
    }
    if (!response.ok) throw userError(`服务器返回了 HTTP ${response.status}。`);
    let data;
    try {
      data = JSON.parse(await response.text());
    } catch (_) {
      throw userError('返回的内容不是有效的 JSON。');
    }
    if (!data || !Array.isArray(data.releases)) throw userError('清单里没有 releases 列表。');
    return data;
  }

  function isHtml(response) {
    return (response.headers.get('content-type') || '').toLowerCase().startsWith('text/html');
  }

  function sizeFromHeaders(response) {
    const range = /\/(\d+)\s*$/.exec(response.headers.get('content-range') || '');
    if (range) return Number(range[1]);
    const length = Number(response.headers.get('content-length'));
    return Number.isFinite(length) && length > 0 ? length : null;
  }

  async function probeFile(name) {
    const url = fileUrl(name);
    try {
      let response = await fetchWithTimeout(url, { method: 'HEAD', cache: 'no-store', redirect: 'manual' });
      if (response.status === 405 || response.status === 501) {
        // 不支持 HEAD 的服务器:只请求第一个字节,再立即丢弃响应体。
        response = await fetchWithTimeout(url, {
          method: 'GET',
          cache: 'no-store',
          redirect: 'manual',
          headers: { Range: 'bytes=0-0' },
        });
        if (response.body && typeof response.body.cancel === 'function') response.body.cancel().catch(() => {});
      }
      if (!response.ok || isHtml(response)) return null;
      return { size: sizeFromHeaders(response) };
    } catch (_) {
      return null;
    }
  }

  async function fetchChecksums(name) {
    try {
      const response = await fetchWithTimeout(fileUrl(name), { cache: 'no-store', redirect: 'manual' });
      if (!response.ok || isHtml(response)) return null;
      const map = new Map();
      for (const line of (await response.text()).split(/\r?\n/)) {
        const match = /^([0-9a-fA-F]{64})\s+\*?(.+?)\s*$/.exec(line);
        if (match) map.set(match[2], match[1].toLowerCase());
      }
      return map.size ? map : null;
    } catch (_) {
      return null;
    }
  }

  // SHA256SUMS 里 Linux / macOS 的 tar.gz 用的是不带版本号的原始文件名。
  function checksumFor(sums, name, version) {
    if (!sums) return null;
    return sums.get(name) || sums.get(name.replace(`-${version}-`, '-')) || null;
  }

  async function mapLimit(items, limit, task) {
    const results = new Array(items.length);
    let next = 0;
    async function worker() {
      while (next < items.length) {
        const index = next;
        next += 1;
        results[index] = await task(items[index], index);
      }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
  }

  async function discover(release) {
    return { files: sortFiles(release.packages.slice()), sums: release.sums || null };
  }

  function resolveRelease(release) {
    let pending = state.resolved.get(release.version);
    if (!pending) {
      pending = discover(release).catch(() => ({ files: sortFiles(release.packages.slice()), sums: null }));
      state.resolved.set(release.version, pending);
    }
    return pending;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ---------- 清单归一化 ----------

  function normalizeRelease(raw) {
    if (!raw || typeof raw.version !== 'string') return null;
    const version = raw.version.trim();
    const parsed = parseVersion(version);
    if (!parsed) return null;
    const date = raw.published_at ? new Date(raw.published_at) : null;
    const notesText = typeof raw.notes === 'string' ? raw.notes : '';
    const packages = Array.isArray(raw.packages) ? raw.packages.map(manifestFile).filter(Boolean) : [];
    return {
      version,
      parsed,
      prerelease: raw.prerelease === true || parsed.pre.length > 0,
      date: date && !Number.isNaN(date.getTime()) ? date : null,
      notes: parseNotes(notesText),
      packages: sortFiles(packages),
      sums: raw.sums && /^https:\/\/acecodedownload\.b-cdn\.net\/v[^/]+\/SHA256SUMS/.test(raw.sums.url || '') ? raw.sums : null,
      line: `${parsed.major}.${parsed.minor}`,
      searchText: `${version}\n${notesText}`.toLowerCase(),
    };
  }

  // ---------- 渲染:通用片段 ----------

  function renderNotes(notes) {
    if (!notes.items.length) return h('p', { class: 'notes-empty' }, '这个版本没有填写更新说明。');
    return h(notes.ordered ? 'ol' : 'ul', { class: notes.ordered ? 'notes' : 'notes is-plain' },
      notes.items.map((item) => h('li', null, h('span', null, inlineCode(item)))));
  }

  function downloadButton(file, emphasize) {
    return h('a', {
      class: emphasize ? 'button button-primary button-download' : 'button button-download',
      href: file.url,
      download: file.name,
    },
    h('span', { class: 'button-label' }, `下载 ${formatOf(file.name)}`),
    h('span', { class: 'button-meta' }, `${kindLabel(file)} · ${formatBytes(file.size)}`));
  }

  function hashLine(file) {
    if (!file.sha256) return h('span', { class: 'hash-line hash-label' }, 'SHA-256 未提供');
    return h('span', { class: 'hash-line' },
      h('span', { class: 'hash-label' }, 'SHA-256'),
      h('code', { class: 'hash-short', title: file.sha256 }, shortHash(file.sha256)),
      copyButton(file.sha256, '已复制 SHA-256', '复制', `复制 ${file.name} 的 SHA-256`));
  }

  function altFormatItem(file) {
    return h('li', { class: 'alt-format' },
      h('a', { href: file.url, download: file.name, title: file.name }, `${kindLabel(file)} ${formatOf(file.name)}`),
      h('span', { class: 'alt-size' }, formatBytes(file.size)),
      file.sha256
        ? copyButton(file.sha256, '已复制 SHA-256', 'SHA', `复制 ${file.name} 的 SHA-256`)
        : h('span', { class: 'alt-size' }, '—'));
  }

  function renderArchBlock(meta, group, options) {
    const primary = group.files[0];
    const others = group.files.slice(1);
    const title = options.withPlatform ? `${meta.name} · ${archName(meta, group.arch)}` : archName(meta, group.arch);
    return h('div', { class: 'arch-block' },
      h('div', { class: 'arch-title' },
        h('span', null, title),
        options.recommended ? h('span', { class: 'arch-flag' }, '推荐') : null),
      downloadButton(primary, options.emphasize),
      h('div', { class: 'file-meta' }, h('span', { class: 'file-name' }, primary.name), hashLine(primary)),
      others.length
        ? h('ul', { class: 'alt-formats', 'aria-label': `${meta.name} ${archName(meta, group.arch)} 的其它格式` }, others.map(altFormatItem))
        : null);
  }

  function renderPlatformGrid(files, options) {
    const opts = Object.assign({ partial: false, hints: true }, options);
    const ids = uniquePlatforms(files);
    const matchOs = ids.includes(state.platform.os) ? state.platform.os : null;
    const grid = h('div', { class: 'platform-grid' });
    ids.forEach((id, index) => {
      const meta = platformMeta(id);
      const isMatch = matchOs === id;
      const groups = archGroups(files, id);
      const bestArch = preferredArch(id, groups.map((g) => g.arch));
      const card = h('article', { class: isMatch ? 'platform-card is-match' : 'platform-card' },
        h('div', { class: 'platform-head' },
          h('span', { class: 'index-chip' }, pad2(index + 1)),
          isMatch ? h('span', { class: 'tag tag-stable' }, '适合你的系统') : null),
        h('h3', { class: 'platform-name' }, meta.name),
        meta.subtitle ? h('p', { class: 'platform-sub' }, meta.subtitle) : null);
      const archList = h('div', { class: 'arch-list' });
      groups.forEach((group, groupIndex) => {
        const emphasize = matchOs ? isMatch && group.arch === bestArch : groupIndex === 0;
        archList.append(renderArchBlock(meta, group, { emphasize, recommended: isMatch && group.arch === bestArch }));
      });
      card.append(archList);
      if (opts.partial) card.append(h('p', { class: 'inline-loading platform-pending' }, pixelLoader(), '正在查找其它格式…'));
      if (opts.hints && meta.hints.length) card.append(h('div', { class: 'hint' }, meta.hints.map((hint) => h('p', null, richText(hint)))));
      grid.append(card);
    });
    return grid;
  }

  // ---------- 渲染:最新版本与首屏 ----------

  function renderStage(release, result) {
    const platforms = uniquePlatforms(result.files).map((id) => platformMeta(id).name).join(' · ') || '—';
    const rows = [
      ['版本', release.version],
      ['发布时间', formatDateTime(release.date)],
      ['渠道', release.prerelease ? '预览版' : '正式版'],
      ['平台', platforms],
      ['文件', `${result.files.length} 个`],
    ];
    const spec = h('dl', { class: 'spec-list' },
      rows.map(([label, value]) => h('div', { class: 'spec-row' }, h('dt', null, label), h('dd', null, value))));
    if (result.sums) {
      spec.append(h('div', { class: 'spec-row' },
        h('dt', null, '校验清单'),
        h('dd', null, h('a', { href: result.sums.url, download: result.sums.name }, result.sums.name))));
    }
    return h('div', { class: 'stage' },
      h('div', { class: 'stage-main' },
        h('p', { class: 'kicker' }, "What's new · 更新内容"),
        renderNotes(release.notes),
        h('div', { class: 'upgrade-tip' },
          h('p', { class: 'kicker' }, 'Already installed · 已安装'),
          h('p', null, '可以直接在终端运行下面的命令升级，客户端读取的是同一份版本清单。'),
          h('div', { class: 'command-line' },
            h('code', null, h('span', { class: 'terminal-prompt' }, '$ '), 'acecode upgrade'),
            copyButton('acecode upgrade', '已复制升级命令', '复制', '复制升级命令')))),
      h('aside', { class: 'stage-side', 'aria-label': '版本信息' },
        h('div', null, h('p', { class: 'kicker' }, 'Release info'), spec)));
  }

  function renderLatestHeader(release) {
    $('latest-title').textContent = `ACECode ${release.version}`;
    const tag = $('latest-tag');
    tag.hidden = false;
    tag.className = release.prerelease ? 'tag tag-pre' : 'tag tag-stable';
    tag.textContent = release.prerelease ? '预览版' : '正式版';
    const relative = formatRelative(release.date);
    $('latest-meta').textContent = `发布于 ${formatDateTime(release.date)}${relative ? ` · ${relative}` : ''}`;
  }

  function paintLatest(release, result, partial) {
    $('latest-body').replaceChildren(
      renderStage(release, result),
      renderPlatformGrid(result.files, { partial }));
    updateHero(release, result);
    updateVerify(release, result);
  }

  async function renderLatest() {
    const release = state.latestStable;
    renderLatestHeader(release);
    const pending = resolveRelease(release);
    const early = await Promise.race([pending, delay(FIRST_PAINT_WAIT_MS).then(() => null)]);
    if (early) {
      paintLatest(release, early, false);
      return;
    }
    // 网络较慢:先用清单里的升级包渲染,探测完成后再补全。
    paintLatest(release, { files: sortFiles(release.packages.slice()), sums: null }, true);
    paintLatest(release, await pending, false);
  }

  function updateHero(release, result) {
    const os = state.platform.os;
    const button = $('hero-download');
    const label = $('hero-download-label');
    const meta = $('hero-download-meta');
    const alt = $('hero-alt');
    const choice = PLATFORMS[os] ? pickRecommended(result.files, os) : null;
    alt.replaceChildren();
    alt.hidden = true;
    if (choice) {
      const platform = platformMeta(os);
      button.href = choice.url;
      button.setAttribute('download', choice.name);
      label.textContent = `下载 ${platform.name} 版`;
      meta.textContent = [release.version, archName(platform, choice.arch), formatOf(choice.name), formatBytes(choice.size)].join(' · ');
      const others = archGroups(result.files, os).filter((g) => g.arch !== choice.arch).map((g) => g.files[0]);
      alt.append(others.length ? '其它架构：' : '');
      for (const file of others) {
        alt.append(h('a', { href: file.url, download: file.name }, `${archName(platform, file.arch)} ${formatOf(file.name)}`));
      }
      alt.append(h('a', { href: '#latest' }, '全部平台与格式'));
      alt.hidden = false;
    } else {
      button.href = '#latest';
      button.removeAttribute('download');
      label.textContent = '选择平台下载';
      meta.textContent = os === 'mobile'
        ? '请在电脑上下载 ACECode'
        : `${release.version} · ${uniquePlatforms(result.files).map((id) => platformMeta(id).name).join(' / ')}`;
    }
    const note = $('hero-note');
    note.replaceChildren(`最新正式版 ${release.version} · ${formatDate(release.date)} 发布 · 版本信息读取自 aceupdate.json`);
    if (state.latestPreview) {
      note.append(' · ', h('a', { href: '#preview' }, `预览版 ${state.latestPreview.version}`));
    }
  }

  function updateVerify(release, result) {
    const commands = {
      windows: (file) => (file.sha256
        ? [`(Get-FileHash .\\${file.name} -Algorithm SHA256).Hash -eq '${file.sha256}'`, '输出 True 即校验通过；输出 False 说明文件不完整或被改动，请重新下载。']
        : [`Get-FileHash .\\${file.name} -Algorithm SHA256`, '把输出的哈希值与本页列出的 SHA-256 比对（不区分大小写）。']),
      macos: (file) => (file.sha256
        ? [`echo "${file.sha256}  ${file.name}" | shasum -a 256 -c`, `输出 ${file.name}: OK 即校验通过。`]
        : [`shasum -a 256 ${file.name}`, '把输出的哈希值与本页列出的 SHA-256 比对。']),
      linux: (file) => (file.sha256
        ? [`echo "${file.sha256}  ${file.name}" | sha256sum -c`, `输出 ${file.name}: OK 即校验通过。`]
        : [`sha256sum ${file.name}`, '把输出的哈希值与本页列出的 SHA-256 比对。']),
    };
    for (const os of Object.keys(commands)) {
      const card = doc.querySelector(`.code-card[data-platform="${os}"]`);
      if (card) card.classList.toggle('is-match', state.platform.os === os);
      const file = pickRecommended(result.files, os);
      if (!file) continue;
      const [command, note] = commands[os](file);
      $(`verify-${os}`).textContent = command;
      $(`verify-${os}-note`).textContent = note;
    }
    const foot = $('verify-foot');
    if (result.sums) {
      foot.replaceChildren(`${release.version} 的完整校验清单：`,
        h('a', { href: result.sums.url, download: result.sums.name }, result.sums.name),
        '。其它版本的校验值在历史版本中展开查看。');
    }
  }

  async function renderPreview(release) {
    $('preview').hidden = false;
    $('preview-title').textContent = `ACECode ${release.version}`;
    const relative = formatRelative(release.date);
    $('preview-meta').textContent = `发布于 ${formatDateTime(release.date)}${relative ? ` · ${relative}` : ''} · 预览版用于提前体验新功能，可能不如正式版稳定。`;
    const downloads = h('aside', { class: 'stage-side', 'aria-label': '预览版下载' },
      h('p', { class: 'kicker' }, 'Downloads · 下载'),
      h('p', { class: 'inline-loading' }, pixelLoader(), '正在查找安装包…'));
    $('preview-body').replaceChildren(h('div', { class: 'stage' },
      h('div', { class: 'stage-main' },
        h('p', { class: 'kicker' }, "What's new · 更新内容"),
        renderNotes(release.notes)),
      downloads));
    const result = await resolveRelease(release);
    const list = h('div', { class: 'compact-downloads' });
    for (const id of uniquePlatforms(result.files)) {
      for (const group of archGroups(result.files, id)) {
        list.append(renderArchBlock(platformMeta(id), group, { emphasize: false, recommended: false, withPlatform: true }));
      }
    }
    downloads.replaceChildren(
      h('p', { class: 'kicker' }, 'Downloads · 下载'),
      result.files.length ? list : h('p', { class: 'notes-empty' }, '没有找到这个版本的下载文件。'));
  }

  // ---------- 渲染:历史版本 ----------

  function rowId(version) {
    return `v${version}`;
  }

  function matchesQuery(release) {
    const tokens = state.query.toLowerCase().split(/\s+/).filter(Boolean);
    return tokens.every((token) => release.searchText.includes(token));
  }

  function filteredReleases() {
    return state.releases.filter((release) =>
      (state.channel === 'all' || !release.prerelease) && matchesQuery(release));
  }

  function platformChips(files) {
    return h('span', { class: 'row-platforms' },
      uniquePlatforms(files).map((id) => h('span', { class: 'chip', title: platformMeta(id).name }, platformMeta(id).badge)));
  }

  function renderFileTable(files) {
    if (!files.length) return h('p', { class: 'notes-empty' }, '没有找到这个版本的下载文件。');
    return h('table', { class: 'file-table' },
      h('thead', null, h('tr', null,
        h('th', { scope: 'col' }, '文件'),
        h('th', { scope: 'col' }, '类型'),
        h('th', { scope: 'col', class: 'col-size' }, '大小'),
        h('th', { scope: 'col' }, 'SHA-256'))),
      h('tbody', null, files.map((file) => h('tr', null,
        h('td', null, h('a', { class: 'file-link', href: file.url, download: file.name }, file.name)),
        h('td', { class: 'file-kind' }, describeFile(file)),
        h('td', { class: 'col-size' }, formatBytes(file.size)),
        h('td', null, file.sha256
          ? h('span', { class: 'hash-line' },
            h('code', { class: 'hash-short', title: file.sha256 }, shortHash(file.sha256)),
            copyButton(file.sha256, '已复制 SHA-256', '复制', `复制 ${file.name} 的 SHA-256`))
          : h('span', { class: 'hash-label' }, '未提供'))))));
  }

  function fillReleaseDetail(release, body, row) {
    const kicker = () => h('p', { class: 'kicker' }, 'Downloads · 下载文件');
    const filesBox = h('div', { class: 'detail-files' },
      kicker(),
      h('p', { class: 'inline-loading' }, pixelLoader(), '正在查找安装包…'));
    body.replaceChildren(
      h('div', { class: 'detail-notes' }, h('p', { class: 'kicker' }, "What's new · 更新内容"), renderNotes(release.notes)),
      filesBox);
    resolveRelease(release).then((result) => {
      const permalink = `${location.href.split('#')[0]}#${rowId(release.version)}`;
      filesBox.replaceChildren(
        kicker(),
        renderFileTable(result.files),
        h('p', { class: 'detail-foot' },
          result.sums ? h('a', { href: result.sums.url, download: result.sums.name }, result.sums.name) : null,
          copyButton(permalink, '已复制版本链接', '复制本版本链接')));
      // 探测到清单之外的平台(例如只有 tar.gz 的 Linux)时,同步刷新摘要里的平台标记。
      for (const old of row.querySelectorAll('summary .row-platforms')) old.replaceWith(platformChips(result.files));
    });
  }

  function renderReleaseRow(release) {
    const row = h('details', { class: 'release-row', id: rowId(release.version) });
    const tags = [];
    if (release === state.latestStable) tags.push(h('span', { class: 'tag tag-stable' }, '最新'));
    if (release.prerelease) tags.push(h('span', { class: 'tag tag-pre' }, '预览'));
    const cached = state.resolved.get(release.version);
    const summary = h('summary', null,
      h('span', { class: 'row-version' }, release.version),
      h('span', { class: 'row-tags' }, tags),
      h('span', { class: 'row-excerpt' }, release.notes.items[0] || ''),
      platformChips(release.packages),
      h('span', { class: 'row-date' }, formatDate(release.date)),
      h('span', { class: 'row-toggle', 'aria-hidden': 'true' }),
      h('span', { class: 'row-meta-mobile' }, formatDate(release.date), platformChips(release.packages)));
    const body = h('div', { class: 'release-detail' });
    row.append(summary, body);
    if (cached) {
      cached.then((result) => {
        for (const old of row.querySelectorAll('summary .row-platforms')) old.replaceWith(platformChips(result.files));
      });
    }

    let filled = false;
    let restoring = state.open.has(release.version);
    row.addEventListener('toggle', () => {
      if (row.open) {
        state.open.add(release.version);
        if (!filled) {
          filled = true;
          fillReleaseDetail(release, body, row);
        }
        if (!restoring && location.hash !== `#${row.id}`) window.history.replaceState(null, '', `#${row.id}`);
      } else {
        state.open.delete(release.version);
      }
      restoring = false;
    });
    if (restoring) {
      // 重新渲染列表时保持已展开的版本;不依赖 toggle 事件,直接填充内容。
      row.open = true;
      filled = true;
      fillReleaseDetail(release, body, row);
    }
    return row;
  }

  function renderHistory() {
    const list = filteredReleases();
    const shown = list.slice(0, state.limit);
    const counts = new Map();
    for (const release of list) counts.set(release.line, (counts.get(release.line) || 0) + 1);

    const fragment = doc.createDocumentFragment();
    let currentLine = null;
    for (const release of shown) {
      if (release.line !== currentLine) {
        currentLine = release.line;
        fragment.append(h('h3', { class: 'history-group' },
          `${release.line}.x`,
          h('small', null, `${counts.get(release.line)} 个版本`)));
      }
      fragment.append(renderReleaseRow(release));
    }
    if (!list.length) {
      fragment.append(h('div', { class: 'history-empty' },
        state.query ? `没有找到与「${state.query}」匹配的版本。` : '没有可显示的版本。',
        state.query ? h('button', { type: 'button', class: 'mini-button', 'data-action': 'clear-search' }, '清除搜索') : null));
    }
    $('history-list').replaceChildren(fragment);

    const more = $('history-more');
    const remaining = list.length - shown.length;
    more.hidden = remaining <= 0;
    more.textContent = `显示更多（还有 ${remaining} 个版本）`;
  }

  function setChannel(channel, rerender) {
    state.channel = channel;
    for (const button of doc.querySelectorAll('[data-channel]')) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-channel') === channel));
    }
    state.limit = PAGE_SIZE;
    if (rerender !== false) renderHistory();
  }

  function openFromHash() {
    let target = '';
    try {
      target = decodeURIComponent(location.hash.slice(1));
    } catch (_) {
      return;
    }
    const release = state.releases.find((item) => rowId(item.version) === target);
    if (!release) return;
    if (release.prerelease && state.channel !== 'all') setChannel('all', false);
    if (state.query && !matchesQuery(release)) {
      state.query = '';
      $('history-search').value = '';
    }
    const index = filteredReleases().indexOf(release);
    if (index >= state.limit) state.limit = Math.ceil((index + 1) / PAGE_SIZE) * PAGE_SIZE;
    state.open.add(release.version);
    renderHistory();
    const row = $(rowId(release.version));
    if (row) requestAnimationFrame(() => row.scrollIntoView({ block: 'start' }));
  }

  // ---------- 交互 ----------

  let toastTimer = 0;
  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 1800);
  }

  // 纯 HTTP 页面不是安全上下文,navigator.clipboard 不可用,回退到 execCommand。
  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (_) {
        // 继续走回退方案。
      }
    }
    const active = doc.activeElement;
    const area = h('textarea', { class: 'clipboard-proxy', readonly: true, 'aria-hidden': 'true', tabindex: '-1' });
    area.value = text;
    doc.body.append(area);
    area.select();
    area.setSelectionRange(0, text.length);
    let ok = false;
    try {
      ok = doc.execCommand('copy');
    } catch (_) {
      ok = false;
    }
    area.remove();
    if (active && typeof active.focus === 'function') active.focus({ preventScroll: true });
    return ok;
  }

  function bindEvents() {
    doc.addEventListener('click', async (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      const copyEl = target.closest('[data-copy], [data-copy-target]');
      if (copyEl) {
        event.preventDefault();
        const source = copyEl.getAttribute('data-copy-target');
        const text = source ? ($(source) || {}).textContent || '' : copyEl.getAttribute('data-copy') || '';
        const ok = await copyText(text);
        showToast(ok ? copyEl.getAttribute('data-copy-label') || '已复制' : '复制失败，请手动选择文本复制');
        return;
      }

      const channelEl = target.closest('[data-channel]');
      if (channelEl) {
        setChannel(channelEl.getAttribute('data-channel'));
        return;
      }

      const actionEl = target.closest('[data-action]');
      if (!actionEl) return;
      const action = actionEl.getAttribute('data-action');
      if (action === 'retry') {
        init();
      } else if (action === 'clear-search') {
        state.query = '';
        $('history-search').value = '';
        state.limit = PAGE_SIZE;
        renderHistory();
        $('history-search').focus();
      }
    });

    let searchTimer = 0;
    $('history-search').addEventListener('input', (event) => {
      clearTimeout(searchTimer);
      const value = event.target.value.trim();
      searchTimer = setTimeout(() => {
        state.query = value;
        state.limit = PAGE_SIZE;
        renderHistory();
      }, 150);
    });

    $('history-more').addEventListener('click', () => {
      state.limit += PAGE_SIZE;
      renderHistory();
    });

    doc.addEventListener('keydown', (event) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      const active = doc.activeElement;
      if (active && (active.isContentEditable || /^(input|textarea|select)$/i.test(active.tagName))) return;
      const tools = $('history-tools');
      if (tools.hidden) return;
      event.preventDefault();
      $('history-search').focus();
    });

    window.addEventListener('hashchange', openFromHash);
  }

  // ---------- 启动 ----------

  function renderError(error) {
    $('latest-body').replaceChildren(h('div', { class: 'notice', role: 'alert' },
      h('h3', null, '读取版本清单失败'),
      h('p', null, (error && error.userMessage) || '发生了未知错误。'),
      h('p', null, '清单地址：', h('a', { href: MANIFEST_URL.href }, MANIFEST_URL.href)),
      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'button button-primary', 'data-action': 'retry' }, '重试'),
        h('a', { class: 'button', href: RELEASES_URL, target: '_blank', rel: 'noopener noreferrer' }, '前往 GitHub Releases'))));
    $('hero-download').href = '#latest';
    $('hero-download').removeAttribute('download');
    $('hero-download-label').textContent = '无法读取版本清单';
    $('hero-download-meta').textContent = '查看下方的错误信息';
    $('hero-note').textContent = '版本信息读取自 aceupdate.json。';
    $('history-tools').hidden = true;
    $('history-more').hidden = true;
    $('history-list').replaceChildren(h('p', { class: 'history-empty' }, '版本清单读取成功后会在这里列出全部历史版本。'));
  }

  function renderLoading() {
    $('latest-body').replaceChildren(h('div', { class: 'loading-block' }, pixelLoader(), h('span', null, '正在读取 aceupdate.json…')));
    $('hero-download-meta').textContent = '正在读取版本清单…';
  }

  let initRun = 0;
  async function init() {
    const run = ++initRun;
    renderLoading();
    let data;
    try {
      [data] = await Promise.all([loadManifest(), refinePlatform()]);
    } catch (error) {
      if (run === initRun) renderError(error);
      return;
    }
    if (run !== initRun) return;

    const seen = new Set();
    const releases = data.releases
      .map(normalizeRelease)
      .filter((release) => release && !seen.has(release.version) && seen.add(release.version))
      .sort((a, b) => compareVersions(b.parsed, a.parsed) ||
        ((b.date ? b.date.getTime() : 0) - (a.date ? a.date.getTime() : 0)));
    if (!releases.length) {
      renderError(userError('清单里没有可识别的版本号。'));
      return;
    }

    state.releases = releases;
    state.latestStable = releases.find((release) => !release.prerelease) || releases[0];
    const newestPreview = releases.find((release) => release.prerelease);
    state.latestPreview = newestPreview && compareVersions(newestPreview.parsed, state.latestStable.parsed) > 0
      ? newestPreview
      : null;
    doc.title = `下载 ACECode ${state.latestStable.version}`;

    $('count-stable').textContent = String(releases.filter((release) => !release.prerelease).length);
    $('count-all').textContent = String(releases.length);
    $('history-tools').hidden = false;
    renderHistory();

    await renderLatest();
    if (state.latestPreview) renderPreview(state.latestPreview);
    else $('preview').hidden = true;
    openFromHash();
  }

  bindEvents();
  init();
})();
