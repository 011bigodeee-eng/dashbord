// Network-only app shell. No authenticated responses or private data are cached.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* Use the network; no offline data claims. */ });
