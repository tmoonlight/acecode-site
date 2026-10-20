import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import { browserLanguage } from '../public/acemodel/assets/browser-language.js';
import { applyHomeLanguage, homeCopy } from '../public/acemodel/assets/home-i18n.js';

const requireFrontend = createRequire(new URL('../frontend/package.json', import.meta.url));
const ts = requireFrontend('typescript');
const html = readFileSync(new URL('../public/acemodel/index.html', import.meta.url), 'utf8');

test('browser preference order, Chinese scripts/regions, and fallback', () => {
  const cases = [
    [{languages: ['zh-CN', 'en-US']}, 'zh'],
    [{languages: ['en-US', 'zh-CN']}, 'en'],
    [{languages: ['ja-JP', 'zh-CN', 'en']}, 'zh'],
    [{languages: ['fr-FR', 'en-GB', 'zh']}, 'en'],
    [{languages: ['zh-TW']}, 'zh-TW'],
    [{languages: ['zh-HK']}, 'zh-TW'],
    [{languages: ['zh-MO']}, 'zh-TW'],
    [{languages: ['zh-Hant-CN']}, 'zh-TW'],
    [{languages: ['zh-Hans-TW']}, 'zh'],
    [{languages: [' ZH_hant_HK ']}, 'zh-TW'],
    [{languages: [], language: 'zh-SG'}, 'zh'],
    [{language: 'en-GB'}, 'en'],
    [{language: 'de-DE'}, 'en'],
    [{}, 'zh'],
  ];
  for (const [browser, expected] of cases) {
    assert.equal(browserLanguage(browser), expected, JSON.stringify(browser));
  }
});

function documentFixture() {
  const nodes = [...html.matchAll(/<[a-z][a-z0-9]*\b([^>]*\bdata-i18n[^>]*)>/gi)].map(match => {
    const attrs = Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
    return {attrs, textContent: '', getAttribute: name => attrs[name], setAttribute: (name, value) => { attrs[name] = value; }};
  });
  return {
    nodes, title: '', documentElement: {lang: 'zh-CN'},
    querySelectorAll: selector => nodes.filter(node => selector.slice(1, -1) in node.attrs),
  };
}

test('homepage translates all content, metadata and accessible names without changing links', () => {
  for (const language of ['zh', 'zh-TW', 'en']) {
    const doc = documentFixture();
    const links = doc.nodes.map(node => node.attrs.href);
    applyHomeLanguage(doc, language);
    assert.equal(doc.documentElement.lang, language === 'zh' ? 'zh-CN' : language);
    assert.equal(doc.title, homeCopy[language].title);
    const used = new Set();
    for (const node of doc.nodes) {
      for (const [attribute, key] of Object.entries(node.attrs)) {
        if (!attribute.startsWith('data-i18n')) continue;
        used.add(key);
        assert.equal(typeof homeCopy[language][key], 'string', `${language}: ${key}`);
        assert.equal(attribute === 'data-i18n' ? node.textContent : node.attrs[attribute.slice(10)],
                     homeCopy[language][key], `${language}: ${attribute}/${key}`);
      }
    }
    assert.deepEqual([...used].sort(), Object.keys(homeCopy[language]).sort());
    assert.deepEqual(doc.nodes.map(node => node.attrs.href), links);
  }
  assert.match(html, /<span data-i18n="heroTitle">和你一起<\/span>/);
  assert.doesNotMatch(html, />Software that</);
  assert.match(html, /type="module" src="assets\/home-i18n.js/);
});

test('public app ignores stale storage and follows languagechange', () => {
  const source = readFileSync(new URL('../frontend/src/i18n.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true},
  }).outputText;
  for (const language of ['zh-CN', 'zh-TW', 'en-US']) {
    const browser = {languages: [language], language};
    const target = new EventTarget();
    const doc = {documentElement: {lang: ''}};
    let changed;
    const i18n = {
      language: '', resolvedLanguage: '',
      use() { return this; },
      init(options) { this.language = this.resolvedLanguage = options.lng; },
      on(event, callback) { if (event === 'languageChanged') changed = callback; },
      changeLanguage(value) { this.language = this.resolvedLanguage = value; changed(value); return Promise.resolve(); },
    };
    const sandbox = {
      exports: {}, navigator: browser, window: target, document: doc,
      require(name) {
        if (name === 'i18next') return i18n;
        if (name === 'react-i18next') return {initReactI18next: {}};
        if (name.endsWith('browser-language.js')) return {
          browserLanguage, documentLanguage: value => value === 'zh' ? 'zh-CN' : value,
        };
        if (name.endsWith('.json')) return {};
        throw new Error(`Unexpected import: ${name}`);
      },
    };
    Object.defineProperty(sandbox, 'localStorage', {get() { throw new Error('Browser language must not depend on storage'); }});
    vm.runInNewContext(compiled, sandbox);
    assert.equal(i18n.language, browserLanguage(browser));
    assert.equal(doc.documentElement.lang, language === 'en-US' ? 'en' : language);
    browser.languages = ['zh-HK', 'en-US'];
    target.dispatchEvent(new Event('languagechange'));
    assert.equal(i18n.language, 'zh-TW');
    assert.equal(doc.documentElement.lang, 'zh-TW');
  }
});
