import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zh from './locales/zh.json'
import zhTW from './locales/zh-TW.json'
import en from './locales/en.json'
import { documentLanguage } from '../../public/acemodel/assets/browser-language.js'
import { getSiteLanguage, setSiteLanguage, subscribeSiteLanguage } from '../../public/acemodel/assets/site-language.js'

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    'zh-TW': { translation: zhTW },
    en: { translation: en },
  },
  lng: getSiteLanguage(),
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
  if (language !== getSiteLanguage()) setSiteLanguage(language)
}

syncDocumentLanguage(i18n.resolvedLanguage || i18n.language)
i18n.on('languageChanged', syncDocumentLanguage)
subscribeSiteLanguage((language: string) => {
  if (language !== i18n.language) void i18n.changeLanguage(language)
})

export default i18n
