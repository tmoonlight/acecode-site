'use strict';
(() => {
  const video = document.getElementById('promo-video');
  const sound = document.getElementById('promo-sound');
  const error = document.getElementById('promo-error');
  const message = document.getElementById('promo-error-message');
  if (!video || !sound) return;

  function syncSound() {
    const audible = !video.muted && video.volume > 0;
    const label = audible ? '关闭声音' : '打开声音';
    sound.setAttribute('aria-label', label);
    sound.setAttribute('aria-pressed', String(audible));
    sound.title = label;
    sound.querySelector('[data-sound="off"]').toggleAttribute('hidden', audible);
    sound.querySelector('[data-sound="on"]').toggleAttribute('hidden', !audible);
  }

  function showError(text) {
    message.textContent = text;
    error.hidden = false;
  }

  function play() {
    error.hidden = true;
    const started = video.play();
    if (started) started.catch(failure => {
      if (failure.name === 'AbortError') return;
      showError(failure.name === 'NotAllowedError'
        ? '点击视频中的播放按钮即可播放。' : '视频暂时无法播放，请重试。');
    });
  }

  // Each visit starts muted. The user's click is the only way we enable sound.
  video.defaultMuted = true;
  video.muted = true;
  sound.addEventListener('click', () => {
    const audible = !video.muted && video.volume > 0;
    video.muted = audible;
    if (!audible && video.volume === 0) video.volume = 1;
    syncSound();
  });
  video.addEventListener('volumechange', syncSound);
  video.addEventListener('playing', () => { error.hidden = true; });
  video.addEventListener('error', () => showError('视频暂时无法播放。'));
  document.getElementById('promo-retry').addEventListener('click', () => {
    if (video.error) video.load();
    play();
  });
  syncSound();
  play();
})();
