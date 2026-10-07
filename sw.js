/* Einfacher Offline-Cache für die App-Hülle. Daten laufen über Firestore (eigene Offline-Speicherung). */
const V="u13-v1",FILES=["./","./index.html","./manifest.webmanifest","./icon-192.png","./firebase-config.js"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FILES).catch(()=>{})).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=="GET"||u.origin!==location.origin)return;           // Firebase/Google-Anfragen nie anfassen
  e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(V).then(x=>x.put(r,c)).catch(()=>{});return res}).catch(()=>caches.match(r).then(m=>m||caches.match("./index.html"))));
});
