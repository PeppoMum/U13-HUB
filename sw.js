/* Offline-Cache für die App-Hülle. Daten laufen über Firestore (eigene Offline-Speicherung).
   Die Firebase-Bausteine (gstatic) werden mitgespeichert, damit die App auch ohne Netz startet. Version muss zu web.js passen. */
const V="u13-v5",FILES=["./","./index.html","./web.js","./manifest.webmanifest","./manifest-link.webmanifest","./icon-180.png","./icon-192.png","./icon-512.png","./firebase-config.js"];
const SDK="https://www.gstatic.com/firebasejs/10.14.1/",SDKF=["firebase-app-compat.js","firebase-auth-compat.js","firebase-firestore-compat.js"].map((f)=>SDK+f);
const keep=(c,r)=>fetch(r).then((res)=>{if(res.ok||res.type==="opaque")return c.put(r,res)}).catch(()=>{});
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>Promise.all([c.addAll(FILES).catch(()=>{}),...SDKF.map((u)=>keep(c,new Request(u,{mode:"no-cors"})))])).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=="GET")return;
  if(r.url.startsWith("https://www.gstatic.com/firebasejs/")){              // feste Version: zuerst aus dem Speicher
    e.respondWith(caches.match(r,{ignoreVary:true}).then(m=>m||fetch(r).then(res=>{const c=res.clone();caches.open(V).then(x=>x.put(r,c)).catch(()=>{});return res})));return}
  if(u.hostname==="firestore.googleapis.com"&&/\/documents\/pub\/[^/]+$/.test(u.pathname)){  // Link-Inhalte (verschlüsselt): zuerst Netz, ohne Netz der letzte Stand
    e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(V).then(x=>res.ok?x.put(r,c):res.status===404?x.delete(r):0).catch(()=>{});return res}).catch(()=>caches.match(r).then(m=>m||Promise.reject(new Error("offline")))));return}
  if(u.origin!==location.origin)return;                                     // andere Firebase/Google-Anfragen nie anfassen
  e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(V).then(x=>x.put(r,c)).catch(()=>{});return res}).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match("./index.html"))));
});
/* Benachrichtigungen (vom Zeitplan bei GitHub): t Titel, b Text, u Adresse beim Antippen (Links: ./?link setzt den gemerkten Link wieder ein) */
self.addEventListener("push",e=>{let d={};try{d=e.data?e.data.json():{}}catch(x){d={b:e.data?e.data.text():""}}
  e.waitUntil(self.registration.showNotification(d.t||"U13",{body:d.b||"",icon:"icon-192.png",badge:"icon-192.png",tag:d.g||undefined,data:{u:d.u||"./"}}))});
self.addEventListener("notificationclick",e=>{e.notification.close();const u=new URL((e.notification.data&&e.notification.data.u)||"./",self.registration.scope).href;
  e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(L=>{const c=L.find(x=>x.url.startsWith(self.registration.scope)&&"focus" in x);return c?c.focus():clients.openWindow(u)}))});
