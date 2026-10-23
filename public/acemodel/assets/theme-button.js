import {getSiteLanguage, subscribeSiteLanguage} from './site-language.js';

const icons = {
  light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  dark: '<path d="M20.9 13a9 9 0 0 1-9.9-9.9A9 9 0 1 0 20.9 13Z"/>',
};
const labels = {zh: ['切换到深色模式', '切换到浅色模式'], 'zh-TW': ['切換到深色模式', '切換到淺色模式'], en: ['Switch to dark mode', 'Switch to light mode']};
for (const host of document.querySelectorAll('[data-site-theme], .theme-toggle')) {
  const button = host.matches('button') ? host : document.createElement('button');
  button.type = 'button';
  button.classList.add('site-theme-toggle');
  const sync = () => {
    const dark = window.ACETheme.get() === 'dark';
    const label = labels[getSiteLanguage()][dark ? 1 : 0];
    button.setAttribute('aria-label', label);
    button.title = label;
    button.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${icons[dark ? 'light' : 'dark']}</svg>`;
  };
  button.addEventListener('click', () => window.ACETheme.toggle());
  window.ACETheme.subscribe(sync);
  subscribeSiteLanguage(sync);
  sync();
  if (button !== host) host.replaceChildren(button);
}
