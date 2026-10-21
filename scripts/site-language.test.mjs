import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import {createLanguageStore, LANGUAGE_KEY, languageLink} from '../public/acemodel/assets/site-language.js';
import {interfaceCopy} from '../public/acemodel/assets/interface-copy.js';
import {translateInterface} from '../public/acemodel/assets/interface-i18n.js';
import {documentLanguage} from '../public/acemodel/assets/browser-language.js';

const ts = createRequire(new URL('../frontend/package.json', import.meta.url))('typescript');
function environment(url = 'https://acecode.cc/acemodel/', languages = ['zh-CN']) {
  const win = new EventTarget(), items = new Map();
  Object.assign(win, {
    navigator: {languages}, location: new URL(url),
    document: {cookie: '', documentElement: {lang: ''}},
    localStorage: {getItem: key => items.get(key) || null, setItem: (key, value) => items.set(key, value)},
    history: {state: {page: 1}, replaceState(state, title, href) { win.location = new URL(href); assert.deepEqual(state, {page: 1}); }},
  });
  return win;
}

test('manual choice persists across pages; browser changes only affect an automatic preference', () => {
  const win = environment();
  win.localStorage.setItem('lang', 'en'); // Unrelated legacy cache is not a manual site preference.
  const store = createLanguageStore(win), changes = [];
  store.subscribe(value => changes.push(value));
  assert.equal(store.get(), 'zh');
  win.navigator.languages = ['en'];
  win.dispatchEvent(new Event('languagechange'));
  assert.equal(store.get(), 'en');
  store.set('zh-TW');
  assert.match(win.document.cookie, /Domain=acecode.cc/);
  assert.match(win.document.cookie, /Secure/);
  assert.equal(win.localStorage.getItem(LANGUAGE_KEY), 'zh-TW');
  win.navigator.languages = ['zh-CN'];
  win.dispatchEvent(new Event('languagechange'));
  assert.equal(store.get(), 'zh-TW');
  assert.deepEqual(changes, ['en', 'zh-TW']);
  assert.equal(createLanguageStore(win).get(), 'zh-TW');
  assert.equal(store.set('fr'), false);
});

test('a language carried across domains is consumed without dropping other query parameters or the anchor', () => {
  const win = environment('https://customers.acecode.cc/customerv2/wallet?plan=trial&lang=en#orders');
  const store = createLanguageStore(win);
  assert.equal(store.get(), 'en');
  assert.equal(win.location.href, 'https://customers.acecode.cc/customerv2/wallet?plan=trial#orders');
  store.set('zh');
  win.dispatchEvent(new Event('pageshow'));
  assert.equal(store.get(), 'zh', 'The incoming URL must not pin an old language');
});

test('shared cookie and storage events synchronize open pages', () => {
  const win = environment();
  win.localStorage.setItem(LANGUAGE_KEY, 'en');
  win.document.cookie = 'ace_site_language=zh-TW';
  const store = createLanguageStore(win);
  assert.equal(store.get(), 'zh-TW', 'Parent-domain cookie wins over a stale per-origin cache');
  win.document.cookie = 'ace_site_language=en';
  win.dispatchEvent(new Event('focus'));
  assert.equal(store.get(), 'en');
  win.document.cookie = '';
  win.localStorage.setItem(LANGUAGE_KEY, 'zh');
  win.dispatchEvent(Object.assign(new Event('storage'), {key: LANGUAGE_KEY}));
  assert.equal(store.get(), 'zh');
});

test('storage restrictions do not break the active page language', () => {
  const win = environment();
  Object.defineProperty(win.document, 'cookie', {get: () => '', set: () => { throw new Error('Blocked'); }});
  Object.defineProperty(win, 'localStorage', {get: () => { throw new Error('Blocked'); }});
  const store = createLanguageStore(win);
  store.set('en');
  win.dispatchEvent(new Event('focus'));
  assert.equal(store.get(), 'en');
  assert.equal(win.document.documentElement.lang, 'en');
});

test('only public HTML links carry language; downloads, API calls and external destinations stay intact', () => {
  const base = 'https://acecodedownload.b-cdn.net/acemodel/';
  assert.equal(languageLink('https://customers.acecode.cc/customerv2/wallet?plan=trial#orders', base, 'en'),
    'https://customers.acecode.cc/customerv2/wallet?plan=trial&lang=en#orders');
  assert.equal(languageLink('https://acecode.cc/help/index.html', base, 'zh-TW'), 'https://acecode.cc/help/index.html?lang=zh-TW');
  for (const href of ['https://acecode.cc/aceapi/v1', 'https://acecode.cc/api/customer/me',
    'https://acecodedownload.b-cdn.net/v1.0.13/file.zip', 'https://github.com/tmoonlight/acecode',
    'https://acecode.cc/download/assets/media/promo.mp4', '#main', '../download/']) {
    assert.equal(languageLink(href, base, 'en'), href);
  }
});

test('React and the shared preference remain synchronized in both directions', () => {
  const win = environment();
  const store = createLanguageStore(win);
  let changed;
  const i18n = {language: '', resolvedLanguage: '', use() { return this; },
    init(options) { this.language = this.resolvedLanguage = options.lng; },
    on(event, callback) { changed = callback; },
    changeLanguage(value) { this.language = this.resolvedLanguage = value; changed(value); return Promise.resolve(); }};
  const source = readFileSync(new URL('../frontend/src/i18n.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true}}).outputText;
  vm.runInNewContext(compiled, {document: win.document, exports: {}, require(name) {
    if (name === 'i18next') return i18n;
    if (name === 'react-i18next') return {initReactI18next: {}};
    if (name.endsWith('site-language.js')) return {getSiteLanguage: store.get, setSiteLanguage: store.set, subscribeSiteLanguage: store.subscribe};
    if (name.endsWith('browser-language.js')) return {documentLanguage};
    if (name.endsWith('.json')) return {};
    throw new Error(name);
  }});
  store.set('en'); assert.equal(i18n.language, 'en');
  i18n.changeLanguage('zh-TW'); assert.equal(store.get(), 'zh-TW');
  assert.equal(win.document.documentElement.lang, 'zh-TW');
});

test('every legacy UI translation key has English and Traditional Chinese copy', () => {
  let count = 0;
  for (const path of ['download/assets/release.js', 'download/assets/promo.js', 'help/assets/docs.js', 'acecode/assets/docs.js']) {
    const source = ts.createSourceFile(path, readFileSync(new URL('../public/' + path, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isCallExpression(node) && node.expression.getText(source) === 't' && ts.isStringLiteral(node.arguments[0])) {
        const key = node.arguments[0].text;
        assert.ok(interfaceCopy[key]?.en, key);
        assert.ok(interfaceCopy[key]?.['zh-TW'], key);
        count++;
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.ok(count > 140);
  assert.equal(translateInterface('下载 {0}', ['ZIP'], 'en'), 'Download ZIP');
  assert.equal(translateInterface('历史版本', [], 'zh-TW'), '歷史版本');
  for (const directory of ['help', 'acecode']) for (const file of readdirSync(new URL('../public/' + directory, import.meta.url)).filter(name => name.endsWith('.html'))) {
    const html = readFileSync(new URL(`../public/${directory}/${file}`, import.meta.url), 'utf8');
    assert.match(html, /data-site-language/, file);
    assert.match(html, /type="module" src="assets\/docs.js\?v=/, file);
  }
});
