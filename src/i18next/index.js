const i18next = require('i18next')
const middleware = require('i18next-express-middleware')

const localeEN = require('@app/i18next/locales/en.json')
const localeGE = require('@app/i18next/locales/ge.json')

i18next.use(middleware.LanguageDetector).init({
  detection: {
    order: ['header'],
    lookupHeader: 'accept-language'
  },
  preload: ['en', 'ge'],
  whitelist: ['en', 'ge'],
  fallbackLng: 'en',
  resources: {
    en: { translation: localeEN },
    ge: { translation: localeGE }
  }
})
