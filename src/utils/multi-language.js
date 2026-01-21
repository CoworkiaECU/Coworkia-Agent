// Utilidades compartidas para soporte multi-idioma
// Centraliza configuración de idiomas para todos los agentes

export const SUPPORTED_LANGUAGES = {
  // Español + English (todos los agentes)
  STANDARD: ['es', 'en'],
  
  // Angela: Español + English + Quechua (comunidades indígenas)
  ANGELA_EXTENDED: ['es', 'en', 'qu']
};

export const LANGUAGE_NAMES = {
  STANDARD: ['Español', 'English'],
  ANGELA_EXTENDED: ['Español', 'English', 'Quechua (Runasimi)']
};

export const getLanguageEmoji = (lang) => {
  const emojis = {
    es: '🇪🇸',
    en: '🇺🇸',
    qu: '🇵🇪'
  };
  return emojis[lang] || '🇪🇸';
};

export const getLanguageName = (lang) => {
  const names = {
    es: 'Español',
    en: 'English',
    qu: 'Quechua (Runasimi)'
  };
  return names[lang] || 'Español';
};
