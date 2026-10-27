/* ===== U13 Teamzentrale – Web-Variante (Firebase) =====
   Ersetzt die Artifact-Umgebung durch Firebase (Anmeldung + Firestore) und stellt der App dieselbe Schnittstelle bereit
   (window.claude.use("db" | "downloads" | "artifact")). Die Spielerlinks lesen nur das öffentliche, verschlüsselte Fach „pub“. */
(function(){
"use strict";
if(window.__WEBINIT)return;window.__WEBINIT=true;
const CFG=window.U13_FIREBASE||{};
const SDK=(CFG.sdkBase||"https://www.gstatic.com/firebasejs/10.14.1/");   /* Version auch in sw.js anpassen (Offline-Start) */
const XIDS=["plan","demo","demosp"];
window.__WEB=true;
window.__WEB_BASE=location.origin+location.pathname.replace(/index\.html$/,"");
const IOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
/* Vorschau für Trainer (?vorschau=s|e, in der Trainer-App eingebettet): Spieler- bzw. Elternansicht ohne Konto.
   Eigener Speicher nur für dieses Fenster: nichts wird auf dem Gerät gemerkt, Eingaben gehen nicht an den Server (siehe __vidNet unten). */
const VS=((location.search.match(/[?&]vorschau=([se])(?:&|$)/)||[])[1])||"";
window.__VORSCHAU=VS;window.__TRAINERDEV=(()=>{try{return!VS&&!!localStorage.getItem("u13role")}catch(e){return false}})();
if(VS){const M=new Map();try{const t=localStorage.getItem("u13theme");if(t)M.set("u13theme",t)}catch(e){}
  const pm=location.hash.match(/^#([A-Za-z0-9]+)\./);if(pm)M.set("u13wer."+pm[1],JSON.stringify(VS==="s"?{r:"s"}:{r:"e",n:"Elternteil"}));
  const mem={getItem:(k)=>M.has(String(k))?M.get(String(k)):null,setItem:(k,v)=>{M.set(String(k),String(v))},removeItem:(k)=>{M.delete(String(k))},clear:()=>M.clear(),key:(i)=>[...M.keys()][i]||null,get length(){return M.size}};
  try{Object.defineProperty(window,"localStorage",{configurable:true,get:()=>mem})}catch(e){}}
/* Trainer-Gerät (hier hat sich schon ein Trainer angemeldet): Die App startet immer in der Trainer-Ansicht, nie in einem gemerkten Link */
const TRAINER=window.__TRAINERDEV;
/* Start der installierten Link-App („./?link“ ohne Link): den auf diesem Gerät gespeicherten Link wieder einsetzen */
if(/[?&]link\b/.test(location.search)&&!location.hash){try{const s=localStorage.getItem("u13link");
  if(TRAINER)history.replaceState(null,"",location.pathname);
  else if(s&&/^#/.test(s))history.replaceState(null,"",location.pathname+location.search+s)}catch(e){}}
const H=location.hash;
const isScout=/^#scout\.[A-Za-z0-9_-]{16,}$/.test(H);
window.__SCOUTKEY=isScout?H.slice(7):"";
const isKurz=/^#k\/[A-Za-z0-9_-]{4,40}$/.test(H);
/* Konto für Spieler und Eltern: #sp/<Schlüssel> (Spielerlink), #mt/<Schlüssel> (Mannschaftslink), #konto (eigene Ansicht nach der Anmeldung) */
const isKonto=/^#(konto|sp\/[A-Za-z0-9_-]{16,80}|mt\/[A-Za-z0-9_-]{16,80})$/.test(H);
const isViewerHash=(/^#[A-Za-z0-9]+\.[A-Za-z0-9_-]{16,}$/.test(H)&&!/^#co[A-Za-z0-9]+\./.test(H)&&!isScout)||isKurz||isKonto;
/* Spieler-, Eltern- und externe Links als eigene App. Rechte ändern sich nicht: Die App zeigt dasselbe wie der Link im Browser.
   Android/Computer: eigene App-Datei (manifest-link) mit Startadresse „./?link“; beim Start wird der zuletzt geöffnete Link auf diesem Gerät wieder eingesetzt (siehe oben).
   iPhone/iPad: ohne App-Datei, dann speichert das iPhone genau die geöffnete Adresse samt Link. */
/* Gemerkter Link: der persönliche (Konto oder Spielerlink) geht vor. Wer zwischendurch den Teamlink oder eine Demo öffnet, landet beim nächsten Start trotzdem wieder in seiner eigenen Ansicht. */
const lRank=(h)=>/^#(konto|sp\/|mt\/)/.test(h)?3:new RegExp("^#("+XIDS.join("|")+")\\.").test(h)?1:h?2:0;
if(isViewerHash&&!VS)try{const neu=isKonto?"#konto":H;if(lRank(neu)>=lRank(localStorage.getItem("u13link")||""))localStorage.setItem("u13link",neu)}catch(e){}
/* Trainer-Gerät in einer Link-Ansicht: Leiste oben mit dem Weg zurück zur Trainer-Ansicht */
if(isViewerHash&&TRAINER)document.addEventListener("DOMContentLoaded",()=>{if(document.getElementById("u13tback"))return;const d=document.createElement("div");d.id="u13tback";
  d.style.cssText="position:sticky;top:0;z-index:70;display:flex;gap:10px;align-items:center;justify-content:space-between;padding:8px 14px;padding-top:calc(8px + env(safe-area-inset-top,0px));background:#004AAD;color:#fff;font-size:14px";
  d.innerHTML='<span>Du siehst gerade einen Link wie Spieler und Eltern.</span><button type="button" style="flex:none;border:0;border-radius:99px;padding:6px 14px;background:#fff;color:#004AAD;font:inherit;font-weight:600;cursor:pointer">Zur Trainer-Ansicht</button>';
  d.querySelector("button").onclick=()=>{location.replace(location.pathname)};document.body.insertAdjacentElement("afterbegin",d)});
if(VS)document.addEventListener("DOMContentLoaded",()=>{const st=document.createElement("style");st.textContent="#u13vinst,#u13push,#u13tback{display:none!important}";document.head.appendChild(st);
  if(window.top===window){const d=document.createElement("div");d.style.cssText="padding:8px 14px;background:var(--ys,#fff7e0);color:var(--tx,#111);font-size:14px;text-align:center";d.textContent="Vorschau für Trainer · Eingaben werden nicht gespeichert";document.body.insertAdjacentElement("afterbegin",d)}});
{const mf=VS?"":isViewerHash?(IOS?"":"manifest-link.webmanifest"):"manifest.webmanifest";   /* App-Datei steht deshalb nicht fest in index.html */
  if(mf){const l=document.createElement("link");l.rel="manifest";l.href=mf;document.head.appendChild(l)}}
const cfgOk=()=>!!(CFG.apiKey&&CFG.projectId&&CFG.authDomain&&!/DEIN|EINTRAGEN|XXXX/i.test(CFG.apiKey+CFG.projectId));
const E=(s)=>String(s==null?"":s).replace(/[&<>"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const clean=(o)=>o==null?o:JSON.parse(JSON.stringify(o));

/* ---------- Download: Datei direkt speichern ---------- */
const MIME={pdf:"application/pdf",png:"image/png",jpg:"image/jpeg",json:"application/json",zip:"application/zip",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"};
function nativeSave(o){
  const name=o.filename,data=o.data,ext=String(name).split(".").pop().toLowerCase();
  const blob=data instanceof Blob?data:new Blob([data],{type:MIME[ext]||"application/octet-stream"});
  const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;a.style.display="none";document.body.appendChild(a);a.click();
  setTimeout(()=>{a.remove();URL.revokeObjectURL(u)},5000);return Promise.resolve();
}

/* ---------- Öffentliche Link-Fächer lesen (ohne Anmeldung, ohne Firebase-Bibliothek) ---------- */
async function restDoc(id){
  const url="https://firestore.googleapis.com/v1/projects/"+encodeURIComponent(CFG.projectId)+"/databases/(default)/documents/pub/"+encodeURIComponent(id)+"?key="+encodeURIComponent(CFG.apiKey);
  const r=await fetch(url);
  if(r.status===404)return null;
  if(!r.ok)throw new Error("http "+r.status);
  const j=await r.json(),o={};
  Object.keys(j.fields||{}).forEach((k)=>{const v=j.fields[k];o[k]=v.stringValue!=null?v.stringValue:v.integerValue!=null?+v.integerValue:v.booleanValue!=null?v.booleanValue:null});
  return o;
}
async function restBlob(id){
  const m=await restDoc(id);if(!m||typeof m.b!=="string")return null;
  let b=m.b;for(let i=1;i<(m.n||1);i++){const c=await restDoc(id+"~"+i);if(!c)return null;b+=c.b}
  return b;
}
/* ---------- Scouting-Eingabe ohne Anmeldung: nur Schreiben in den Posteingang, abgesichert durch den geheimen Schlüssel im Link ---------- */
const FSB=()=>"https://firestore.googleapis.com/v1/projects/"+encodeURIComponent(CFG.projectId)+"/databases/(default)/documents/";
function toFs(v){if(v==null)return{nullValue:null};if(typeof v==="boolean")return{booleanValue:v};if(typeof v==="number")return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};if(Array.isArray(v))return{arrayValue:{values:v.map(toFs)}};if(typeof v==="object"){const f={};Object.keys(v).forEach((k)=>{f[k]=toFs(v[k])});return{mapValue:{fields:f}}}return{stringValue:String(v)}}
const scoutGet=async()=>{let aus=false;try{const m=await restDoc("scout");aus=!!(m&&m.aus)}catch(e){}return{exists:true,data:()=>({kaderAus:aus})}};
window.__scoutDb=()=>scoutDb;
const scoutDb={doc:()=>({get:scoutGet}),collection:(c)=>({doc:(id)=>({get:scoutGet,set:async(o)=>{
  if(c!=="kinbox")throw{code:"unsupported"};
  const f={};Object.keys(o).forEach((k)=>{f[k]=toFs(o[k])});
  const r=await fetch(FSB()+"kinbox?documentId="+encodeURIComponent(id)+"&key="+encodeURIComponent(CFG.apiKey),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fields:f})});
  if(!r.ok)throw{code:r.status===403?"permission-denied":"http-"+r.status}}})})};
/* Kurzlinks: Passwort-Paket lesen und (mit Nachweis des alten Passworts) ersetzen, ohne Anmeldung */
{const hd={"Content-Type":"application/json"},K=()=>"key="+encodeURIComponent(CFG.apiKey),fail=(r)=>{throw{code:r.status===403?"permission-denied":"http-"+r.status}};
window.__kurzNet={
  get:(aid)=>restDoc(aid),
  async setPw(aid,t,o){
    let r=await fetch(FSB()+"aliasin/"+encodeURIComponent(aid)+"?"+K(),{method:"PATCH",headers:hd,body:JSON.stringify({fields:{t:{stringValue:t}}})});if(!r.ok)fail(r);
    r=await fetch(FSB()+"pub/"+encodeURIComponent(aid)+"?updateMask.fieldPaths=s&updateMask.fieldPaths=w&updateMask.fieldPaths=v&currentDocument.exists=true&"+K(),{method:"PATCH",headers:hd,body:JSON.stringify({fields:{s:{stringValue:o.s},w:{stringValue:o.w},v:{integerValue:String(o.v|0)}}})});
    fetch(FSB()+"aliasin/"+encodeURIComponent(aid)+"?"+K(),{method:"DELETE"}).catch(()=>{});
    if(!r.ok)fail(r)}};}
/* Videos und Feedback im Spielerlink: Kommentare (geheimer Pfad, verschlüsselt) und Nachrichten an den Trainer, ohne Anmeldung */
{const hd={"Content-Type":"application/json"},K=()=>"key="+encodeURIComponent(CFG.apiKey),P=(p)=>p.split("/").map(encodeURIComponent).join("/"),fail=(r)=>{throw{code:r.status===403?"permission-denied":"http-"+r.status}};
const fromFs=(v)=>v.stringValue!=null?v.stringValue:v.integerValue!=null?+v.integerValue:v.doubleValue!=null?v.doubleValue:v.booleanValue!=null?v.booleanValue:v.timestampValue!=null?v.timestampValue:null;
window.__vidNet={
  async list(path){const out=[];let tok="";
    do{const r=await fetch(FSB()+P(path)+"?pageSize=300&"+K()+(tok?"&pageToken="+encodeURIComponent(tok):""));if(r.status===404)return out;if(!r.ok)fail(r);const j=await r.json();
      (j.documents||[]).forEach((x)=>{const o={id:x.name.split("/").pop()},F=x.fields||{};Object.keys(F).forEach((k)=>{o[k]=fromFs(F[k])});if(F.at&&F.at.timestampValue!=null){o.server=true;o.at=new Date(F.at.timestampValue).toISOString()}out.push(o)});tok=j.nextPageToken||""}while(tok&&out.length<3000);
    return out},
  async create(coll,id,obj,ts){const f={};Object.keys(obj).forEach((k)=>{f[k]=toFs(obj[k])});if(ts)f.at={timestampValue:new Date().toISOString()};
    const r=await fetch(FSB()+P(coll)+"?documentId="+encodeURIComponent(id)+"&"+K(),{method:"POST",headers:hd,body:JSON.stringify({fields:f})});if(!r.ok)fail(r)},
  async update(path,obj){const ks=Object.keys(obj),f={};ks.forEach((k)=>{f[k]=toFs(obj[k])});
    const r=await fetch(FSB()+P(path)+"?"+ks.map((k)=>"updateMask.fieldPaths="+encodeURIComponent(k)).join("&")+"&currentDocument.exists=true&"+K(),{method:"PATCH",headers:hd,body:JSON.stringify({fields:f})});if(!r.ok)fail(r)}};}
/* Vorschau: Lesen wie gewohnt, Eingaben bleiben nur in diesem Fenster */
if(VS){const real=window.__vidNet,S={};window.__vidNet={
  async list(p){const a=await real.list(p),loc=S[p]||[];return a.filter((x)=>!loc.some((y)=>y.id===x.id)).concat(loc.map((x)=>({...x})))},
  async create(c,id,o){const L=S[c]=(S[c]||[]).filter((x)=>x.id!==id);L.push({...o,id,at:new Date().toISOString(),server:true})},
  async update(p,o){const q=p.split("/"),id=q.pop(),c=q.join("/"),L=S[c]=S[c]||[],x=L.find((y)=>y.id===id);if(x)Object.assign(x,o)}};
  window.__kurzNet={get:async()=>null,setPw:async()=>{}}}
window.__webFile=(fid)=>/^[0-9a-f]{24}$/.test(fid)?restBlob("f_"+fid):Promise.resolve(null);   /* Eigentraining: verschlüsselte Datei */
window.__webSnap=async function(pid){
  if(!cfgOk())throw new Error("config");
  const x=XIDS.indexOf(pid)>=0,b=await restBlob((x?"x_":"p_")+pid),bg=await restDoc("bg"),s={p:{},x:{}};
  if(b)(x?s.x:s.p)[pid]=b;
  if(bg)s.bg={L:bg.L||"",D:bg.D||"",i:bg.i||""};
  return s;
};

/* ---------- Anmeldung ---------- */
let fb=null,fs=null,auth=null;
/* Gemeinsames Gerät: nichts dauerhaft speichern (Anmeldung gilt nur bis zum Schließen, kein Offline-Speicher). Abmelden räumt immer auf. */
const SHARED=(()=>{try{return localStorage.getItem("u13shared")==="1"}catch(e){return false}})();
async function wipeLocal(){
  try{await fs.terminate()}catch(e){}
  try{await fs.clearPersistence()}catch(e){}
  try{Object.keys(localStorage).filter((k)=>/^(u13v:|u13rolle$|u13role$|u13kz\.|u13wer\.|u13kpid$|u13ktok$)/.test(k)).forEach((k)=>localStorage.removeItem(k))}catch(e){}
}
async function signOutClean(){try{await auth.signOut()}catch(e){}await wipeLocal();location.reload()}

function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.async=false;s.onload=res;s.onerror=()=>rej(new Error("Konnte "+src+" nicht laden"));document.head.appendChild(s)})}
const CSS='#u13login{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;background:var(--bg,#f4f5f7);color:var(--tx,#1c1f24);font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;overflow:auto}'
+'#u13login .lc{width:100%;max-width:400px;background:var(--card,#fff);border:1px solid var(--ln,#e5e7eb);border-radius:16px;padding:22px 20px;box-shadow:0 8px 30px rgba(0,0,0,.08)}'
+'#u13login h1{font-size:20px;margin:0 0 2px}#u13login .sb{display:block;height:auto;overflow:visible;border-radius:0;color:var(--mu,#6b7280);font-size:13px;margin:0 0 16px}'   /* .sb ist in der App ein Balken (feste Höhe) – hier normaler Text */
+'#u13login input{width:100%;box-sizing:border-box;margin:0 0 10px;padding:10px 12px;font:inherit;color:var(--tx,#1c1f24);background:var(--card,#fff);border:1px solid var(--ln,#d0d5dd);border-radius:10px}'
+'#u13login button{width:100%;box-sizing:border-box;padding:10px 12px;margin:0 0 8px;font:inherit;font-weight:600;border-radius:10px;border:1px solid var(--ln,#d0d5dd);background:var(--card,#fff);color:var(--tx,#1c1f24);cursor:pointer}'
+'#u13login button.pr{background:var(--ac,#2563eb);border-color:var(--ac,#2563eb);color:#fff}#u13login button:disabled{opacity:.55;cursor:default}'
+'#u13login .ln{background:none;border:0;color:var(--ac,#2563eb);font-weight:500;padding:4px 0;margin:0;width:auto;display:inline-block}'
+'#u13login .ms{min-height:20px;font-size:13px;margin:4px 0 10px}#u13login .ms.er{color:var(--r,#d64545)}#u13login .ms.ok{color:var(--g,#22a06b)}'
+'#u13login .or{display:flex;align-items:center;gap:10px;color:var(--mu,#6b7280);font-size:12px;margin:10px 0}#u13login .or:before,#u13login .or:after{content:"";flex:1;border-top:1px solid var(--ln,#e5e7eb)}'
+'#u13out{margin-left:10px;font:inherit;font-size:13px;padding:3px 9px;border-radius:8px;border:1px solid var(--ln,#e5e7eb);background:var(--card,#fff);color:var(--tx,#1c1f24);cursor:pointer;vertical-align:middle}';
const ERR={"auth/invalid-credential":"E-Mail oder Passwort stimmt nicht.","auth/wrong-password":"E-Mail oder Passwort stimmt nicht.","auth/user-not-found":"E-Mail oder Passwort stimmt nicht.","auth/invalid-email":"Diese E-Mail-Adresse ist ungültig.","auth/email-already-in-use":"Zu dieser E-Mail gibt es schon ein Konto. Bitte anmelden.","auth/weak-password":"Das Passwort ist zu schwach (mindestens 10 Zeichen, am besten mehrere Wörter).","auth/too-many-requests":"Zu viele Versuche. Bitte kurz warten und erneut versuchen.","auth/network-request-failed":"Keine Verbindung zum Server.","auth/popup-closed-by-user":"Die Anmeldung wurde abgebrochen.","auth/cancelled-popup-request":"Die Anmeldung wurde abgebrochen.","auth/unauthorized-domain":"Diese Internetadresse ist in Firebase noch nicht freigegeben (Authentication → Einstellungen → Autorisierte Domains).","auth/operation-not-allowed":"Diese Anmeldeart ist in Firebase noch nicht eingeschaltet.","auth/missing-password":"Bitte ein Passwort eingeben.","auth/missing-email":"Bitte eine E-Mail-Adresse eingeben."};
const errTxt=(e)=>ERR[e&&e.code]||("Das hat nicht geklappt"+(e&&(e.code||e.message)?" ("+(e.code||e.message)+")":"")+".");
let ov=null,OVSUB="Nur für das Trainerteam",LINTRO="";
function overlay(html){
  if(!document.getElementById("u13css")){const st=document.createElement("style");st.id="u13css";st.textContent=CSS;document.head.appendChild(st)}
  if(!ov){ov=document.createElement("div");ov.id="u13login";(document.body||document.documentElement).appendChild(ov)}
  ov.innerHTML='<div class="lc"><h1>TuS Haltern · Teamzentrale</h1><p class="sb">'+OVSUB+'</p>'+html+"</div>";return ov;
}
const hideOverlay=()=>{if(ov){ov.remove();ov=null}};
function showSetup(){overlay('<div class="ms er" style="font-size:15px">Die Verbindung zu Firebase ist noch nicht eingerichtet.</div><p class="sb">Bitte die Datei <b>firebase-config.js</b> mit den Werten aus dem Firebase-Projekt ausfüllen (siehe Anleitung) und die Dateien erneut hochladen.</p>')}
function showDenied(email){
  const o=overlay('<div class="ms er" style="font-size:15px">Dieses Konto ist nicht freigegeben.</div><p class="sb">Angemeldet als <b>'+E(email)+'</b>. Zugriff haben nur Personen, die der Besitzer unter Einstellungen → Mannschaft → „Zugang zur App“ freigegeben hat.</p><p class="sb">Spieler und Eltern: Bitte öffnet den Link, den ihr vom Trainer bekommen habt.</p><button id="u13so">Abmelden</button>');
  o.querySelector("#u13so").onclick=()=>signOutClean();
}
function showVerify(user){
  return new Promise((res)=>{
    const o=overlay('<p>Bitte die E-Mail-Adresse <b>'+E(user.email)+'</b> bestätigen. Wir haben dir dazu eine Nachricht geschickt (auch im Spam-Ordner nachsehen).</p><div class="ms" id="vm"></div><button class="pr" id="vok">Ich habe bestätigt</button><button id="vre">Nachricht noch einmal senden</button><button class="ln" id="vso">Abmelden</button>'),m=o.querySelector("#vm");
    o.querySelector("#vok").onclick=async()=>{try{await user.reload();if(auth.currentUser&&auth.currentUser.emailVerified){await auth.currentUser.getIdToken(true);res()}else{m.className="ms er";m.textContent="Noch nicht bestätigt. Bitte zuerst auf den Link in der E-Mail klicken."}}catch(e){m.className="ms er";m.textContent=errTxt(e)}};
    o.querySelector("#vre").onclick=async()=>{try{await user.sendEmailVerification();m.className="ms ok";m.textContent="Gesendet."}catch(e){m.className="ms er";m.textContent=errTxt(e)}};
    o.querySelector("#vso").onclick=()=>signOutClean();
  });
}
function showLogin(){
  return new Promise((res)=>{
    const o=overlay(LINTRO+'<button class="pr" id="lg">Mit Google anmelden</button><div class="or">oder mit E-Mail</div><input id="le" type="email" autocomplete="username" placeholder="E-Mail" inputmode="email"><input id="lp" type="password" autocomplete="current-password" placeholder="Passwort"><label class="note" style="display:flex;gap:8px;align-items:flex-start;margin:6px 0 10px;font-size:12.5px"><input type="checkbox" id="lsh" style="width:auto;margin:3px 0 0"><span>Gemeinsames Gerät (Schule, Verein, fremdes Gerät): nichts auf diesem Gerät speichern</span></label><div class="ms" id="lm"></div><button class="pr" id="li">Anmelden</button><button id="lr">Konto anlegen</button><button class="ln" id="lf">Passwort vergessen?</button>'),m=o.querySelector("#lm"),em=o.querySelector("#le"),pw=o.querySelector("#lp");
    const msg=(t,k)=>{m.className="ms"+(k?" "+k:"");m.textContent=t||""};
    const busy=(b)=>o.querySelectorAll("button").forEach((x)=>{x.disabled=b});
    const run=async(f)=>{busy(true);msg("");try{await f()}catch(e){msg(errTxt(e),"er")}busy(false)};
    o.querySelector("#lg").onclick=()=>run(async()=>{const p=new fb.auth.GoogleAuthProvider();try{await auth.signInWithPopup(p)}catch(e){if(e&&(e.code==="auth/popup-blocked"||e.code==="auth/operation-not-supported-in-this-environment")){await auth.signInWithRedirect(p);return}throw e}});
    o.querySelector("#li").onclick=()=>run(async()=>{await auth.signInWithEmailAndPassword(em.value.trim(),pw.value)});
    o.querySelector("#lr").onclick=()=>run(async()=>{if(pw.value.length<10){msg("Bitte ein Passwort mit mindestens 10 Zeichen wählen (am besten mehrere Wörter).","er");return}const c=await auth.createUserWithEmailAndPassword(em.value.trim(),pw.value);try{await c.user.sendEmailVerification()}catch(e){}});
    o.querySelector("#lf").onclick=()=>run(async()=>{if(!em.value.trim()){msg("Bitte oben die E-Mail-Adresse eintragen.","er");return}await auth.sendPasswordResetEmail(em.value.trim());msg("Nachricht zum Zurücksetzen wurde gesendet.","ok")});
    pw.addEventListener("keydown",(e)=>{if(e.key==="Enter")o.querySelector("#li").click()});
    const sh=o.querySelector("#lsh");sh.checked=SHARED;sh.onchange=()=>{try{sh.checked?localStorage.setItem("u13shared","1"):localStorage.removeItem("u13shared")}catch(e){}location.reload()};
    try{if(sessionStorage.getItem("u13expired")){sessionStorage.removeItem("u13expired");msg("Aus Sicherheitsgründen bitte neu anmelden.","ok")}}catch(e){}
    const un=auth.onAuthStateChanged((u)=>{if(u){un();res()}});
  });
}
const needsVerify=(u)=>u&&!u.emailVerified&&(u.providerData||[]).every((p)=>p&&p.providerId==="password");
function firstUser(){return new Promise((res)=>{const un=auth.onAuthStateChanged((u)=>{un();res(u)})})}

/* ---------- Datenbank-Hülle: gleiche Aufrufe wie in der Artifact-Umgebung ---------- */
const noWrite=()=>window.__ROLE==="lesen"?Promise.reject({code:"permission-denied"}):null;
function docW(ref){return{get:()=>ref.get(),set:(d)=>noWrite()||ref.set(clean(d)),update:(d)=>noWrite()||ref.update(clean(d)),delete:()=>noWrite()||ref.delete(),onSnapshot:(a,b)=>ref.onSnapshot(a,b),collection:(n)=>colW(ref.collection(n))}}
function colW(ref){return{get:()=>ref.get(),onSnapshot:(a,b)=>ref.onSnapshot(a,b),doc:(id)=>docW(ref.doc(id))}}
const wrap=()=>({collection:(n)=>colW(fs.collection(n)),doc:(p)=>docW(fs.doc(p))});

async function start(){
  if(!cfgOk()){showSetup();return new Promise(()=>{})}
  try{
    for(const f of["firebase-app-compat.js","firebase-auth-compat.js","firebase-firestore-compat.js"])await loadScript(SDK+f);
  }catch(e){overlay('<div class="ms er">Die Firebase-Bausteine konnten nicht geladen werden. Bitte die Internetverbindung prüfen und die Seite neu laden.</div>');return new Promise(()=>{})}
  fb=window.firebase;fb.initializeApp(CFG);auth=fb.auth();fs=fb.firestore();
  if(SHARED){try{await auth.setPersistence(fb.auth.Auth.Persistence.SESSION)}catch(e){}try{await fs.clearPersistence()}catch(e){}}
  else{try{await fs.enablePersistence({synchronizeTabs:true})}catch(e){}}
  let u=await firstUser();
  if(!u){await showLogin();u=auth.currentUser}
  if(needsVerify(u)){try{await u.reload()}catch(e){}u=auth.currentUser;if(needsVerify(u)){await showVerify(u);u=auth.currentUser}}
  /* Zugriffstest; bei leerer Datenbank ein Grundgerüst anlegen, damit die Sicherung eingespielt werden kann */
  try{
    const c=await fs.doc("config/main").get();
    if(!c.exists){await fs.doc("config/main").set({saison:"2026/27"})}
  }catch(e){
    if(e&&/permission|denied|insufficient/i.test(String(e.code)+" "+String(e.message))){
      /* Kein Trainer: hat die Person ein Konto für Spieler/Eltern (verknüpft oder Anfrage offen), geht es zu ihrer Ansicht */
      if(await kontoHas()){location.replace(location.pathname+location.search+"#konto");setTimeout(()=>location.reload(),50);return new Promise(()=>{})}
      showDenied(u&&u.email);return new Promise(()=>{})}
    /* offline: weiter, die Daten kommen aus dem Gerätespeicher */
  }
  hideOverlay();addSignOut();window.__webFs=fs;
  await afterLogin();
  return wrap();
}
/* ---------- Nach der Anmeldung: Rolle, Scouting-Schlüssel, Zugangsliste ---------- */
let scoutKey="";
const rndKey=()=>{const a=new Uint8Array(18);crypto.getRandomValues(a);return btoa(String.fromCharCode.apply(null,a)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"")};
const denied=(e)=>!!(e&&/permission|denied|insufficient/i.test(String(e.code)+" "+String(e.message)));
async function afterLogin(){
  let owner=null;
  try{await fs.doc("ownercheck/x").get();owner=true}catch(e){if(denied(e))owner=false}
  try{if(owner===null)owner=localStorage.getItem("u13role")==="owner";else if(!SHARED)localStorage.setItem("u13role",owner?"owner":"co")}catch(e){if(owner===null)owner=false}
  window.__webOwner=owner;
  let role="voll";
  if(!owner){
    try{const em=((auth.currentUser&&auth.currentUser.email)||"").toLowerCase(),me=await fs.doc("trainer/"+em).get();role=(me.exists&&me.data()&&me.data().rolle)||"voll";if(!SHARED)try{localStorage.setItem("u13rolle",role)}catch(e){}}
    catch(e){try{role=localStorage.getItem("u13rolle")||"lesen"}catch(x){role="lesen"}}
  }
  window.__ROLE=owner?"voll":role;window.__ACCT=(((auth.currentUser&&auth.currentUser.email)||"")+"").toLowerCase().replace(/[^a-z0-9@._-]/g,"_")||"main";
  if(!owner)document.body.classList.add("co");
  instCard();
  if(window.__ROLE!=="scout")pushCard();
  if(window.__ROLE==="scout")document.body.classList.add("scoutonly");
  if(window.__ROLE==="lesen"||window.__ROLE==="scout"){const t=document.querySelector(".top .note");if(t){const sp=document.createElement("span");sp.style.marginLeft="8px";sp.textContent=window.__ROLE==="lesen"?"· Nur Ansicht":"· Scouting-Zugang";t.appendChild(sp)}}
  if(window.__ROLE==="scout"){window.__scoutLink=()=>"(nur für Trainer sichtbar)";return}
  if(window.__ROLE==="lesen"){try{const r=await fs.doc("config/scout").get();scoutKey=(r.exists&&r.data()&&r.data().k)||""}catch(e){}window.__scoutLink=()=>scoutKey?window.__WEB_BASE+"#scout."+scoutKey:"(nicht verfügbar)";return}
  try{const r=await fs.doc("config/scout").get();let k=r.exists&&r.data()&&r.data().k;if(!k){k=rndKey();await fs.doc("config/scout").set({k})}scoutKey=k}catch(e){}
  window.__scoutLink=()=>scoutKey?window.__WEB_BASE+"#scout."+scoutKey:"";window.__scoutNew=true;
  let last=null;
  fs.doc("config/main").onSnapshot((d)=>{const aus=!!(d.exists&&d.data()&&d.data().kaderAus);if(aus===last)return;const first=last===null;last=aus;
    const w=()=>fs.doc("pub/scout").set({aus}).catch(()=>{});
    if(first)fs.doc("pub/scout").get().then((x)=>{if(!x.exists||!!(x.data()&&x.data().aus)!==aus)w()}).catch(()=>{});else w()},()=>{});
  document.addEventListener("click",async(ev)=>{const b=ev.target.closest&&ev.target.closest("[data-scn]");if(!b)return;
    if(!b.dataset.arm){b.dataset.arm="1";b.textContent="Wirklich neu erzeugen?";return}
    const k=rndKey();try{await fs.doc("config/scout").set({k});scoutKey=k;const i=document.getElementById("sclink");if(i)i.value=window.__scoutLink();b.dataset.arm="";b.textContent="Neu erzeugen";document.dispatchEvent(new Event("u13scoutkey"))}catch(e){b.textContent="Hat nicht geklappt"}});
  if(owner)cards();
}
/* Hinweis „Als App installieren“ unter Einstellungen → Hinweise & Links (für alle Angemeldeten, auch eingeschränkte Ansicht) */
function instCard(){
  const put=()=>{
    const pp=document.getElementById("etp-l");if(!pp){setTimeout(put,500);return}
    if(!document.getElementById("u13inst")){
      const c=document.createElement("div");c.className="card";c.id="u13inst";c.style.display="block";
      const done=STANDALONE();
      c.innerHTML='<h3>Als App installieren</h3>'+(done?'<p class="note" style="margin-top:0">Die App ist auf diesem Gerät schon installiert.</p>':'<p class="note" style="margin-top:0">Dann liegt die Teamzentrale wie eine normale App auf dem Startbildschirm, öffnet in einem eigenen Fenster und startet auch ohne Netz. Daten und Updates bleiben dieselben wie im Browser.</p><button class="btn" id="u13instb" style="display:none;margin:4px 0 8px">App jetzt installieren</button><ul style="margin:6px 0 6px 20px;padding:0"><li><b>iPhone/iPad:</b> in Safari unten auf <b>Teilen</b> (Quadrat mit Pfeil) → <b>Zum Home-Bildschirm</b>.</li><li><b>Android:</b> in Chrome oben rechts auf <b>⋮</b> → <b>App installieren</b> (oder „Zum Startbildschirm hinzufügen“).</li><li><b>Mac/PC:</b> in Chrome oder Edge rechts in der Adresszeile auf das Symbol <b>Installieren</b>. In Safari auf dem Mac: <b>Ablage</b> → <b>Zum Dock hinzufügen</b>.</li></ul><p class="note">Ohne Netz kannst du ansehen und ändern. Die Änderungen werden geschickt, sobald wieder Netz da ist. Anmelden und Spielerlinks brauchen Netz. Auf einem gemeinsam genutzten Gerät wird nichts gespeichert, dort geht es nur mit Netz.</p>');
      const b=c.querySelector("#u13instb"),show=()=>{if(b&&instEv)b.style.display=""};show();window.addEventListener("u13inst",show);
      if(b)b.onclick=async()=>{const ev=instEv;if(!ev)return;instEv=null;b.style.display="none";try{await ev.prompt()}catch(e){}};
      pp.appendChild(c);
    }
  };put();
}
/* Hinweis „Als App speichern“ in der Link-Ansicht (nicht in der installierten App): zuerst oben mit Anleitung; ausgeblendet wandert er zugeklappt nach unten */
const STANDALONE=()=>!!(window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true;
const VSTEP={ios:["iPhone/iPad","Unten auf <b>Teilen</b> tippen (Quadrat mit Pfeil nach oben).","Nach unten wischen und <b>Zum Home-Bildschirm</b> wählen.","Oben rechts auf <b>Hinzufügen</b> tippen."],
  android:["Android","In Chrome oben rechts auf <b>⋮</b> tippen.","<b>App installieren</b> wählen (oder „Zum Startbildschirm hinzufügen“).","Mit <b>Installieren</b> bestätigen."],
  pc:["Computer","In Chrome oder Edge rechts in der Adresszeile auf das Symbol <b>Installieren</b> klicken.","Mit <b>Installieren</b> bestätigen.","In Safari auf dem Mac stattdessen: <b>Ablage</b> → <b>Zum Dock hinzufügen</b>."]};
function viewerInstall(){
  if(STANDALONE())return;
  const dev=IOS?"ios":/Android/i.test(navigator.userAgent)?"android":"pc",gone=()=>{try{return localStorage.getItem("u13vinstx")==="1"}catch(e){return false}};
  /* Terminplan-Link (planOnly in links.js setzt data-plan): kein Spieler-Hinweis oben, keine Benachrichtigungen, kein Passwort */
  const plan=()=>{const v=document.getElementById("vw2");return!!(v&&v.dataset.plan)};
  const ol=(k)=>'<ol style="margin:6px 0 6px 20px;padding:0">'+VSTEP[k].slice(1).map((t)=>"<li>"+t+"</li>").join("")+(plan()?"":"<li>Die App auf dem Startbildschirm öffnen und oben auf <b>Einschalten</b> (Benachrichtigungen) tippen.</li>")+"</ol>";
  /* Eltern: Rolle aus dem Konto (steht schon vor dem Aufbau der Ansicht fest), sonst wie bisher über die Benachrichtigungen */
  const eltern=()=>{const K=window.__KONTO;if(K&&K.cur)return K.cur.rolle==="eltern";const c=window.__pushCtx&&window.__pushCtx();return!!c&&c.ro==="e"};
  const body=()=>(plan()?'<p style="margin:4px 0 6px;font-size:14.5px">Wer mag, kann den Terminplan als App speichern. Dann öffnet er sich mit einem Tipp vom Startbildschirm.</p>'
      :eltern()?'<p style="margin:4px 0 6px;font-size:14.5px">Für Eltern ist das freiwillig. Wer mag, kann die Seite als App speichern und dort die Benachrichtigungen einschalten, zum Beispiel für Antworten vom Trainer und neue Hinweise.</p>'
      :'<p style="margin:4px 0 6px;font-size:14.5px"><b>Für Spieler: Bitte speichere diese Seite als App auf deinem Handy und schalte danach in der App die Benachrichtigungen ein.</b> Nur dann bekommst du Bescheid, wenn es einen neuen Clip, einen neuen Hinweis, eine Erinnerung an eine Aufgabe oder eine Antwort vom Trainer gibt, auch wenn die App geschlossen ist. Danke!</p><p class="note" style="margin:0 0 6px">Eltern brauchen die App nicht unbedingt, können sie aber natürlich auch speichern.</p>')+'<p class="note" style="margin:0 0 6px">Außerdem öffnest du die Seite dann mit einem Tipp vom Startbildschirm, auch ohne Netz (letzter Stand). Die App zeigt genau das, was du hier siehst.</p><button class="btn" data-vib style="display:none;margin:2px 0 8px">App jetzt installieren</button><b style="font-size:14px">So geht’s ('+VSTEP[dev][0]+'):</b>'+ol(dev)
    +'<details style="margin:4px 0"><summary class="note" style="cursor:pointer">Anleitung für andere Geräte</summary>'+["ios","android","pc"].filter((k)=>k!==dev).map((k)=>'<b style="font-size:13px">'+VSTEP[k][0]+'</b>'+ol(k)).join("")+"</details>"
    +(plan()?"":isKurz?'<p class="note" style="margin:4px 0 0">Beim ersten Öffnen der App einmal das Passwort eingeben und „Auf diesem Gerät angemeldet bleiben“ anhaken.</p>':"")+(isKonto?'<p class="note" style="margin:4px 0 0">In der App meldest du dich einmal mit deinem Konto an. Diese Anleitung findest du auch jederzeit unter <b>Einstellungen</b>.</p>':plan()?"":'<p class="note" style="margin:4px 0 0">Den Link bitte nicht weitergeben. Er gehört nur dir.</p>');
  const wire=(c)=>{const b=c.querySelector("[data-vib]"),show=()=>{if(instEv)b.style.display=""};show();window.addEventListener("u13inst",show);
    b.onclick=async()=>{const ev=instEv;if(!ev)return;instEv=null;b.style.display="none";try{await ev.prompt()}catch(e){}}};
  const top=()=>{const c=document.createElement("div");c.id="u13vinst";c.className="card";c.style.cssText="margin:0 0 14px;border-color:var(--ac,#2563eb)";
    c.innerHTML='<div style="display:flex;gap:8px;align-items:flex-start"><b style="flex:1;font-size:16px">📲 Spieler: Bitte als App speichern</b><button type="button" class="xcl" data-vix style="position:static;flex:none;margin:-5px -6px 0 0" aria-label="Ausblenden" title="Ausblenden">✕</button></div>'+body();
    wire(c);c.querySelector("[data-vix]").onclick=()=>{try{localStorage.setItem("u13vinstx","1")}catch(e){}c.remove();put()};return c};
  const low=()=>{const c=document.createElement("details");c.id="u13vinst";c.className="card";c.style.cssText="margin:14px 0 0";
    c.innerHTML='<summary style="cursor:pointer;font-weight:600"><span style="display:inline-flex;gap:8px;align-items:center;width:calc(100% - 24px)"><span style="flex:1">📲 Als App auf dem Handy speichern'+(eltern()||plan()?" (freiwillig)":"")+'</span><button type="button" class="xcl" data-vioff style="position:static;flex:none;margin:-5px 0" aria-label="Ausblenden" title="Ausblenden">✕</button></span></summary>'+body();wire(c);
    c.querySelector("[data-vioff]").onclick=(e)=>{e.preventDefault();e.stopPropagation();try{localStorage.setItem("u13vinstx","2")}catch(x){}c.remove()};return c};
  const off=()=>{try{return localStorage.getItem("u13vinstx")==="2"}catch(e){return false}};   /* ganz ausgeblendet */
  const bottom=(v,el)=>{const f=v.querySelector(":scope>.vf");if(f)v.insertBefore(el,f);else v.appendChild(el)};   /* „Stand“ bleibt ganz unten */
  const put=()=>{const v=document.getElementById("vw2");if(!v||off())return;
    const was=document.getElementById("u13vinst");if(was){if(was.tagName==="DETAILS"||!(eltern()||plan()))return;was.remove()}   /* Rolle erst später bekannt: oberen Hinweis wieder wegnehmen */
    if(gone()||eltern()||plan()){bottom(v,low());return}
    const hd=v.querySelector(".vh");if(!hd)return;   /* erst wenn die Ansicht da ist (nicht auf der Passwortseite) */
    const kf=document.getElementById("kzf"),at=kf&&kf.parentNode===v?kf:hd;at.insertAdjacentElement("afterend",top())};
  new MutationObserver(put).observe(document.documentElement,{childList:true,subtree:true});put();
}
if(isViewerHash&&!VS)document.addEventListener("DOMContentLoaded",viewerInstall);
/* ---------- Benachrichtigungen (Web-Push) ----------
   Das Gerät meldet sich unter einem geheimen Pfad an (push/<64 Zeichen>), abgesichert mit dem Feedback-Schlüssel aus Link bzw. App.
   Verschickt wird von einem Zeitplan bei GitHub alle paar Minuten (siehe push/LIESMICH.md). Die Nachrichten enthalten keine Namen.
   Spielerlinks: nur in der installierten App (iPhone kann es nur dort). Trainer: Einstellungen → Hinweise & Links. */
const VAPID="BA1CPAVyJeqOF8ANijTZ6ykGbY4n_gXJMExX4VKQslCF_ES6SJ_ZFJGpQWYDuhbTiSMT_fqGmb_xMy0g3gZFO04";
const PUSH_OK=()=>"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
const pls={get:(k)=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}};
const pushSid=()=>{let s=pls.get("u13push");if(!/^[0-9a-f]{64}$/.test(s||"")){const a=new Uint8Array(32);crypto.getRandomValues(a);s=Array.from(a,(x)=>x.toString(16).padStart(2,"0")).join("");pls.set("u13push",s)}return s};
const pushPerm=()=>{try{return Notification.permission}catch(e){return"default"}};
const u8=(s)=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")+"===".slice((s.length+3)%4)),(c)=>c.charCodeAt(0));
async function pushSub(ask){
  if(ask&&pushPerm()!=="granted"&&await Notification.requestPermission()!=="granted")return null;
  if(pushPerm()!=="granted")return null;
  const reg=await navigator.serviceWorker.ready,old=await reg.pushManager.getSubscription();
  return old||(ask?reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:u8(VAPID)}):null);
}
/* Anmeldung speichern: Trainer über die Datenbank-Verbindung, Links ohne Anmeldung direkt */
async function pushSave(sub,c){
  const j=sub.toJSON?sub.toJSON():sub,ky=j.keys||{},sid=pushSid(),o={e:j.endpoint,p:ky.p256dh||"",a:ky.auth||"",k:c.k,pid:c.pid||"",ro:c.ro||"",r:c.r||"",at:Date.now()};
  if(c.ro==="t"&&fs){await fs.doc("push/"+sid).set(o);return}
  const f={};Object.keys(o).forEach((x)=>{f[x]=toFs(o[x])});
  const r=await fetch(FSB()+"push/"+sid+"?key="+encodeURIComponent(CFG.apiKey),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({fields:f})});
  if(!r.ok)throw{code:"http-"+r.status};
}
/* c: Feedback-Schlüssel k, Spieler pid, Rolle ro (s Spieler, e Elternteil, t Trainer), Antwort-Pfad r */
const pushApi={
  on:()=>pls.get("u13pushon")==="1",
  async enable(c){const s=await pushSub(true);if(!s)return pushPerm()==="denied"?"denied":"no";await pushSave(s,c);pls.set("u13pushon","1");return"ok"},
  async disable(c){pls.set("u13pushon",null);pls.set("u13pushx","1");try{const reg=await navigator.serviceWorker.ready,s=await reg.pushManager.getSubscription();if(s)await s.unsubscribe()}catch(e){}
    const sid=pushSid();try{if(c.ro==="t"&&fs)await fs.doc("push/"+sid).delete();else await fetch(FSB()+"push/"+sid+"?key="+encodeURIComponent(CFG.apiKey),{method:"DELETE"})}catch(e){}},
  /* beim Öffnen: Anmeldung auffrischen (Rolle oder Adresse des Geräts können sich ändern) */
  async sync(c){if(!pushApi.on())return;try{const s=await pushSub(false);if(s)await pushSave(s,c);else pls.set("u13pushon",null)}catch(e){}}
};
const pushMsg=(r)=>r==="denied"?"Benachrichtigungen wurden nicht erlaubt. Du kannst sie in den Einstellungen des Geräts erlauben.":"Das hat nicht geklappt. Bitte später noch einmal versuchen.";
function viewerPush(){
  const ctx=()=>window.__pushCtx&&window.__pushCtx();
  let synced=false;
  const put=()=>{
    const v=document.getElementById("vw2"),c=ctx();if(!v||!c||!c.k||!STANDALONE()||!PUSH_OK())return;
    const hd=v.querySelector(".vh");if(!hd)return;
    if(!synced){synced=true;pushApi.sync(c).then(put)}
    const x=pls.get("u13pushx")||"",later=/^s\d+$/.test(x)&&Date.now()-+x.slice(1)<7*864e5;   /* „Später“: Bitte erst nach 7 Tagen wieder oben */
    const st=pushApi.on()?"an":pushPerm()==="denied"?"zu":x==="1"||later||c.ro==="e"?"aus":"frage",old=document.getElementById("u13push");
    if(old&&old.dataset.st===st)return;if(old)old.remove();
    const el=document.createElement("div");el.id="u13push";el.className="card";el.dataset.st=st;
    if(st==="frage"){el.style.cssText="margin:0 0 14px;border-color:var(--ac,#2563eb)";
      el.innerHTML='<b style="font-size:16px">🔔 Bitte Benachrichtigungen einschalten</b><p class="note" style="margin:4px 0 8px">Dann bekommst du Bescheid, wenn es einen neuen Clip, einen neuen Hinweis, eine Erinnerung an eine Aufgabe oder eine Antwort vom Trainer gibt, auch wenn die App geschlossen ist. In den Nachrichten stehen keine Namen.</p><div class="bar"><button class="btn" data-pon style="background:var(--ac,#2563eb);color:#fff;border-color:var(--ac,#2563eb);font-weight:600;min-height:44px">Einschalten</button><button class="btn" data-plater style="min-height:44px">Später</button></div><div class="note" style="margin-top:6px">Einschalten geht auch später jederzeit: ganz unten in der App.</div><div class="note warn" data-pm></div>';
      const kf=document.getElementById("kzf");(kf&&kf.parentNode===v?kf:hd).insertAdjacentElement("afterend",el)}
    else{el.style.cssText="margin:14px 0 0";
      el.innerHTML=st==="zu"?'<div class="note">🔕 Benachrichtigungen sind auf diesem Gerät blockiert. Du kannst sie in den Einstellungen des Handys erlauben (iPhone: Einstellungen → Mitteilungen → diese App → Mitteilungen erlauben). Danach die App neu öffnen.</div>'
        :'<div class="bar" style="align-items:center"><span style="flex:1">'+(st==="an"?"🔔 Benachrichtigungen sind an.":"🔕 Benachrichtigungen sind aus. Hier kannst du sie jederzeit einschalten.")+'</span><button class="btn" '+(st==="an"?"data-poff>Ausschalten":"data-pon>Einschalten")+'</button></div><div class="note warn" data-pm></div>';
      {const f=v.querySelector(":scope>.vf");if(f)v.insertBefore(el,f);else v.appendChild(el)}}
  };
  document.addEventListener("click",async(e)=>{const t=e.target.closest&&e.target.closest("#u13push button");if(!t)return;const c=ctx();if(!c)return;
    if(t.hasAttribute("data-plater")){pls.set("u13pushx","s"+Date.now());put();return}
    t.disabled=true;
    if(t.hasAttribute("data-poff")){await pushApi.disable(c);put();return}
    let r;try{r=await pushApi.enable(c)}catch(x){r="fehler"}
    if(r!=="ok"){const m=document.querySelector("#u13push [data-pm]");if(m)m.textContent=pushMsg(r);t.disabled=false}
    put()});
  new MutationObserver(put).observe(document.documentElement,{childList:true,subtree:true});put();
}
if(isViewerHash)document.addEventListener("DOMContentLoaded",viewerPush);
/* Trainer: Karte unter Einstellungen → Hinweise & Links (neues Feedback) */
function pushCard(){
  const key=()=>(window.__vid&&window.__vid.fbKey)||"";
  const put=()=>{
    const pp=document.getElementById("etp-l");if(!pp){setTimeout(put,500);return}
    let c=document.getElementById("u13pushc");
    if(!c){c=document.createElement("div");c.className="card";c.id="u13pushc";c.style.display="block";const i=document.getElementById("u13inst");if(i&&i.parentNode===pp)i.insertAdjacentElement("afterend",c);else pp.appendChild(c)}
    const st=!PUSH_OK()?"nein":IOS&&!STANDALONE()?"ios":!key()?"warte":pushApi.on()?"an":pushPerm()==="denied"?"zu":"aus";
    if(c.dataset.st===st)return;c.dataset.st=st;
    c.innerHTML='<h3>Benachrichtigungen</h3><p class="note" style="margin-top:0">Du bekommst eine Nachricht aufs Handy oder den Computer, wenn Spieler oder Eltern dir Feedback schicken, auch wenn die App geschlossen ist. Spieler und Eltern schalten es in ihrer Link-App selbst ein und bekommen dann Bescheid bei neuen Clips, Erinnerungen an Aufgaben und Antworten. In den Nachrichten stehen keine Namen. Sie kommen nach etwa 5 bis 15 Minuten.</p>'
      +(st==="nein"?'<p class="note">Dieser Browser kann keine Benachrichtigungen empfangen.</p>'
      :st==="ios"?'<p class="note"><b>Auf dem iPhone und iPad geht das nur in der App vom Home-Bildschirm.</b> Bitte zuerst als App installieren (siehe oben) und dort einschalten.</p>'
      :st==="warte"?'<p class="note">Wird vorbereitet …</p>'
      :st==="zu"?'<p class="note warn">Benachrichtigungen sind auf diesem Gerät blockiert. Bitte in den Einstellungen des Geräts für diese App erlauben.</p>'
      :'<div class="bar" style="align-items:center"><span style="flex:1">'+(st==="an"?"🔔 Auf diesem Gerät eingeschaltet.":"🔕 Auf diesem Gerät aus.")+'</span><button class="btn" id="u13pushb">'+(st==="an"?"Ausschalten":"Einschalten")+'</button></div><div class="note warn" id="u13pushm"></div>');
    const b=c.querySelector("#u13pushb");
    if(b)b.onclick=async()=>{b.disabled=true;const cx={k:key(),ro:"t"};let r="ok";
      if(st==="an")await pushApi.disable(cx);else{try{r=await pushApi.enable(cx)}catch(e){r="fehler"}}
      if(r!=="ok"){c.querySelector("#u13pushm").textContent=pushMsg(r);b.disabled=false;return}
      c.dataset.st="";put()};
    if(st==="warte")setTimeout(put,1000);
  };put();
  const syn=()=>{if(!key()){setTimeout(syn,1500);return}pushApi.sync({k:key(),ro:"t"}).then(()=>{const c=document.getElementById("u13pushc");if(c)c.dataset.st="";put()})};if(PUSH_OK())syn();
}
let instEv=null;   /* Installations-Angebot des Browsers (Chrome/Edge/Android), siehe unten */
function cards(){
  const put=()=>{
    const m=document.getElementById("etp-m"),sv=document.getElementById("etp-s");if(!m||!sv){setTimeout(put,500);return}
    if(!document.getElementById("u13acc")){
      const c=document.createElement("div");c.className="card";c.id="u13acc";
      c.innerHTML='<h3>Zugang zur App</h3><p class="note" style="margin-top:0">Wer die App nach der Anmeldung (Google oder E-Mail) öffnen darf. Du und Mathis sind fest eingetragen. Weitere Personen trägst du hier ein. Sie müssen sich mit genau dieser E-Mail-Adresse anmelden und sehen die Mannschafts- und Sicherungs-Einstellungen nicht.</p><p class="note"><b>Voller Zugriff:</b> sehen und ändern wie ein Co-Trainer. <b>Nur lesen:</b> alles ansehen, nichts ändern. <b>Nur Scouting:</b> sieht und bearbeitet nur den Kader (Beobachtungen, Eingang, Spieler), nicht die Mannschaft.</p><div id="u13accl"></div><div class="bar" style="margin:8px 0 0"><input id="u13acce" type="email" placeholder="E-Mail-Adresse" autocomplete="off" style="flex:1;min-width:200px"><select id="u13accr" aria-label="Zugriff"><option value="voll">Voller Zugriff</option><option value="lesen">Nur lesen</option><option value="scout">Nur Scouting</option></select><button class="btn" id="u13acca">Hinzufügen</button></div><div class="note" id="u13accm"></div>';
      m.appendChild(c);
      const L=c.querySelector("#u13accl"),M=c.querySelector("#u13accm");
      fs.collection("trainer").onSnapshot((q)=>{const rows=q.docs.map((d)=>({id:d.id,r:(d.data()&&d.data().rolle)||"voll"})).sort((a,b)=>a.id<b.id?-1:1);
        L.innerHTML=rows.length?rows.map((x)=>'<div class="bar" style="margin:4px 0"><span style="flex:1;min-width:0;overflow-wrap:anywhere">'+E(x.id)+'</span><select data-acr="'+E(x.id)+'" aria-label="Zugriff"><option value="voll"'+(x.r==="voll"?" selected":"")+'>Voller Zugriff</option><option value="lesen"'+(x.r==="lesen"?" selected":"")+'>Nur lesen</option><option value="scout"'+(x.r==="scout"?" selected":"")+'>Nur Scouting</option></select><button class="btn" data-acd="'+E(x.id)+'">Entfernen</button></div>').join(""):'<div class="note">Noch keine weiteren Personen.</div>'},()=>{L.innerHTML='<div class="note">Liste konnte nicht geladen werden.</div>'});
      c.addEventListener("change",async(ev)=>{const r=ev.target.closest&&ev.target.closest("[data-acr]");if(!r)return;
        try{await fs.doc("trainer/"+r.dataset.acr).set({email:r.dataset.acr,rolle:r.value,am:new Date().toISOString()});M.className="note";M.textContent="Zugriff geändert. Gilt beim nächsten Öffnen der App durch die Person."}catch(e){M.className="note warn";M.textContent="Das konnte nicht gespeichert werden (nur der Besitzer darf das)."}});
      c.addEventListener("click",async(ev)=>{
        const d=ev.target.closest("[data-acd]");
        if(d){if(!d.dataset.arm){d.dataset.arm="1";d.textContent="Wirklich entfernen?";return}try{await fs.doc("trainer/"+d.dataset.acd).delete();M.className="note";M.textContent="Entfernt. Die Person kommt ab sofort nicht mehr hinein."}catch(e){M.className="note warn";M.textContent="Das konnte nicht gespeichert werden (nur der Besitzer darf das)."}return}
        if(ev.target.id==="u13acca"){const i=c.querySelector("#u13acce"),mail=i.value.trim().toLowerCase();
          if(!/^[^\s@\/]+@[^\s@\/]+\.[^\s@\/]+$/.test(mail)){M.className="note warn";M.textContent="Bitte eine gültige E-Mail-Adresse eintragen.";return}
          try{await fs.doc("trainer/"+mail).set({email:mail,rolle:c.querySelector("#u13accr").value,am:new Date().toISOString()});i.value="";M.className="note";M.textContent="Hinzugefügt. Die Person kann sich jetzt anmelden."}catch(e){M.className="note warn";M.textContent="Das konnte nicht gespeichert werden (nur der Besitzer darf das)."}}});
    }
    if(!document.getElementById("u13upd")){
      const c=document.createElement("div");c.className="card";c.id="u13upd";
      c.innerHTML='<h3>Update der App einspielen (GitHub)</h3><p class="note" style="margin-top:0">Nur nötig, wenn Claude dir eine neue ZIP-Datei gibt. Löschen musst du nichts: Gleichnamige Dateien werden beim Hochladen ersetzt.</p><ol style="margin:6px 0 6px 20px;padding:0"><li>Neue ZIP-Datei auf dem Computer entpacken.</li><li>Auf github.com das Repository öffnen → <b>Add file</b> → <b>Upload files</b>.</li><li>Alle Dateien aus dem entpackten Ordner in das Fenster ziehen (den <b>Inhalt</b>, nicht den Ordner selbst; <b>index.html</b> muss ganz oben im Repository liegen, nicht in einem Unterordner).</li><li>Unten <b>Commit changes</b> klicken.</li><li>1–3 Minuten warten (Reiter <b>Actions</b>: grüner Haken). Dann die App neu laden, am iPad und Handy gegebenenfalls zweimal.</li><li>Nur wenn Claude es ausdrücklich sagt: <b>firestore.rules</b> in Firebase unter Firestore → Regeln einfügen und <b>Veröffentlichen</b>.</li></ol><p class="note" style="margin-bottom:0">Deine Daten bleiben bei einem Update unverändert.</p>';
      const sw=document.getElementById("swc");if(sw&&sw.parentNode===sv)sv.insertBefore(c,sw);else sv.appendChild(c);
    }
  };put();
}
function addSignOut(){
  const put=()=>{if(!document.getElementById("u13css")){const st=document.createElement("style");st.id="u13css";st.textContent=CSS;document.head.appendChild(st)}const t=document.querySelector(".top .note")||document.querySelector(".top");if(!t||document.getElementById("u13out"))return;const b=document.createElement("button");b.id="u13out";b.type="button";b.textContent="Abmelden";b.title=(auth.currentUser&&auth.currentUser.email)||"";b.onclick=()=>signOutClean();t.appendChild(b)};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",put);else put();setTimeout(put,800);
}

