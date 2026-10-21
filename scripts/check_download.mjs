import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script = fs.readFileSync(new URL('../public/download/assets/release.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
const context = vm.createContext({
  URL, Intl, setTimeout, clearTimeout,
  t: (source, values = []) => source.replace(/\{(\d+)\}/g, (_, i) => values[i]),
  getSiteLanguage: () => 'zh',
  localizeTree() {}, subscribeSiteLanguage() {},
  document: { documentElement: { dataset: {} } },
  location: { href: 'https://acecodedownload.b-cdn.net/download/' },
  navigator: { userAgent: 'Windows NT 10.0; Win64; x64', platform: 'Win32' },
});
const instrumented = script.replace('  bindEvents();\n  init();',
  '  globalThis.check = { normalizeRelease, archGroups, manifestFile, KINDS };');
assert.notEqual(instrumented, script, 'Download test hook must match startup');
vm.runInContext(instrumented, context);
const manifest = JSON.parse(fs.readFileSync(new URL('../public/aceupdate.json', import.meta.url), 'utf8'));
for (const raw of manifest.releases) {
  const release = context.check.normalizeRelease(raw);
  assert.equal(release.packages.length, raw.packages.length, raw.version);
  for (const asset of release.packages) {
    assert.ok(context.check.KINDS[asset.kind], `${raw.version}: ${asset.name}`);
    assert.match(asset.sha256, /^[0-9a-f]{64}$/);
    assert.ok(asset.url.includes('/' + raw.tag + '/'));
  }
  if (raw.sums) assert.equal(release.sums.url, raw.sums.url);
}
const latest = context.check.normalizeRelease(manifest.releases.find(r => r.version === manifest.latest));
assert.equal(context.check.archGroups(latest.packages, 'windows')[0].files[0].kind, 'zip');
assert.equal(context.check.archGroups(latest.packages, 'macos')[0].files[0].kind, 'pkg');
assert.equal(context.check.archGroups(latest.packages, 'linux')[0].files[0].kind, 'tar');
assert.equal(context.check.manifestFile({...manifest.releases[0].packages[0], url: 'https://example.com/private.zip'}), null);
assert.equal(context.check.normalizeRelease({...manifest.releases[0], prerelease: true}).prerelease, true);
console.log(JSON.stringify({releases: manifest.releases.length, packages: manifest.releases.reduce((n, r) => n + r.packages.length, 0), passed: true}));
