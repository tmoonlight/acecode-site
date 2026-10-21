import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import {downloadPlatform, latestDownload} from '../public/acemodel/assets/home-download.js';

const manifest = JSON.parse(readFileSync(new URL('../public/aceupdate.json', import.meta.url), 'utf8'));

test('homepage selects a complete package for the detected desktop platform', () => {
  const cases = [
    [{platform: 'Win32', userAgent: 'Windows NT 10.0; Win64; x64'}, {}, 'windows', 'x64', 'zip'],
    [{platform: 'Win32'}, {architecture: 'arm', bitness: '64'}, 'windows', 'arm64', 'zip'],
    [{platform: 'MacIntel'}, {architecture: 'x86', bitness: '64'}, 'macos', 'x64', 'pkg'],
    [{platform: 'MacIntel'}, {architecture: 'arm', bitness: '64'}, 'macos', 'arm64', 'pkg'],
    [{platform: 'Linux x86_64'}, {}, 'linux', 'x64', 'tar'],
    [{platform: 'Linux aarch64'}, {}, 'linux', 'arm64', 'tar'],
    [{platform: 'Linux armv7l'}, {}, 'linux', 'armv7', 'tar'],
  ];
  for (const [browser, hints, os, arch, kind] of cases) {
    const platform = downloadPlatform(browser, hints);
    assert.deepEqual(platform, {os, arch});
    const choice = latestDownload(manifest, platform);
    assert.equal(choice.version, manifest.latest);
    assert.equal(choice.file.platform, os);
    assert.equal(choice.file.arch, arch);
    assert.equal(choice.file.kind, kind);
    assert.ok(choice.file.url.startsWith(`https://acecodedownload.b-cdn.net/v${manifest.latest}/`));
    assert.ok(!choice.file.file.includes('-update'));
  }
});

test('mobile, missing architectures, prereleases and unsafe links keep the download-page fallback', () => {
  for (const browser of [
    {platform: 'Linux arm64', userAgent: 'Android'},
    {platform: 'MacIntel', maxTouchPoints: 5},
    {userAgent: 'iPhone'}, {userAgent: 'CrOS x86_64'}, {},
  ]) {
    assert.equal(downloadPlatform(browser), null);
    assert.equal(latestDownload(manifest, null).file, null);
  }
  assert.equal(latestDownload(manifest, {os: 'windows', arch: 'x86'}).file, null);
  const release = structuredClone(manifest.releases.find(r => r.version === manifest.latest));
  const future = {latest: '9.8.7', releases: [{...release, version: '9.8.7', tag: 'v9.8.7', packages: []}]};
  assert.equal(latestDownload(future, null).version, '9.8.7', 'Version follows the manifest, not a hard-coded release');
  assert.equal(latestDownload({...manifest, latest: '0.0.0'}, null), null);
  assert.equal(latestDownload({...manifest, releases: [{...release, prerelease: true}]}, null), null);
  for (const url of ['https://example.com/file.zip', 'javascript:alert(1)', 'https://acecodedownload.b-cdn.net/other/file.zip']) {
    const bad = {...release, packages: [{file: 'file.zip', platform: 'windows', arch: 'x64', kind: 'zip', url}]};
    assert.equal(latestDownload({...manifest, releases: [bad]}, {os: 'windows', arch: 'x64'}).file, null);
  }
});

function videoFixture(playFailure) {
  class Element extends EventTarget {
    attrs = {};
    hidden = false;
    textContent = '';
    setAttribute(key, value) { this.attrs[key] = value; }
    toggleAttribute(key, value) { if (value) this.attrs[key] = ''; else delete this.attrs[key]; }
  }
  const video = Object.assign(new Element(), {muted: false, volume: 1, plays: 0, loads: 0,
    play() { this.plays++; return playFailure ? Promise.reject(playFailure) : Promise.resolve(); },
    load() { this.loads++; },
  });
  const sound = new Element(), off = new Element(), on = new Element();
  sound.querySelector = selector => selector.includes('off') ? off : on;
  const nodes = {'promo-video': video, 'promo-sound': sound, 'promo-error': new Element(),
    'promo-error-message': new Element(), 'promo-retry': new Element()};
  const source = readFileSync(new URL('../public/download/assets/promo.js', import.meta.url), 'utf8');
  vm.runInNewContext(source, {document: {getElementById: id => nodes[id]}});
  return {video, sound, off, on, nodes};
}

test('inline video starts muted and the speaker stays in sync with native volume controls', () => {
  const {video, sound, off, on} = videoFixture();
  assert.equal(video.plays, 1);
  assert.equal(video.defaultMuted, true);
  assert.equal(video.muted, true);
  assert.equal(sound.attrs['aria-pressed'], 'false');
  assert.ok('hidden' in on.attrs);
  sound.dispatchEvent(new Event('click'));
  assert.equal(video.muted, false);
  assert.equal(sound.attrs['aria-pressed'], 'true');
  assert.ok('hidden' in off.attrs);
  assert.ok(!('hidden' in on.attrs));
  video.volume = 0;
  video.dispatchEvent(new Event('volumechange'));
  assert.equal(sound.attrs['aria-pressed'], 'false');
  sound.dispatchEvent(new Event('click'));
  assert.equal(video.volume, 1);
  assert.equal(video.muted, false);
  sound.dispatchEvent(new Event('click'));
  assert.equal(video.muted, true);
});

test('autoplay rejection exposes retry without opening a dialog or enabling sound', async () => {
  const {video, nodes} = videoFixture({name: 'NotAllowedError'});
  await Promise.resolve();
  assert.equal(nodes['promo-error'].hidden, false);
  assert.match(nodes['promo-error-message'].textContent, /播放按钮/);
  assert.equal(video.muted, true);
  video.error = {code: 2};
  nodes['promo-retry'].dispatchEvent(new Event('click'));
  assert.equal(video.loads, 1);
  assert.equal(video.plays, 2);
  await Promise.resolve();
  const html = readFileSync(new URL('../public/download/index.html', import.meta.url), 'utf8');
  assert.match(html, /<video[^>]+controls autoplay muted playsinline/);
  assert.doesNotMatch(html, /<dialog|id="promo-open"/);
});