/* ---------- Spielerlinks veröffentlichen (verschlüsselte Fächer in „pub“) ---------- */
const CH=600000;
async function publishSnap(snap){
  const keep=new Set(),put=async(id,b)=>{const parts=[];for(let i=0;i<b.length;i+=CH)parts.push(b.slice(i,i+CH));if(!parts.length)parts.push("");
    keep.add(id);await fs.doc("pub/"+id).set({b:parts[0],n:parts.length});
    for(let i=1;i<parts.length;i++){keep.add(id+"~"+i);await fs.doc("pub/"+id+"~"+i).set({b:parts[i]})}};
  for(const pid of Object.keys(snap.p||{}))await put("p_"+pid,snap.p[pid]);
  for(const k of Object.keys(snap.x||{}))await put("x_"+k,snap.x[k]);
  /* Eigentraining-Dateien: ändern sich nie (neue Datei = neue ID), deshalb nur neue hochladen; Liste mit Teilezahl in linkmeta */
  let ff0={};try{const m0=await fs.doc("linkmeta/main").get();ff0=(m0.exists&&m0.data().ff)||{}}catch(e){}
  const ff={};for(const fid of Object.keys(snap.f||{})){if(ff0[fid]){ff[fid]=ff0[fid];keep.add("f_"+fid);for(let i=1;i<ff0[fid];i++)keep.add("f_"+fid+"~"+i);continue}
    await put("f_"+fid,snap.f[fid]);ff[fid]=Math.max(1,Math.ceil(snap.f[fid].length/CH))}
  if(snap.bg){let bg=clean(snap.bg);if(JSON.stringify(bg).length>900000)bg={L:bg.L||"",D:bg.D||"",i:""};keep.add("bg");await fs.doc("pub/bg").set(bg)}
  keep.add("scout");
  const all=await fs.collection("pub").get();
  for(const d of all.docs){if(!keep.has(d.id)&&d.id.slice(0,2)!=="a_")await fs.doc("pub/"+d.id).delete()}
  await fs.doc("linkmeta/main").set({u:snap.u,k:snap.k||{},xk:snap.xk||{},fp:snap.fp||"",fa:snap.fa||"",fs:snap.fs||"",dzs:snap.dzs||"",ok:snap.ok?1:0,ff});
}
/* Kurzlinks (Trainer): Passwort-Paket veröffentlichen/entfernen; das geheime Zeichen liegt nur für Trainer lesbar in „aliasauth“ */
if(!isViewerHash&&!isScout)window.__kurzTr={
  async put(aid,o,t){await (dbP||(dbP=start()));await fs.doc("aliasauth/"+aid).set({t});await fs.doc("pub/"+aid).set(o.v===2?{s:"",w:"",v:2,i:o.i,k:o.k}:{s:o.s,w:o.w,v:o.v|0})},
  async del(aid){await (dbP||(dbP=start()));await fs.doc("pub/"+aid).delete();await fs.doc("aliasauth/"+aid).delete()}};
