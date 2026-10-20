import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zh from './locales/zh.json'
import zhTW from './locales/zh-TW.json'
import en from './locales/en.json'
import { browserLanguage, documentLanguage } from '../../public/acemodel/assets/browser-language.js'

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    'zh-TW': { translation: zhTW },
    en: { translation: en },
  },
  lng: browserLanguage(navigator),
  fallbackLng: {
    'zh-TW': ['zh'],
    default: ['zh'],
  },
  interpolation: {
    escapeValue: false,
  },
})

const syncDocumentLanguage = (language: string) => {
  document.documentElement.lang = documentLanguage(language === 'zh-TW' ? 'zh-TW' : language === 'zh' ? 'zh' : 'en')
}

syncDocumentLanguage(i18n.resolvedLanguage || i18n.language)
i18n.on('languageChanged', syncDocumentLanguage)
window.addEventListener('languagechange', () => {
  void i18n.changeLanguage(browserLanguage(navigator))
})

export default i18n
