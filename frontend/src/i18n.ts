import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zh from './locales/zh.json'
import zhTW from './locales/zh-TW.json'
import en from './locales/en.json'

const LANG_KEY = 'lang'

function getInitialLang(): string {
  const stored = localStorage.getItem(LANG_KEY)
  if (stored === 'zh' || stored === 'zh-TW' || stored === 'en') return stored
  const browserLanguage = (navigator.languages?.[0] || navigator.language || 'en').toLowerCase()
  if (browserLanguage.startsWith('zh-hant') || browserLanguage.startsWith('zh-tw') || browserLanguage.startsWith('zh-hk') || browserLanguage.startsWith('zh-mo')) return 'zh-TW'
  return browserLanguage.startsWith('zh') ? 'zh' : 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    'zh-TW': { translation: zhTW },
    en: { translation: en },
  },
  lng: getInitialLang(),
  fallbackLng: {
    'zh-TW': ['zh'],
    default: ['zh'],
  },
  interpolation: {
    escapeValue: false,
  },
})

const syncDocumentLanguage = (language: string) => {
  document.documentElement.lang = language === 'zh-TW' ? 'zh-TW' : language === 'zh' ? 'zh-CN' : 'en'
}

syncDocumentLanguage(i18n.resolvedLanguage || i18n.language)
i18n.on('languageChanged', syncDocumentLanguage)

export default i18n
