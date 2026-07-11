/* Космоматематика — service worker: offline play, cache-first */
const CACHE = 'kosmomath-v12';
const CHARS = ['Nika','Kogot'];
const RANKS = ['01_Cadet','02_Trainee_Pilot','03_Pilot','04_Navigator','05_Captain','06_Galaxy_Admiral'];
const NPCS = [1,2,3,4,5,6].flatMap(n => ['h','v'].map(k => 'characters/web/npc_'+n+'_'+k+'_3d.png'));
const BADGES = Array.from({length:12}, (_,i) => 'achievements/web/ach_'+(i+1)+'.png');
const ASSETS = [
  '.',
  'index.html',
  'about.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
].concat(
  CHARS.flatMap(c => RANKS.map(r => 'characters/web/'+c+'_'+r+'_3d.png')),
  NPCS,
  BADGES
);

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // the page itself: network-first so updates arrive, cache fallback for offline
  if (e.request.mode === 'navigate'){
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return resp;
        })
        .catch(() => caches.match(e.request, { ignoreSearch: true })
          .then(hit => hit || caches.match('index.html')))
    );
    return;
  }
  // assets: cache-first (same-origin + Google Fonts, so the font works offline)
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit =>
      hit ||
      fetch(e.request).then(resp => {
        const origin = new URL(e.request.url).origin;
        const isFontCdn = origin === 'https://fonts.googleapis.com' || origin === 'https://fonts.gstatic.com';
        const cacheable = origin === location.origin
          ? resp.ok
          : isFontCdn && (resp.ok || resp.type === 'opaque');
        if (cacheable) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return resp;
      })
    )
  );
});
