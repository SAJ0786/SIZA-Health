self.addEventListener("install",e=>{e.waitUntil(caches.open("health-tracker-v1").then(c=>c.addAll(["./","./index.html","./styles.css","./app.js","./firebase-config.js","./manifest.webmanifest","./assets/logo.png"])))});
self.addEventListener("fetch",e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
