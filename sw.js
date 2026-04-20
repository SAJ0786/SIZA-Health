self.addEventListener("install",e=>{e.waitUntil(caches.open("health-tracker-final-stable-v2").then(c=>c.addAll(["./","./index.html","./styles.css","./app.js","./firebase-config.js","./manifest.webmanifest","./assets/logo.png"])))});
self.addEventListener("activate",e=>{e.waitUntil(self.clients.claim())});
self.addEventListener("fetch",e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
