// Configuración de desarrollo (ng serve / ng build --configuration development).
// En el build de producción este archivo se reemplaza por environment.prod.ts
// (ver "fileReplacements" en angular.json).
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  // Número de ejemplo: reemplazar por el WhatsApp real de la tienda, con código de área.
  storeWhatsapp: '5491155551234',
};
