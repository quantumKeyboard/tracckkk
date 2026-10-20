/* ~track : service worker.
   Makes the app work offline and installable when it's served over http(s)
   (GitHub Pages, any static host, `npm run serve`). It isn't used when you
   open index.html straight from disk, or inside the native app.

   Strategy: stale-while-revalidate for same-origin files. The app shell is
   cached on install; anything else same-origin (community plugins listed in
   plugins/manifest.js, for example) gets cached the first time it loads.
   Cross-origin requests (the picsum.photos images) are left alone.

   Bump CACHE whenever the shell list changes. */
const CACHE = 'track-v1';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'core/styles.css',
  'core/theme.js',
  'core/icons.js',
  'core/store.js',
  'core/platform.js',
  'core/engine.js',
  'plugins/manifest.js',
  'plugins/note.plugin.js',
  'plugins/checklist.plugin.js',
  'plugins/counter.plugin.js',
  'plugins/quote.plugin.js',
  'plugins/9-box-puzzle.plugin.js',
  'plugins/countdown.plugin.js',
  'plugins/pomodoro.plugin.js',
  'plugins/mood.plugin.js',
  'plugins/journal.plugin.js',
  'plugins/goals.plugin.js',
  'plugins/budget.plugin.js',
  'plugins/links.plugin.js',
  'vendor/chart.umd.js',
  'vendor/fonts/dm-sans.css',
  'vendor/fonts/dm-sans-latin-opsz-normal.woff2',
  'vendor/fonts/dm-sans-latin-opsz-italic.woff2',
  'vendor/fonts/dm-sans-latin-ext-opsz-normal.woff2',
  'assets/icons/192x192.png',
  'assets/icons/512x512.png',
];

self.addEventListener('install', event=>{
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(()=> self.skipWaiting()));
});

self.addEventListener('activate', event=>{
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(()=> self.clients.claim())
  );
});

self.addEventListener('fetch', event=>{
  const req = event.request;
  if(req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async cache=>{
      const cached = await cache.match(req, { ignoreSearch: true });
      const fresh = fetch(req).then(res=>{
        if(res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(()=> cached);
      return cached || fresh;
    })
  );
});
