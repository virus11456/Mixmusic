/* Mixmusic 原型 Service Worker：把整個 App 存在裝置裡，離線也能開。 */
const CACHE = 'mixmusic-proto-v7';
const SOUNDS = ['rain','rainthunder','waves','river','fire','wind','birds','morning','crickets','nightforest','park','traffic','citynight','crowd','cafe','subway','aidemo'].map(n => './sounds/' + n + '.mp3');
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).then(() => { c.addAll(SOUNDS).catch(() => {}); })).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 自己的檔案：先拿快取，背景再更新（下次打開就是新版）。
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => {
      const fetching = fetch(req).then((res) => { if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone())); return res; }).catch(() => hit);
      return hit || fetching;
    }));
    return;
  }
  // 字型等外部資源：先上網，失敗就用快取，再失敗就讓瀏覽器用系統字型。
  e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; }).catch(() => caches.match(req)));
});
