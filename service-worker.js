const CACHE_NAME = 'clube-do-livro-shell-v5';
const SHELL_FILES = [
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './src/css/style.css',
  './src/js/core/config.js',
  './src/js/auth/auth.js',
  './src/js/livros/api.js',
  './src/js/comunidade/interacoes.js',
  './src/js/leitura/progresso.js',
  './src/js/leitura/cartao.js',
  './src/js/ui/perfis.js',
  './src/js/ui/metricas.js',
  './src/js/ui/biblioteca.js',
  './src/js/ui/visitas.js',
  './src/js/app.js'
];
const SHELL_URLS = new Set(
  SHELL_FILES.map(file => new URL(file, self.registration.scope).href)
);
const INDEX_URL = new URL('./index.html', self.registration.scope);
const CACHE_PREFIX = 'clube-do-livro-shell-';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(INDEX_URL, response.clone());
        return response;
      } catch {
        const cachedPage = await cache.match(INDEX_URL);
        return cachedPage || Response.error();
      }
    })());
    return;
  }

  if (!SHELL_URLS.has(requestUrl.href)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      const cachedAsset = await cache.match(request);
      return cachedAsset || Response.error();
    }
  })());
});
