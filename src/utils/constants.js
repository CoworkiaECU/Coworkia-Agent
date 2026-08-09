// Constantes centralizadas de Coworkia
// Datos primitivos de dirección. La fuente única de verdad del negocio
// (contacto, horario, planes, pruebas) vive en ./coworkia-facts.js, que
// reexporta estos valores. Mantener aquí solo los primitivos de ubicación
// para evitar import circular.

export const COWORKIA_ADDRESS = 'Whymper 403, Edificio Finistere';
export const COWORKIA_ADDRESS_FULL = 'Whymper 403, Edificio Finistere, Planta Baja, Quito';
export const COWORKIA_MAPS_URL = 'https://maps.app.goo.gl/Nqy6YeGuxo3czEt66';

// Datos de contacto y horario canónicos (espejo de coworkia-facts.js).
export const COWORKIA_PHONE_DISPLAY = '+593 99 483 7117';
export const COWORKIA_PHONE_WA = '593994837117';
export const COWORKIA_EMAIL = 'coworkia.ec@gmail.com';
export const COWORKIA_HOURS = 'Lunes a Viernes 8:30 AM – 6:00 PM';
