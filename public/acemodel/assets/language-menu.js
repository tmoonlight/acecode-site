import {getSiteLanguage, setSiteLanguage, subscribeSiteLanguage, languageOptions} from './site-language.js';

// Segmented switch: short visible labels, full language names for assistive technology.
const SHORT_LABELS = {zh: '简', 'zh-TW': '繁', en: 'EN'};
const GROUP_LABELS = {zh: '语言', 'zh-TW': '語言', en: 'Language'};

for (const host of document.querySelectorAll('[data-site-language]')) {
  const group = document.createElement('div');
  group.className = 'site-language';
  group.setAttribute('role', 'group');
  const buttons = languageOptions.map(([value, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.language = value;
    button.title = label;
    button.setAttribute('aria-label', label);
    button.textContent = SHORT_LABELS[value] || value;
    button.addEventListener('click', () => setSiteLanguage(value));
    group.append(button);
    return button;
  });
  const sync = () => {
    const current = getSiteLanguage();
    group.setAttribute('aria-label', GROUP_LABELS[current] || GROUP_LABELS.zh);
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.language === current));
  };
  sync();
  subscribeSiteLanguage(sync);
  host.replaceChildren(group);
}
