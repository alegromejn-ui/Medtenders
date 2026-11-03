/* Сервісний воркер: каркас додатка відкривається без інтернету.
   Сторінка береться з мережі (щоб приходили оновлення), а коли мережі немає, з кешу.
   Запити до Google-скрипта не кешуються: тендери зберігає сам додаток. */
const VERSION = 'medtender-v32';
const SHELL = ['./', 'index.html', 'styles.css', 'core.js', 'ui.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'icon-maskable-512.png',
  'fonts/onest-cyrillic-ext-wght-normal.woff2', 'fonts/onest-cyrillic-wght-normal.woff2', 'fonts/onest-latin-ext-wght-normal.woff2', 'fonts/onest-latin-wght-normal.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(req.mode === 'navigate' ? navigate(req) : asset(req));
});

// Спершу кеш (миттєво й без мережі), а свіжа копія підтягується фоном для наступного запуску.
function refresh(req, key) {
  return fetch(req, { cache: 'no-cache' }).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(key || req, copy)); }
    return res;
  });
}
function asset(req) {
  return caches.match(req, { ignoreSearch: true }).then(hit => {
    if (hit) { refresh(req).catch(() => {}); return hit; }
    return refresh(req).catch(() => new Response('', { status: 504, statusText: 'offline' }));
  });
}
function offlinePage() {
  return new Response('<!doctype html><html lang="uk"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Немає зв’язку</title>' +
    '<body style="font:16px/1.5 system-ui,sans-serif;background:#111;color:#eee;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center">' +
    '<div><h1 style="font-size:20px">Немає зв’язку</h1><p>Додаток ще не встиг зберегтися в телефоні. Підключіться до інтернету й відкрийте його ще раз.</p>' +
    '<p><button onclick="location.reload()" style="font:inherit;padding:10px 18px;border-radius:12px;border:0">Спробувати ще раз</button></p></div></body></html>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
function navigate(req) {
  return caches.match('index.html', { ignoreSearch: true }).then(hit => {
    if (hit) { refresh(req, 'index.html').catch(() => {}); return hit; }
    return refresh(req, 'index.html').catch(() => offlinePage());
  });
}
