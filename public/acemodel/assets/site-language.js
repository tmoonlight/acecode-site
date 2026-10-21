import { browserLanguage, documentLanguage } from './browser-language.js';

export const LANGUAGE_KEY = 'acecode.site.language.v1';
export const LANGUAGE_COOKIE = 'ace_site_language';
export const languageOptions = [['zh', '简体中文'], ['zh-TW', '繁體中文'], ['en', 'English']];
export const isSiteLanguage = value => ['zh', 'zh-TW', 'en'].includes(value);

export function languageLink(href, base, language) {
  if (!isSiteLanguage(language)) return href;
  let url, current;
  try { url = new URL(href, base); current = new URL(base); } catch { return href; }
  if (!['https:', 'http:'].includes(url.protocol) || url.origin === current.origin ||
      !['acecode.cc', 'customers.acecode.cc', 'acecodedownload.b-cdn.net'].includes(url.hostname) ||
      !/^\/(?:$|acemodel(?:\/|$)|download(?:\/|$)|help(?:\/|$)|acecode(?:\/|$)|key-usage\/(?:pricing|guide)(?:\/|$)|customerv2(?:\/|$)|customer(?:\/|$))/.test(url.pathname) ||
      /\.[^/]+$/.test(url.pathname) && !/\.html$/.test(url.pathname)) return href;
  url.searchParams.set('lang', language);
  return url.href;
}

export function createLanguageStore(win) {
  const listeners = new Set();
  let memoryPreference = null;
  function preference() {
    try {
      const cookie = win.document.cookie.split(';').map(item => item.trim())
        .find(item => item.startsWith(LANGUAGE_COOKIE + '='))?.slice(LANGUAGE_COOKIE.length + 1);
      if (isSiteLanguage(cookie)) return cookie;
    } catch {}
    try {
      const value = win.localStorage.getItem(LANGUAGE_KEY);
      if (isSiteLanguage(value)) return value;
    } catch {}
    return memoryPreference;
  }
  const get = () => preference() || browserLanguage(win.navigator);
  let current = get();
  function refresh() {
    const next = get();
    win.document.documentElement.lang = documentLanguage(next);
    if (next === current) return;
    current = next;
    listeners.forEach(listener => listener(next));
  }
  function set(language) {
    if (!isSiteLanguage(language)) return false;
    memoryPreference = language;
    try { win.localStorage.setItem(LANGUAGE_KEY, language); } catch {}
    try {
      const shared = /(^|\.)acecode\.cc$/.test(win.location.hostname) ? '; Domain=acecode.cc' : '';
      const secure = win.location.protocol === 'https:' ? '; Secure' : '';
      win.document.cookie = `${LANGUAGE_COOKIE}=${language}; Path=/; Max-Age=31536000; SameSite=Lax${shared}${secure}`;
    } catch {}
    // Keep the active page usable even when the browser blocks persistent storage.
    win.document.documentElement.lang = documentLanguage(language);
    if (language !== current) {
      current = language;
      listeners.forEach(listener => listener(language));
    }
    return true;
  }
  try {
    const url = new URL(win.location.href);
    const incoming = url.searchParams.get('lang');
    if (isSiteLanguage(incoming)) {
      set(incoming);
      url.searchParams.delete('lang');
      win.history.replaceState(win.history.state, '', url.href);
    }
  } catch {}
  win.document.documentElement.lang = documentLanguage(current);
  for (const name of ['pageshow', 'focus', 'languagechange']) win.addEventListener(name, refresh);
  win.addEventListener('storage', event => { if (!event.key || event.key === LANGUAGE_KEY) refresh(); });
  return {get: () => current, preference, set, refresh,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; }};
}

const store = typeof window !== 'undefined' ? createLanguageStore(window) : null;
export const getSiteLanguage = () => store ? store.get() : 'zh';
export const setSiteLanguage = language => store?.set(language);
export const subscribeSiteLanguage = listener => store?.subscribe(listener) || (() => {});

if (store) {
  const decorate = root => {
    const links = root.matches?.('a[href]') ? [root] : root.querySelectorAll?.('a[href]') || [];
    for (const link of links) {
      const href = link.getAttribute('href');
      const next = languageLink(href, location.href, store.preference());
      if (next !== href) link.setAttribute('href', next);
    }
  };
  const start = () => {
    decorate(document);
    subscribeSiteLanguage(() => decorate(document));
    const observer = new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) decorate(node);
    });
    observer.observe(document.body, {childList: true, subtree: true});
    for (const name of ['click', 'auxclick']) document.addEventListener(name, event => {
      const link = event.target.closest?.('a[href]');
      if (link) decorate(link);
    }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
}
