const i18next = require('i18next')
const i18nextMiddleware = require('i18next-express-middleware')

const localeEN = require('@app/i18next/locales/en.json')
const localeGE = require('@app/i18next/locales/ge.json')

const locales = ['en', 'ge']

i18next.use(i18nextMiddleware.LanguageDetector).init({
  detection: {
    order: ['header'],
    lookupHeader: 'accept-language'
  },
  preload: locales,
  whitelist: locales,
  fallbackLng: 'en',
  resources: {
    en: { translation: localeEN },
    ge: { translation: localeGE }
  }
})

const graphQLEnumTC = {}

for (let i = 0; i < locales.length; i++) {
  graphQLEnumTC[locales[i]] = { value: locales[i] }
}

i18next.graphQLEnumTC = graphQLEnumTC