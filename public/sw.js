// Service worker for background audio playback on mobile
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Keep the service worker alive for background audio
let keepAliveInterval;

self.addEventListener('message', (event) => {
  if (event.data === 'start-keep-alive') {
    // Periodically send heartbeat to keep the page alive
    keepAliveInterval = setInterval(() => {
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage('heartbeat'));
      });
    }, 30000);
  }

  if (event.data === 'stop-keep-alive') {
    clearInterval(keepAliveInterval);
  }
});

// Handle audio fetch requests from the app
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Intercept audio stream requests and add proper headers
  if (url.pathname === '/api/mobile-audio') {
    event.respondWith(
      fetch(event.request).then((response) => {
        // Clone the response and add CORS headers for mobile audio
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Access-Control-Allow-Origin', '*');
        newHeaders.set('Cache-Control', 'no-cache');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      })
    );
  }
});