/* Trainer-Ansicht: Stand der veröffentlichten Links (für Statusanzeige und Prüfung) */
window.__webOwnerSnap=function(cb){
  if(!fs){const t=setInterval(()=>{if(fs){clearInterval(t);window.__webOwnerSnap(cb)}},300);return}
  let docs=null,meta=null,tm=null;
  const build=()=>{
    if(docs==null||meta==null)return;
    const raw={};docs.forEach((d)=>{raw[d.id]=d.data()});
    const join=(id)=>{const m=raw[id];if(!m||typeof m.b!=="string")return null;let b=m.b;for(let i=1;i<(m.n||1);i++){const c=raw[id+"~"+i];if(!c)return null;b+=c.b}return b};
    const s={u:meta.u||"",k:meta.k||{},xk:meta.xk||{},fp:meta.fp||"",fa:meta.fa||"",fs:meta.fs||"",dzs:meta.dzs||"",ok:meta.ok|0,p:{},x:{},a:{}};
    Object.keys(raw).forEach((id)=>{if(id.indexOf("~")>=0)return;if(id.slice(0,2)==="a_"){s.a[id]={s:raw[id].s,w:raw[id].w,v:raw[id].v|0};return}if(id.slice(0,2)==="p_"){const b=join(id);if(b)s.p[id.slice(2)]=b}else if(id.slice(0,2)==="x_"){const b=join(id);if(b)s.x[id.slice(2)]=b}});
    window.__webSnapReady=true;cb(s);
  };
  const later=()=>{clearTimeout(tm);tm=setTimeout(build,150)};
  fs.collection("pub").onSnapshot((s)=>{docs=s.docs;later()},()=>{});
  fs.doc("linkmeta/main").onSnapshot((s)=>{meta=s.exists?s.data():{};later()},()=>{});
};

