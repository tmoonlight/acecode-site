import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { browserLanguage } from '../public/acemodel/assets/browser-language.js';
import { applyHomeLanguage, homeCopy } from '../public/acemodel/assets/home-i18n.js';

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
