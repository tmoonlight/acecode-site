/**
 * Resolve supported languages in the browser's preference order.
 * Used as the default until the visitor chooses a site language.
 * @param {{languages?: readonly string[], language?: string}} browser
 * @returns {'zh' | 'zh-TW' | 'en'}
 */
export function browserLanguage(browser = {}) {
  const preferences = [...(browser.languages || []), browser.language]
    .filter(value => typeof value === 'string' && value.trim());
  for (const value of preferences) {
    const parts = value.trim().toLowerCase().replace(/_/g, '-').split('-');
    if (parts[0] === 'en') return 'en';
    if (parts[0] !== 'zh') continue;
    if (parts.includes('hans')) return 'zh';
    if (parts.some(part => ['hant', 'tw', 'hk', 'mo'].includes(part))) return 'zh-TW';
    return 'zh';
  }
  return preferences.length ? 'en' : 'zh';
}

/** @param {'zh' | 'zh-TW' | 'en'} language */
export function documentLanguage(language) {
  return language === 'zh' ? 'zh-CN' : language;
}
