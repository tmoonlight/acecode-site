import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/acemodel/assets/site-theme.js', import.meta.url), 'utf8');
const key = 'acecode.site.theme.v1';
function environment({url = 'https://acecode.cc/acemodel/', dark = false, saved = {}, cookie = ''} = {}) {
  const win = new EventTarget(), doc = new EventTarget(), media = new EventTarget();
  const values = new Map(Object.entries(saved)), classes = new Set();
  Object.assign(media, {matches: dark});
  Object.assign(doc, {cookie, readyState: 'loading', hidden: false,
    documentElement: {dataset: {}, classList: {toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); }}}});
  Object.assign(win, {document: doc, location: new URL(url), matchMedia: () => media,
    localStorage: {getItem: name => values.get(name) ?? null, setItem: (name, value) => values.set(name, value)},
    history: {state: {route: 1}, replaceState(state, title, href) { assert.deepEqual(state, {route: 1}); win.location = new URL(href); }},
  });
  const start = () => { vm.runInNewContext(source, {window: win, URL, Set}); return win.ACETheme; };
  return {win, media, classes, start};
}

test('automatic mode follows OS changes until an explicit selection; reset resumes OS tracking', () => {
  const {win, media, classes, start} = environment({dark: true});
  const theme = start();
  assert.equal(theme.getMode(), 'system');
  assert.equal(theme.get(), 'dark');
  assert.ok(classes.has('dark'));
  const updates = [];
  theme.subscribe(() => updates.push(theme.get()));
  media.matches = false; media.dispatchEvent(new Event('change'));
  assert.equal(theme.get(), 'light');
  theme.set('dark');
  media.dispatchEvent(new Event('change'));
  assert.equal(theme.get(), 'dark');
  theme.set('system');
  assert.equal(theme.get(), 'light');
  assert.equal(win.document.documentElement.dataset.theme, 'light');
  assert.deepEqual(updates, ['light', 'dark', 'light']);
  assert.equal(theme.set('invalid'), false);
});

test('legacy React and docs preferences migrate once; shared parent cookie wins over stale local values', () => {
  for (const legacy of ['theme', 'acecode-help-theme']) {
    const {win, start} = environment({saved: {[legacy]: 'dark'}});
    assert.equal(start().get(), 'dark');
    assert.equal(win.localStorage.getItem(key), 'dark');
    assert.match(win.document.cookie, /Domain=acecode.cc; Secure/);
  }
  const {start} = environment({saved: {[key]: 'light', theme: 'light'}, cookie: 'ace_site_theme=dark'});
  assert.equal(start().get(), 'dark');
});

test('cross-domain handoff preserves language, query, anchor and history; incoming choice does not pin subsequent toggles', () => {
  const {win, start} = environment({url: 'https://customers.acecode.cc/customerv2?theme=dark&lang=zh-TW&view=register#form'});
  const theme = start();
  assert.equal(theme.get(), 'dark');
  assert.equal(win.location.href, 'https://customers.acecode.cc/customerv2?lang=zh-TW&view=register#form');
  theme.toggle(); win.dispatchEvent(new Event('pageshow'));
  assert.equal(theme.get(), 'light');
});

test('open tabs and returning subdomains synchronize from storage/cookies', () => {
  const {win, start} = environment();
  const theme = start();
  win.localStorage.setItem(key, 'dark');
  win.dispatchEvent(Object.assign(new Event('storage'), {key}));
  assert.equal(theme.get(), 'dark');
  win.document.cookie = 'ace_site_theme=light';
  win.dispatchEvent(new Event('focus'));
  assert.equal(theme.get(), 'light');
  win.document.cookie = 'ace_site_theme=dark';
  win.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(theme.get(), 'dark');
});

test('blocked persistent storage still allows an active page to switch and retain its choice', () => {
  const {win, start} = environment();
  Object.defineProperty(win, 'localStorage', {get() { throw Error('blocked'); }});
  Object.defineProperty(win.document, 'cookie', {get() { return 'ace_site_theme=light'; }, set() { throw Error('blocked'); }});
  const theme = start(); theme.set('dark');
  win.dispatchEvent(new Event('focus'));
  assert.equal(theme.get(), 'dark');
});

test('only public cross-origin HTML navigation carries theme; API, media and download URLs stay untouched', () => {
  const base = 'https://acecodedownload.b-cdn.net/acemodel/';
  const {start} = environment({url: base});
  const theme = start(); theme.set('dark');
  assert.equal(theme.link('https://acecode.cc/help/index.html?lang=en#install', base), 'https://acecode.cc/help/index.html?lang=en&theme=dark#install');
  for (const href of ['https://acecode.cc/aceapi/v1', 'https://acecode.cc/api/customer/me',
    'https://acecode.cc/download/assets/media/promo.mp4', 'https://acecodedownload.b-cdn.net/v1.0.13/file.zip',
    'https://github.com/tmoonlight/acecode', '../download/', '#main']) assert.equal(theme.link(href, base), href);
});

test('every static surface initializes the shared theme and the React bundle ships the identical runtime', () => {
  assert.equal(readFileSync(new URL('../frontend/public/site-theme.js', import.meta.url), 'utf8'), source);
  for (const directory of ['acemodel', 'download', 'help', 'acecode']) {
    for (const file of readdirSync(new URL('../public/' + directory, import.meta.url)).filter(name => name.endsWith('.html'))) {
      const html = readFileSync(new URL(`../public/${directory}/${file}`, import.meta.url), 'utf8');
      assert.match(html, /<script src="[^"]*site-theme.js\?v=/, directory + '/' + file);
      // The canvas demo inherits appearance but has no website navigation.
      if (file !== 'agent-office.html') assert.match(html, /data-site-theme|theme-toggle/, file);
    }
  }
});
