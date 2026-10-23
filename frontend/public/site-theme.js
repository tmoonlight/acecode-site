/* Shared by static pages and React. Classic script runs before first paint. */
(function (win) {
  'use strict';
  if (win.ACETheme) return;
  var KEY = 'acecode.site.theme.v1';
  var COOKIE = 'ace_site_theme';
  var root = win.document.documentElement;
  var media = win.matchMedia('(prefers-color-scheme: dark)');
  var listeners = new Set();
  var transient = null;
  function valid(value) { return ['light', 'dark', 'system'].includes(value); }
  function stored(key) {
    try { return win.localStorage.getItem(key); } catch (_) { return null; }
  }
  function preference() {
    if (transient) return transient;
    try {
      var cookie = win.document.cookie.split(';').map(function (item) { return item.trim(); })
        .find(function (item) { return item.startsWith(COOKIE + '='); });
      var value = cookie && cookie.slice(COOKIE.length + 1);
      if (valid(value)) return value;
    } catch (_) {}
    var local = stored(KEY);
    return valid(local) ? local : null;
  }
  var mode, theme;
  function apply(next) {
    var resolved = next === 'system' ? (media.matches ? 'dark' : 'light') : next;
    var changed = next !== mode || resolved !== theme;
    mode = next;
    theme = resolved;
    root.classList.toggle('dark', theme === 'dark');
    root.dataset.theme = theme;
    if (changed) listeners.forEach(function (listener) { listener(); });
  }
  function set(next) {
    if (!valid(next)) return false;
    transient = null;
    try { win.localStorage.setItem(KEY, next); } catch (_) {}
    try {
      var shared = /(^|\.)acecode\.cc$/.test(win.location.hostname) ? '; Domain=acecode.cc' : '';
      var secure = win.location.protocol === 'https:' ? '; Secure' : '';
      win.document.cookie = COOKIE + '=' + next + '; Path=/; Max-Age=31536000; SameSite=Lax' + shared + secure;
    } catch (_) {}
    if (preference() !== next) transient = next;
    apply(next);
    return true;
  }
  function refresh() { apply(preference() || 'system'); }
  function subscribe(listener) { listeners.add(listener); return function () { listeners.delete(listener); }; }
  function link(href, base) {
    var chosen = preference();
    if (!chosen) return href;
    var url, current;
    try { url = new URL(href, base); current = new URL(base); } catch (_) { return href; }
    if (!['https:', 'http:'].includes(url.protocol) || url.origin === current.origin ||
        !['acecode.cc', 'customers.acecode.cc', 'acecodedownload.b-cdn.net'].includes(url.hostname) ||
        !/^\/(?:$|acemodel(?:\/|$)|download(?:\/|$)|help(?:\/|$)|acecode(?:\/|$)|key-usage\/(?:pricing|guide)(?:\/|$)|customerv2(?:\/|$)|customer(?:\/|$))/.test(url.pathname) ||
        /\.[^/]+$/.test(url.pathname) && !/\.html$/.test(url.pathname)) return href;
    url.searchParams.set('theme', chosen);
    return url.href;
  }
  // Incoming navigation overrides a stale origin cache; remove only our parameter.
  var incoming;
  try {
    var url = new URL(win.location.href);
    incoming = url.searchParams.get('theme');
    if (valid(incoming)) {
      set(incoming);
      url.searchParams.delete('theme');
      win.history.replaceState(win.history.state, '', url.href);
    }
  } catch (_) {}
  if (!valid(incoming) && !preference()) {
    var legacy = stored('theme') || stored('acecode-help-theme');
    if (valid(legacy)) set(legacy);
  }
  refresh();
  win.ACETheme = {getMode: function () { return mode; }, get: function () { return theme; },
    set: set, refresh: refresh, subscribe: subscribe, link: link,
    toggle: function () { set(theme === 'dark' ? 'light' : 'dark'); }};
  ['pageshow', 'focus'].forEach(function (name) { win.addEventListener(name, refresh); });
  win.document.addEventListener('visibilitychange', function () { if (!win.document.hidden) refresh(); });
  win.addEventListener('storage', function (event) { if (!event.key || event.key === KEY) refresh(); });
  if (media.addEventListener) media.addEventListener('change', refresh);
  else media.addListener(refresh);
  // Parent-domain cookies synchronize subdomains. Cookie Store events also update
  // an already-visible customer tab; focus/pageshow cover browsers without it.
  if (win.cookieStore) win.cookieStore.addEventListener('change', function (event) {
    if (event.changed.concat(event.deleted).some(function (cookie) { return cookie.name === COOKIE; })) refresh();
  });
  function decorate(container) {
    var links = container.matches && container.matches('a[href]') ? [container] : container.querySelectorAll('a[href]');
    links.forEach(function (anchor) {
      var href = anchor.getAttribute('href');
      var next = link(href, win.location.href);
      if (next !== href) anchor.setAttribute('href', next);
    });
  }
  function start() {
    decorate(win.document);
    subscribe(function () { decorate(win.document); });
    new win.MutationObserver(function (records) {
      records.forEach(function (record) { record.addedNodes.forEach(function (node) { if (node.nodeType === 1) decorate(node); }); });
    }).observe(win.document.body, {childList: true, subtree: true});
    ['click', 'auxclick'].forEach(function (name) {
      win.document.addEventListener(name, function (event) {
        var anchor = event.target.closest && event.target.closest('a[href]');
        if (anchor) decorate(anchor);
      }, true);
    });
  }
  if (win.document.readyState === 'loading') win.document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
}(window));