/* ---------- Konten für Spieler und Eltern ----------
   Spielerlink (#sp/<Schlüssel>): Konto anlegen, ohne Genehmigung mit dem Spieler verknüpft (höchstens 4 Konten je Spieler).
   Mannschaftslink (#mt/<Schlüssel>): Konto anlegen und Anfrage schicken, der Trainer ordnet zu und genehmigt.
   Danach (#konto): Der Schlüssel zum verschlüsselten Spielerstand kommt aus „kkey/<spieler>“ (nur für verknüpfte Konten lesbar),
   die Ansicht ist dieselbe wie beim Spielerlink. Rolle und Name stehen im Konto, „Wer bist du?“ entfällt. */
const mkeyOf=(em)=>String(em||"").toLowerCase().replace(/[.]/g,"_").replace(/@/g,"_at_");
const kEm=()=>(((auth&&auth.currentUser&&auth.currentUser.email)||"")+"").toLowerCase();
const nm2=(s)=>String(s||"").trim().split(/\s+/).filter(Boolean).length>=2;
const kls={get:(k)=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}};
async function myLinks(){try{const r=await fs.collection("kverkn").where("email","==",kEm()).get();return r.docs.map((d)=>({id:d.id,...d.data()}))}catch(e){return null}}
async function myAnfrage(){try{const s=await fs.doc("kanfr/"+mkeyOf(kEm())).get();return s.exists?s.data():null}catch(e){return null}}
/* Nach einer Trainer-Anmeldung ohne Trainer-Zugang: hat die Person ein Konto als Spieler/Elternteil? */
async function kontoHas(){const l=await myLinks();if(l&&l.length)return true;return!!(await myAnfrage())}
const kSo='<button class="ln" id="u13so" style="margin-top:6px">Abmelden</button>';
function kMsg(title,text,bad){const o=overlay('<div class="ms '+(bad?"er":"ok")+'" style="font-size:16px;font-weight:600">'+E(title)+'</div><p class="sb" style="font-size:14px">'+text+'</p><div class="sb">Angemeldet als <b>'+E(kEm())+'</b></div>'+kSo+'<button class="ln" id="kdel" style="margin:6px 0 0 16px">Konto löschen</button><div class="ms" id="kdm"></div>');
  o.querySelector("#u13so").onclick=()=>signOutClean();
  const d=o.querySelector("#kdel");d.onclick=async()=>{if(!d.dataset.arm){d.dataset.arm="1";d.textContent="Wirklich löschen?";return}
    try{const l=(await myLinks())||[];for(const x of l)await fs.doc("kverkn/"+x.id).delete();try{await fs.doc("kanfr/"+mkeyOf(kEm())).delete()}catch(x){}await auth.currentUser.delete();signOutClean()}
    catch(x){const m=o.querySelector("#kdm");m.className="ms er";m.textContent="Bitte melde dich ab, wieder an und tippe dann noch einmal auf „Konto löschen“."}};
  return new Promise(()=>{})}
