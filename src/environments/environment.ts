export const environment = {
  production: false,
//   vacanciesUrl: 'http://localhost:3000/'
  vacanciesUrl: 'https://recluters.liftenergygroup.com.ve/',
  // Usar la IP de LAN (no 'localhost'): si se accede a Angular vía
  // 192.168.68.15:4200, 'localhost' se resolvería contra el propio
  // dispositivo del navegador, no contra el servidor real.
  medusaBackendUrl: 'http://192.168.68.15:9001',
  medusaPublishableKey: 'pk_8fff6fd015a7c994fe2d014bae5a1d44d1cb5bfdc1d0e8f540388743236030b6' // Angular Storefront Key, generada por lift-energy-seed.ts
};