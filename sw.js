/* 성분표 스캐너 서비스 워커 — 앱 셸 + OCR 엔진 + 한글 모델을 캐시해 오프라인에서도 동작 */
const VERSION = "v1.1.0";
const CACHE = "label-scanner-" + VERSION;
const SHELL = [
  "./", "index.html", "additives.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-180.png", "icons/maskable-512.png", "icons/icon.svg",
  "vendor/tesseract.min.js", "vendor/worker.min.js",
  "vendor/tesseract-core-simd-lstm.wasm.js", "vendor/tesseract-core-lstm.wasm.js",
  "tessdata/kor.traineddata"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  // 앱 셸(HTML/JS)은 네트워크 우선 → 실패 시 캐시 (배포 후 갱신이 바로 반영되도록)
  const isShell = /(\/|index\.html|additives\.js|manifest\.webmanifest)$/.test(url.pathname);
  if (isShell) {
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
    return;
  }
  // 엔진·모델·아이콘은 캐시 우선
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })));
});