/* Warten auf die Freigabe: alle 15 Sekunden (und beim Zurückkehren auf die Seite) nachsehen; sobald der Spieler freigeschaltet ist, geht es automatisch weiter */
let kWaitOn=false;
function kWait(){if(kWaitOn)return;kWaitOn=true;
  const chk=async()=>{try{const l=((await myLinks())||[]).filter((x)=>x.gesperrt!==true);if(!l.length)return;
    const s=await fs.doc("kkey/"+l[0].pid).get();if(s.exists&&s.data()&&s.data().k)location.reload()}catch(e){}};
  setInterval(chk,15000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)chk()})}
/* Wer bist du? Erst Spieler oder Elternteil, danach nur die Namen, die noch fehlen.
   o.sp = Name des Spielers (Spielerlink: Spieler müssen gar nichts eintippen), sonst Mannschaftslink. */
function kForm(o){
  return new Promise((res)=>{
    const sp=o.sp||"",step=(r)=>{
      const kid=!sp&&r==="eltern";
      const ov=overlay('<div style="font-size:17px;font-weight:600;margin:0 0 4px">Wer bist du?</div><p class="sb" style="margin-bottom:12px">Angemeldet als&nbsp;<b>'+E(kEm())+'</b></p>'
        +(r?'<div style="margin:0 0 2px;font-weight:600">'+(r==="spieler"?"Ich bin Spieler":"Ich bin Elternteil"+(sp?" von "+E(sp):""))+'</div><button class="ln" id="kfz" style="margin:0 0 12px">Auswahl ändern</button>'
          +'<label class="sb" for="kfn" style="display:block;margin:0 0 4px">'+(r==="spieler"?"Dein Vor- und Nachname":"Dein Vor- und Nachname (Elternteil)")+'</label><input id="kfn" maxlength="60" autocomplete="name" placeholder="Vor- und Nachname">'
          +(kid?'<label class="sb" for="kfk" style="display:block;margin:0 0 4px">Vor- und Nachname deines Kindes</label><input id="kfk" maxlength="60" placeholder="Vor- und Nachname des Kindes">':"")
          +'<div class="ms" id="kfm"></div><button class="pr" id="kfgo">'+E(o.btn)+'</button>'
        :'<button class="pr" data-kr="spieler">Ich bin '+(sp?E(sp):"Spieler")+'</button><button data-kr="eltern">Ich bin Elternteil'+(sp?" von "+E(sp):"")+'</button>')
        +kSo);
      ov.querySelector("#u13so").onclick=()=>signOutClean();
      ov.querySelectorAll("[data-kr]").forEach((b)=>{b.onclick=()=>{const v=b.dataset.kr;if(v==="spieler"&&sp){res({rolle:"spieler",name:sp,kind:sp});return}step(v)}});
      const z=ov.querySelector("#kfz");if(z)z.onclick=()=>step("");
      const go=ov.querySelector("#kfgo");if(!go)return;const n=ov.querySelector("#kfn");n.focus();
      go.onclick=()=>{const name=n.value.trim(),k=kid?ov.querySelector("#kfk").value.trim():"",m=ov.querySelector("#kfm");
        if(!nm2(name)){m.className="ms er";m.textContent="Bitte Vor- und Nachnamen eintragen.";return}
        if(kid&&!nm2(k)){m.className="ms er";m.textContent="Bitte Vor- und Nachnamen deines Kindes eintragen.";return}
        res({rolle:r,name,kind:r==="spieler"?name:k})};
    };step("");
  });
}
async function kClaimSp(tok){
  let e=null;try{const s=await fs.doc("spielereinl/"+tok).get();e=s.exists?s.data():null}catch(x){e=null}
  if(!e||e.aktiv!==true)return"bad";
  const kid=e.pid+"~"+mkeyOf(kEm());
  try{const ex=await fs.doc("kverkn/"+kid).get();if(ex.exists)return"ok"}catch(x){}
  const f=await kForm({sp:e.n||"",btn:"Weiter"});
  const zr=fs.doc("kzaehl/"+e.pid);let n=0;
  try{const z=await zr.get();if(z.exists)n=+z.data().n||0}catch(x){}
  if(n>=4)return"voll";
  const b=fs.batch();b.set(fs.doc("kverkn/"+kid),{pid:e.pid,email:kEm(),rolle:f.rolle,name:f.name.slice(0,60),pn:String(e.n||"").slice(0,80),at:new Date().toISOString(),s:tok});
  if(n)b.update(zr,{n:n+1});else b.set(zr,{n:1});
  try{await b.commit();kls.set("u13kpid",e.pid);return"ok"}catch(x){return denied(x)?"voll":"fehler"}
}
async function kAnfrage(tok){
  let e=null;try{const s=await fs.doc("mteinl/"+tok).get();e=s.exists?s.data():null}catch(x){e=null}
  if(!e||e.aktiv!==true)return"bad";
  /* Schon freigeschaltet: direkt ins Menü, keine neue Anfrage (ein weiteres Kind geht über „Einstellungen“) */
  if(((await myLinks())||[]).some((l)=>l.gesperrt!==true))return"drin";
  if(await myAnfrage())return"offen";
  const f=await kForm({btn:"Anfrage senden"});
  try{await fs.doc("kanfr/"+mkeyOf(kEm())).set({email:kEm(),name:f.name.slice(0,60),kind:f.kind.slice(0,60),rolle:f.rolle,at:new Date().toISOString(),s:tok,status:"offen"});return"gesendet"}catch(x){return"fehler"}
}
async function kontoStart(){
  OVSUB="Für Spieler und Eltern";
  LINTRO='<p class="sb" style="font-size:14px;color:inherit;margin:0 0 12px">Melde dich an oder lege mit Google oder deiner E-Mail-Adresse ein Konto an. Das geht einmal, danach bleibst du auf diesem Gerät angemeldet.</p>';
  if(!cfgOk()){showSetup();return}
  /* Einladung merken: übersteht Anmeldung, Bestätigungs-E-Mail und Neuladen */
  const tk=H.match(/^#(sp|mt)\/([A-Za-z0-9_-]{16,80})$/);if(tk)kls.set("u13ktok",tk[1]+"/"+tk[2]);
  try{for(const f of["firebase-app-compat.js","firebase-auth-compat.js","firebase-firestore-compat.js"])await loadScript(SDK+f)}
  catch(e){overlay('<div class="ms er">Die Verbindung konnte nicht aufgebaut werden. Bitte die Internetverbindung prüfen und die Seite neu laden.</div>');return}
  fb=window.firebase;fb.initializeApp(CFG);auth=fb.auth();fs=fb.firestore();
  if(SHARED){try{await auth.setPersistence(fb.auth.Auth.Persistence.SESSION)}catch(e){}}
  let u=await firstUser();
  if(!u){await showLogin();u=auth.currentUser}
  if(needsVerify(u)){try{await u.reload()}catch(e){}u=auth.currentUser;if(needsVerify(u)){await showVerify(u);u=auth.currentUser}}
  window.__webFs=fs;
  const t=(kls.get("u13ktok")||"").split("/");
  if(t[0]==="sp"&&t[1]){const r=await kClaimSp(t[1]);kls.set("u13ktok",null);
    if(r==="bad")await kMsg("Dieser Link gilt nicht mehr.","Der Link wurde erneuert oder beendet. Bitte frag den Trainer nach dem aktuellen Link.",1);
    if(r==="voll")await kMsg("Dieser Link ist schon vergeben.","Pro Spieler können sich höchstens 4 Konten über den Link anmelden. Bitte frag den Trainer, ob er dich freischaltet.",1);
    if(r==="fehler")await kMsg("Das hat nicht geklappt.","Bitte öffne den Link noch einmal. Wenn es wieder nicht geht, frag den Trainer nach einem neuen Link.",1)}
  if(t[0]==="mt"&&t[1]){const r=await kAnfrage(t[1]);kls.set("u13ktok",null);
    if(r==="bad")await kMsg("Dieser Link gilt nicht mehr.","Der Link wurde erneuert oder beendet. Bitte frag den Trainer nach dem aktuellen Link.",1);
    if(r==="fehler")await kMsg("Das hat nicht geklappt.","Bitte öffne den Link noch einmal.",1);
    const l0=(await myLinks())||[];
    if(!l0.length){kWait();await kMsg(r==="gesendet"?"Danke, deine Anfrage ist angekommen.":"Deine Anfrage wartet noch auf den Trainer.","Der Trainer prüft sie und schaltet dich frei. Sobald der Trainer dich freischaltet, geht es hier von allein weiter. Du kannst die Seite auch schließen und später wieder öffnen.");}}
  if(location.hash!=="#konto")try{history.replaceState(null,"",location.pathname+location.search+"#konto")}catch(e){}
  const all=await myLinks();
  if(all===null)return kMsg("Keine Verbindung.","Bitte die Internetverbindung prüfen und die Seite neu laden.",1);
  const act=all.filter((l)=>l.gesperrt!==true);
  if(!act.length){
    if(all.length)return kMsg("Dein Zugang ist gesperrt.","Bitte wende dich an den Trainer.",1);
    if(await myAnfrage()){kWait();return kMsg("Deine Anfrage wartet noch auf den Trainer.","Der Trainer prüft sie und schaltet dich frei. Sobald der Trainer dich freischaltet, geht es hier von allein weiter. Du kannst die Seite auch schließen und später wieder öffnen.")}
    return kMsg("Noch kein Spieler verknüpft.","Bitte öffne den Link, den du vom Trainer bekommen hast (Mannschaftslink oder Spielerlink).",1)}
  const want=kls.get("u13kpid"),cur=act.find((l)=>l.pid===want)||act[0];kls.set("u13kpid",cur.pid);
  let key="";try{const s=await fs.doc("kkey/"+cur.pid).get();key=(s.exists&&s.data()&&s.data().k)||""}catch(e){key=""}
  if(!key){kWait();return kMsg("Gleich geht’s los.","Der Trainer hat die Ansicht für "+E(cur.pn||"deinen Spieler")+" noch nicht freigeschaltet. Sobald das passiert ist, geht es hier von allein weiter.")}
  kls.set("u13wer."+cur.pid,JSON.stringify(cur.rolle==="spieler"?{r:"s"}:{r:"e",n:cur.name}));
  window.__KONTO={email:kEm(),links:act,cur,render:kRender};
  hideOverlay();
  window.__showViewer(cur.pid,key);
}
window.__kontoStart=()=>{kontoStart().catch((e)=>{overlay('<div class="ms er">Das hat nicht geklappt. Bitte die Seite neu laden.</div>')})};
/* Karte „App und Benachrichtigungen“ in den Einstellungen: im Browser die Anleitung zum Speichern als App, in der App der Schalter */
function kNotif(){
  const h='<div class="card" id="kstp" style="margin:0 0 12px"><h3 style="margin-top:0">App und Benachrichtigungen</h3>',was='<div class="note" style="margin:0 0 8px">Mit Benachrichtigungen bekommst du Bescheid bei einem neuen Clip, einem neuen Hinweis, einer Erinnerung an eine Aufgabe oder einer Antwort vom Trainer, auch wenn die App geschlossen ist. In den Nachrichten stehen keine Namen.</div>';
  if(STANDALONE()){
    if(!PUSH_OK())return h+'<div class="note">Die App ist auf diesem Gerät eingerichtet. Benachrichtigungen gehen auf diesem Gerät leider nicht.</div></div>';
    if(pushPerm()==="denied")return h+'<div class="note" style="margin:0 0 6px">✅ Die App ist auf diesem Gerät eingerichtet.</div><div class="note">🔕 Benachrichtigungen sind auf diesem Gerät blockiert. Du kannst sie in den Einstellungen des Handys erlauben (iPhone: Einstellungen → Mitteilungen → diese App → Mitteilungen erlauben). Danach die App neu öffnen.</div></div>';
    const on=pushApi.on();
    return h+'<div class="note" style="margin:0 0 6px">✅ Die App ist auf diesem Gerät eingerichtet.</div>'+was+'<div class="bar" style="align-items:center;margin:0"><span style="flex:1">'+(on?"🔔 Benachrichtigungen sind an.":"🔕 Benachrichtigungen sind aus.")+'</span><button class="btn" data-ks="'+(on?"poff":"pon")+'"'+(on?"":' style="background:var(--ac,#2563eb);color:#fff;border-color:var(--ac,#2563eb);font-weight:600"')+'>'+(on?"Ausschalten":"Einschalten")+'</button></div></div>';
  }
  const dev=IOS?"ios":/Android/i.test(navigator.userAgent)?"android":"pc",ol=(k)=>'<ol style="margin:4px 0 6px 20px;padding:0">'+VSTEP[k].slice(1).map((t)=>"<li>"+t+"</li>").join("")+"</ol>";
  return h+was+'<div style="font-weight:600;margin:6px 0 2px">1. Seite als App speichern</div>'+(instEv?'<button class="btn" data-ks="inst" style="margin:4px 0 6px">App jetzt installieren</button>':"")
    +ol(dev)+'<details style="margin:0 0 6px"><summary class="note" style="cursor:pointer">Anleitung für andere Geräte</summary>'+["ios","android","pc"].filter((k)=>k!==dev).map((k)=>'<b style="font-size:13px">'+VSTEP[k][0]+'</b>'+ol(k)).join("")+'</details>'
    +'<div style="font-weight:600;margin:6px 0 2px">2. Benachrichtigungen einschalten</div><div class="note">Die App auf dem Startbildschirm öffnen, einmal mit deinem Konto anmelden und hier unter <b>Einstellungen</b> auf <b>Einschalten</b> tippen. Auf dem iPhone geht das nur in der App, nicht im Browser.</div></div>';
}
/* Reiter „Einstellungen“ in der Konto-Ansicht */
const KS={msg:"",bad:false,arm:"",anf:undefined,r:"",n:null};   /* r, n: gewählte Rolle und eingetippter Name, bis gespeichert */
function kRender(el){
  const K=window.__KONTO;if(!K||!el)return;const c=K.cur,rr=KS.r||c.rolle,sp=rr==="spieler";
  if(KS.anf===undefined){KS.anf=null;myAnfrage().then((a)=>{KS.anf=a||false;kRender(el)})}
  const radio=(v,t)=>'<label style="display:flex;gap:8px;align-items:center;margin:4px 0"><input type="radio" name="krl" value="'+v+'"'+(rr===v?" checked":"")+'>'+t+'</label>';
  el.innerHTML='<div class="card" style="margin:0 0 12px"><h3 style="margin-top:0">Dein Konto</h3><div class="note">Angemeldet als <b>'+E(K.email)+'</b></div>'
    +'<div style="margin:10px 0 4px;font-weight:600">Ich bin</div>'+radio("spieler",(c.pn?E(c.pn):"der Spieler")+" selbst")+radio("eltern","Elternteil"+(c.pn?" von "+E(c.pn):""))
    +'<div id="kstn"'+(sp?" hidden":"")+'><label class="note" for="kstni">Dein Vor- und Nachname</label><input id="kstni" maxlength="60" autocomplete="name" value="'+E(KS.n!=null?KS.n:c.rolle==="spieler"?"":c.name)+'" style="width:100%;box-sizing:border-box;margin-top:2px"></div>'
    +'<div class="bar" style="margin:10px 0 0"><button class="btn" data-ks="save">Speichern</button></div></div>'
    +'<div class="card" style="margin:0 0 12px"><h3 style="margin-top:0">'+(K.links.length>1?"Deine Spieler":"Dein Spieler")+'</h3>'
    +K.links.map((l)=>'<div class="vd-row"><div style="flex:1;min-width:0"><b>'+E(l.pn||"Spieler")+'</b><div class="note">'+(l.rolle==="spieler"?"als Spieler":"als Elternteil")+'</div></div>'+(l.pid===c.pid?'<span class="note">wird gerade angezeigt</span>':'<button class="btn" data-ks="go" data-pid="'+E(l.pid)+'">Anzeigen</button>')+'</div>').join("")
    +'<div style="margin-top:10px"><b>Weiteres Kind (Geschwister)</b>'
    +(KS.anf?'<div class="note" style="margin-top:4px">Deine Anfrage für <b>'+E(KS.anf.kind)+'</b> wartet auf den Trainer.</div>'
      :KS.anf===null?'<div class="note">Wird geladen …</div>'
      :'<div class="note" style="margin:2px 0 6px">Der Trainer bekommt eine Anfrage und schaltet das Kind frei.</div><input id="kstk" maxlength="60" placeholder="Vor- und Nachname des Kindes" style="width:100%;box-sizing:border-box"><div class="bar" style="margin:8px 0 0"><button class="btn" data-ks="kid">Anfrage senden</button></div>')
    +'</div></div>'
    +kNotif()
    +'<div class="card" style="margin:0 0 12px"><h3 style="margin-top:0">Abmelden oder Konto löschen</h3><div class="bar" style="margin:0"><button class="btn" data-ks="out">Abmelden</button><button class="btn" data-ks="del" style="color:var(--r)">'+(KS.arm==="del"?"Wirklich löschen? Dann ist alles weg.":"Konto löschen")+'</button></div></div>'
    +'<div class="note'+(KS.bad?" warn":"")+'" id="kstm" role="status">'+E(KS.msg)+'</div>';
  el.querySelectorAll('[name="krl"]').forEach((r)=>{r.onchange=()=>{if(r.checked)KS.r=r.value;el.querySelector("#kstn").hidden=KS.r==="spieler"}});
  el.querySelector("#kstni").oninput=(ev)=>{KS.n=ev.target.value};
  el.onclick=async(ev)=>{const b=ev.target.closest&&ev.target.closest("[data-ks]");if(!b)return;const k=b.dataset.ks,say=(t,bad)=>{KS.msg=t;KS.bad=!!bad;kRender(el)};
    if(k!=="del")KS.arm="";
    if(k==="save"){const r=(el.querySelector('[name="krl"]:checked')||{}).value||c.rolle,n=r==="spieler"?(c.rolle==="spieler"?c.name:(c.pn||c.name)):el.querySelector("#kstni").value.trim();
      if(r==="eltern"&&!nm2(n)){say("Bitte deinen Vor- und Nachnamen eintragen.",1);return}
      try{await fs.doc("kverkn/"+c.id).update({name:n.slice(0,60),rolle:r});kls.set("u13wer."+c.pid,JSON.stringify(r==="spieler"?{r:"s"}:{r:"e",n}));KS.msg="";location.reload()}catch(x){say("Das hat nicht geklappt. Bitte später noch einmal versuchen.",1)}return}
    if(k==="go"){kls.set("u13kpid",b.dataset.pid);location.reload();return}
    if(k==="inst"){const e2=instEv;if(!e2)return;instEv=null;try{await e2.prompt()}catch(x){}kRender(el);return}
    if(k==="pon"||k==="poff"){const pc=window.__pushCtx&&window.__pushCtx();if(!pc)return;b.disabled=true;
      if(k==="poff"){await pushApi.disable(pc);say("Benachrichtigungen sind aus.");return}
      let r;try{r=await pushApi.enable(pc)}catch(x){r="fehler"}
      if(r==="ok")say("Benachrichtigungen sind an.");else say(pushMsg(r),1);return}
    if(k==="kid"){const n=el.querySelector("#kstk").value.trim();if(!nm2(n)){say("Bitte Vor- und Nachnamen des Kindes eintragen.",1);return}
      const a={email:K.email,name:String(c.rolle==="spieler"?c.pn||c.name:c.name).slice(0,60),kind:n.slice(0,60),rolle:"eltern",at:new Date().toISOString(),via:c.pid,status:"offen"};
      try{await fs.doc("kanfr/"+mkeyOf(K.email)).set(a);KS.anf=a;say("Anfrage gesendet. Der Trainer schaltet das Kind frei.")}catch(x){say("Das hat nicht geklappt. Bitte später noch einmal versuchen.",1)}return}
    if(k==="out"){signOutClean();return}
    if(k==="del"){if(KS.arm!=="del"){KS.arm="del";kRender(el);return}KS.arm="";
      try{const l=(await myLinks())||[];for(const x of l)await fs.doc("kverkn/"+x.id).delete();try{await fs.doc("kanfr/"+mkeyOf(K.email)).delete()}catch(x){}}catch(x){say("Das hat nicht geklappt. Bitte später noch einmal versuchen.",1);return}
      try{await auth.currentUser.delete();signOutClean()}
      catch(x){say("Deine Verbindungen zu den Spielern sind gelöscht. Um auch das Konto selbst zu löschen, melde dich bitte ab, wieder an und tippe noch einmal auf „Konto löschen“.",1)}
      return}
  };
}

/* ---------- Schnittstelle zur App ---------- */
let dbP=null;
window.claude={use:async function(name){
  if(name==="db")return isScout?scoutDb:isViewerHash?null:(dbP||(dbP=start()));
  if(name==="downloads")return isViewerHash?null:{save:nativeSave};
  if(name==="artifact")return isViewerHash?null:{publish:async(snap)=>{await (dbP||(dbP=start()));return publishSnap(snap)}};
  return null;
}};

/* ---------- Offline-Start (Service Worker) und Installation ---------- */
window.addEventListener("beforeinstallprompt",(e)=>{e.preventDefault();instEv=e;window.dispatchEvent(new Event("u13inst"))});
window.addEventListener("appinstalled",()=>{instEv=null;const b=document.getElementById("u13instb");if(b)b.style.display="none"});
if("serviceWorker" in navigator&&/^https:|^http:\/\/localhost/.test(location.protocol+"//"+location.hostname)){window.addEventListener("load",()=>{navigator.serviceWorker.register("sw.js").catch(()=>{})})}
})();
