// Green Fork · Datos de ESTA empresa. Este archivo NO es parte del código de React: lo lee la
// app en tiempo de ejecución vía window.APP_CONFIG, así que editarlo no requiere recompilar.
//
// ┌─ PENDIENTE: llenar los 4 campos marcados [COMPLETAR] antes de usar la app ─────────────┐
// │ 1. supabaseUrl + supabaseKey → Project Settings → API del proyecto de Supabase de Green │
// │    Fork. La clave que va acá es la ANON / PUBLISHABLE (la que empieza con ey…), nunca la │
// │    service_role: esta clave se ve en el navegador del cliente.                            │
// │ 2. whatsappNumber → con código de país y solo dígitos (Bolivia: 591 + 8 dígitos).        │
// │ 3. instagramUrl/instagramHandle → opcionales, pueden quedar vacíos.                       │
// │ 4. Después de crear el proyecto en Supabase, corré desde la carpeta maestro               │
// │    `npm run nueva-empresa init --ref <REF> --empresa "Green Fork" --whatsapp <NUM>         │
// │     --out "G:\catering control\Green Fork"` : eso te genera el SQL con el ref resuelto,    │
// │    el par VAPID y la entrada en install/empresas.json.                                     │
// └──────────────────────────────────────────────────────────────────────────────────────────┘
window.APP_CONFIG = {
  // Nombre que se muestra en toda la app (título, menú, etc.)
  companyName: 'Green Fork',

  // Ruta o URL del logo
  logoUrl: 'icons/icon-512.png',

  // Número de WhatsApp para el botón de contacto
  whatsappNumber: '59176989227', // [COMPLETAR]

  // Instagram de la empresa
  instagramUrl: '',
  instagramHandle: '',

  // Prefijo usado para guardar datos locales en el navegador (no lo repitas entre empresas: si
  // dos empresas comparten prefijo, en la misma PC se pisan los datos guardados).
  storagePrefix: 'catering-app-greenfork',

  // Default inicial de idioma y moneda hasta que la empresa los defina en Configuración.
  // Idiomas soportados: 'es' (español), 'en' (inglés), 'pt' (portugués).
  // El super admin los cambia en Panel → Configuración; estos valores son solo el arranque.
  defaultLanguage: 'es',
  currency: 'BOB', // [REVISAR] si Green Fork no es de Bolivia, cambiá la moneda

  // Datos del proyecto de Supabase de ESTA empresa (Project Settings → API)
  supabaseUrl: 'https://inirizkgxkpvqnityvud.supabase.co', // [COMPLETAR] https://xxxxxxxxxxxxxxxxxxxx.supabase.co
  supabaseKey: 'sb_publishable_8Rb_ghQpb3sFjEefC-8lUA_S0oaUxw8', // [COMPLETAR] clave anon/publishable

  // Clave PÚBLICA de notificaciones push (VAPID). La genera `nueva-empresa.mjs`; si la dejás
  // vacía el registro automático de push no funciona, lo demás de la app sí.
  vapidPublicKey: 'BOZfBQDxD_eXQhdj6VkDH4IgeSXYxmZ53cy2e_h0NAkV4YnkwKS_cwqW7gx5dP15OX3APmJjU04tmkhFoblZOF8',
};
