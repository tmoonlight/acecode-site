'use strict';
(() => {
  const opener = document.getElementById('promo-open');
  const dialog = document.getElementById('promo-player');
  const video = document.getElementById('promo-video');
  const error = document.getElementById('promo-error');
  const errorMessage = document.getElementById('promo-error-message');
  if (!opener || !dialog || !video || typeof dialog.showModal !== 'function') return;
  let generation = 0;
  function showError(message) {
    if (!dialog.open) return;
    errorMessage.textContent = message;
    error.hidden = false;
  }
  function play() {
    const current = ++generation;
    error.hidden = true;
    video.src = opener.href;
    const started = video.play();
    if (started) started.catch(failure => {
      if (current !== generation || failure.name === 'AbortError') return;
      showError(failure.name === 'NotAllowedError' ? '请点击播放器中的播放按钮。' : '视频暂时无法播放。');
    });
  }
  opener.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (dialog.open) return;
    dialog.showModal();
    document.documentElement.classList.add('is-video-open');
    play();
  });
  document.getElementById('promo-close').addEventListener('click', () => dialog.close());
  document.getElementById('promo-retry').addEventListener('click', play);
  video.addEventListener('error', () => showError('视频暂时无法播放。'));
  dialog.addEventListener('close', () => {
    generation++;
    video.pause();
    video.removeAttribute('src');
    video.load();
    error.hidden = true;
    document.documentElement.classList.remove('is-video-open');
    opener.focus({ preventScroll: true });
  });
})();
