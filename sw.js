/* 保存庫。アプリを更新したら下の数字を1つ増やす。

   大事な決まり:
   ・外部サイト(AIライブラリのCDNなど)には一切手を出さない。
     横取りすると読み込みに失敗することがあるため、ブラウザに任せる。
   ・失敗した応答は保存しない。 */
const CACHE = 'genboku-v34';
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

  const url = new URL(e.request.url);

  /* 外部サイトには触らない（ここが今までの不具合の原因） */
  if (url.origin !== self.location.origin) return;

  /* index.html は必ず新しいものを取りに行く。

     GitHub Pages は「10分間は取り直さなくてよい」という指示を付けて返してくる。
     普通に取りに行くとブラウザがその指示に従い、更新しても最大10分は
     古い画面のままになる。cache:'reload' を付けると、その指示を無視して
     必ずサーバに聞きに行く。圏外の時は下の catch で保存庫から出す。 */
  if (url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(new Request(e.request.url, {cache: 'reload'})).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  /* モデルとAIライブラリは重いので保存庫に入れる（成功した時だけ）。
     一度使えば、次からは圏外でも動く。 */
  if (url.pathname.endsWith('.onnx') || url.pathname.includes('/ort/')) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
        }
        return res;
      }))
    );
    return;
  }

  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
