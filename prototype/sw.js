/* Mixmusic 原型 Service Worker：把整個 App 存在裝置裡，離線也能開。 */
const CACHE = 'mixmusic-proto-v10';
const SOUNDS = ['rain','rainthunder','waves','river','fire','wind','birds','morning','crickets','nightforest','park','traffic','citynight','crowd','cafe','subway','aidemo','ai-lofi','ai-edm','ai-ambient','ai-cpop'].map(n => './sounds/' + n + '.mp3');
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
  if (url.pathname.startsWith('/api/')) return;
  // 自己的檔案：先拿快取，背景再更新（下次打開就是新版）。
  if (url.origin === self.location.origin) {
    // 導覽（含 ?s=分享連結）一律對應同一份 index.html，避免每個連結各存一份、也避免永遠拿到舊版
    const key = req.mode === 'navigate' ? new Request('./') : req;
    e.respondWith(caches.match(key, { ignoreSearch: true }).then((hit) => {
      const fetching = fetch(req).then((res) => { if (res.ok) caches.open(CACHE).then((c) => c.put(key, res.clone())); return res; }).catch(() => hit || Response.error());
      return hit || fetching;
    }));
    return;
  }
  // 字型等外部資源：先上網，失敗就用快取，再失敗就讓瀏覽器用系統字型。
  e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; }).catch(() => caches.match(req)));
});
