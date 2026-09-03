// Minimal service worker — keeps the page alive for background audio
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

// Keep-alive heartbeat
let keepAliveInterval;

self.addEventListener('message', (event) => {
  if (event.data === 'start-keep-alive') {
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
