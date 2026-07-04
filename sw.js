// Service Worker - 集站 PWA 离线缓存
var CACHE_NAME = 'jizhan-pwa-v1';
var CACHE_FILES = [
  './',
  './index.html',
  './css/style.css',
  './js/classifier.js',
  './js/htmlGenerator.js',
  './js/app.js',
  './manifest.json',
  './icons/icon.svg'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_FILES);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(response) {
      if (response) return response;
      return fetch(e.request).then(function(resp) {
        // 缓存新请求（仅 GET）
        if (e.request.method === 'GET' && resp.status === 200) {
          var respClone = resp.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, respClone);
          });
        }
        return resp;
      }).catch(function() {
        // 离线回退
        if (e.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
