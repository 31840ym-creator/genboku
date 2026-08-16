/* 保存庫。アプリを更新したら下の数字を1つ増やす。 */
const CACHE = 'genboku-v7';
const FILES = ['./', './index.html', './manifest.json', './icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;

  /* index.html は必ず新しいものを取りに行く（更新が届かない問題を防ぐ） */
  if (url.endsWith('/') || url.includes('index.html')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  /* モデルとAIライブラリは重いので保存庫に入れる */
  const heavy = url.includes('.onnx') || url.includes('onnxruntime-web') || url.includes('.wasm') || url.includes('.mjs');
  if (heavy) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
        return res;
      }))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
