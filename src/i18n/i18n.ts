import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en.json';
import faTranslation from './locales/fa.json';
import ruTranslation from './locales/ru.json';

import { getCookie, setCookie } from '../utils/cookies';
import { api } from '../services/api';

const resources = {
  en: { translation: enTranslation },
  fa: { translation: faTranslation },
  ru: { translation: ruTranslation },
};

// Read existing cookie if present
const savedCookieLang = getCookie('payg_lang');
const initialLang = savedCookieLang || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export function updateDocumentDirection(lang: string, persistCookie: boolean = true) {
  const dir = lang === 'fa' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
  if (lang === 'fa') {
    document.body.classList.add('font-fa');
  } else {
    document.body.classList.remove('font-fa');
  }
  if (persistCookie) {
    setCookie('payg_lang', lang);
    localStorage.setItem('payg_vpn_lang', lang);
  }
}

// Apply visual direction on boot without prematurely forcing a cookie for new visitors
updateDocumentDirection(initialLang, Boolean(savedCookieLang));

// For new visitors without a cookie: load admin's default language setting
if (!savedCookieLang) {
  api.get<any>('/api/config/public')
    .then((data) => {
      if (data?.default_language && !getCookie('payg_lang')) {
        i18n.changeLanguage(data.default_language);
        updateDocumentDirection(data.default_language, false);
      }
    })
    .catch(() => {});
}

export default i18n;
