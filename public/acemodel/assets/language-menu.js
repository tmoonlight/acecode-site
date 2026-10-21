import {getSiteLanguage, setSiteLanguage, subscribeSiteLanguage, languageOptions} from './site-language.js';

for (const host of document.querySelectorAll('[data-site-language]')) {
  const select = document.createElement('select');
  select.className = 'site-language';
  for (const [value, label] of languageOptions) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
  }
  const sync = () => {
    select.value = getSiteLanguage();
    select.setAttribute('aria-label', select.value === 'en' ? 'Language' : select.value === 'zh-TW' ? '語言' : '语言');
  };
  sync();
  select.addEventListener('change', () => setSiteLanguage(select.value));
  subscribeSiteLanguage(sync);
  host.replaceChildren(select);
}
