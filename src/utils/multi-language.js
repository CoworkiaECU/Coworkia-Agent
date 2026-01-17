// Utilidades compartidas para soporte multi-idioma
// Centraliza configuración de idiomas para todos los agentes

export const SUPPORTED_LANGUAGES = {
  // Idiomas estándar para todos los agentes
  STANDARD: ['es', 'en', 'fr', 'it', 'pt'],
  
  // Angela incluye Quechua para comunidades indígenas (salud)
  ANGELA_EXTENDED: ['es', 'en', 'fr', 'it', 'pt', 'qu']
};

export const LANGUAGE_NAMES = {
  STANDARD: ['Español', 'English', 'Français', 'Italiano', 'Português'],
  ANGELA_EXTENDED: ['Español', 'English', 'Français', 'Italiano', 'Português', 'Quechua (Runasimi)']
};

export const getLanguageEmoji = (lang) => {
  const emojis = {
    es: '🇪🇸',
    en: '🇺🇸',
    fr: '🇫🇷',
    it: '🇮🇹',
    pt: '🇵🇹',
    qu: '🇵🇪'
  };
  return emojis[lang] || '🇪🇸';
};

export const getLanguageName = (lang) => {
  const names = {
    es: 'Español',
    en: 'English',
    fr: 'Français',
    it: 'Italiano',
    pt: 'Português',
    qu: 'Quechua (Runasimi)'
  };
  return names[lang] || 'Español';
};
