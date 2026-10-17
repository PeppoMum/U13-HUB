/* ===== U13 Teamzentrale – Web-Variante (Firebase) =====
   Ersetzt die Artifact-Umgebung durch Firebase (Anmeldung + Firestore) und stellt der App dieselbe Schnittstelle bereit
   (window.claude.use("db" | "downloads" | "artifact")). Die Spielerlinks lesen nur das öffentliche, verschlüsselte Fach „pub“. */
(function(){
"use strict";
if(window.__WEBINIT)return;window.__WEBINIT=true;
const CFG=window.U13_FIREBASE||{};
const SDK=(CFG.sdkBase||"https://www.gstatic.com/firebasejs/10.14.1/");
const XIDS=["full","anon","plan","demo"];
window.__WEB=true;
window.__WEB_BASE0=location.origin+location.pathname.replace(/index\.html$/,"");
window.__WEB_BASE=window.__WEB_BASE0;
const H=location.hash;
const isScout=/^#scout\.[A-Za-z0-9_-]{16,}$/.test(H);
window.__SCOUTKEY=isScout?H.slice(7):"";
/* Verein: Jede Mannschaft hat eigene Sammlungen („d1__players“ …). Gemeinsame Sammlungen des Vereins stehen in GLOB. */
const KABKEY=/^#kab\.[A-Za-z0-9_-]{16,}$/.test(H)?H.slice(5):"";
window.__KAB=!!KABKEY;
const TQ=(new URLSearchParams(location.search).get("t")||"").toLowerCase().replace(/[^a-z0-9]/g,"");
const skt=()=>String(window.__SCOUTKEY||"").split("-")[0].toLowerCase().replace(/[^a-z0-9]/g,"");
window.__TID="";
const GLOB=new Set(["verein","mitglieder","plaene","kabinen","kablinks","kabzugang","protokoll","pub","aliasin","aliasauth","ownercheck","prefs"]);
const T=(p)=>{const i=p.indexOf("/"),c=i<0?p:p.slice(0,i);return GLOB.has(c)?p:window.__TID+"__"+p};
window.__T=T;
const isKurz=/^#k\/[A-Za-z0-9_-]{4,40}$/.test(H);
const isViewerHash=(/^#[A-Za-z0-9]+\.[A-Za-z0-9_-]{16,}$/.test(H)&&!/^#co[A-Za-z0-9]+\./.test(H)&&!isScout&&!KABKEY)||isKurz;
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
const scoutGet=async()=>{let aus=false;try{const m=await restDoc("scout_"+skt());aus=!!(m&&m.aus)}catch(e){}return{exists:true,data:()=>({kaderAus:aus})}};
window.__scoutDb=()=>scoutDb;
const scoutDb={doc:()=>({get:scoutGet}),collection:(c)=>({doc:(id)=>({get:scoutGet,set:async(o)=>{
  if(c!=="kinbox")throw{code:"unsupported"};
  const f={};Object.keys(o).forEach((k)=>{f[k]=toFs(o[k])});
  const r=await fetch(FSB()+skt()+"__kinbox?documentId="+encodeURIComponent(id)+"&key="+encodeURIComponent(CFG.apiKey),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fields:f})});
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
window.__webSnap=async function(pid){
  if(!cfgOk())throw new Error("config");
  const sp=String(pid).split("~"),tt=(sp.length>1?sp[0]:TQ).toLowerCase().replace(/[^a-z0-9]/g,""),pp=sp.length>1?sp[1]:String(pid);
  const x=XIDS.indexOf(pp)>=0,b=await restBlob((x?"x_":"p_")+tt+"_"+pp),bg=await restDoc("bg_"+tt),s={p:{},x:{}};
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
  try{Object.keys(localStorage).filter((k)=>/^(u13v:|u13rolle$|u13role$|u13kz\.)/.test(k)).forEach((k)=>localStorage.removeItem(k))}catch(e){}
}
async function signOutClean(){try{await auth.signOut()}catch(e){}await wipeLocal();location.reload()}

function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.async=false;s.onload=res;s.onerror=()=>rej(new Error("Konnte "+src+" nicht laden"));document.head.appendChild(s)})}
const CSS='#u13login{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;background:var(--bg,#f4f5f7);color:var(--tx,#1c1f24);font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;overflow:auto}'
+'#u13login .lc{width:100%;max-width:400px;background:var(--card,#fff);border:1px solid var(--ln,#e5e7eb);border-radius:16px;padding:22px 20px;box-shadow:0 8px 30px rgba(0,0,0,.08)}'
+'#u13login h1{font-size:20px;margin:0 0 2px}#u13login .sb{color:var(--mu,#6b7280);font-size:13px;margin:0 0 16px}'
+'#u13login input{width:100%;box-sizing:border-box;margin:0 0 10px;padding:10px 12px;font:inherit;color:var(--tx,#1c1f24);background:var(--card,#fff);border:1px solid var(--ln,#d0d5dd);border-radius:10px}'
+'#u13login button{width:100%;box-sizing:border-box;padding:10px 12px;margin:0 0 8px;font:inherit;font-weight:600;border-radius:10px;border:1px solid var(--ln,#d0d5dd);background:var(--card,#fff);color:var(--tx,#1c1f24);cursor:pointer}'
+'#u13login button.pr{background:var(--ac,#2563eb);border-color:var(--ac,#2563eb);color:#fff}#u13login button:disabled{opacity:.55;cursor:default}'
+'#u13login .ln{background:none;border:0;color:var(--ac,#2563eb);font-weight:500;padding:4px 0;margin:0;width:auto;display:inline-block}'
+'#u13login .ms{min-height:20px;font-size:13px;margin:4px 0 10px}#u13login .ms.er{color:var(--r,#d64545)}#u13login .ms.ok{color:var(--g,#22a06b)}'
+'#u13login .or{display:flex;align-items:center;gap:10px;color:var(--mu,#6b7280);font-size:12px;margin:10px 0}#u13login .or:before,#u13login .or:after{content:"";flex:1;border-top:1px solid var(--ln,#e5e7eb)}'
+'#u13out{margin-left:10px;font:inherit;font-size:13px;padding:3px 9px;border-radius:8px;border:1px solid var(--ln,#e5e7eb);background:var(--card,#fff);color:var(--tx,#1c1f24);cursor:pointer;vertical-align:middle}';
const ERR={"auth/invalid-credential":"E-Mail oder Passwort stimmt nicht.","auth/wrong-password":"E-Mail oder Passwort stimmt nicht.","auth/user-not-found":"E-Mail oder Passwort stimmt nicht.","auth/invalid-email":"Diese E-Mail-Adresse ist ungültig.","auth/email-already-in-use":"Zu dieser E-Mail gibt es schon ein Konto. Bitte anmelden.","auth/weak-password":"Das Passwort ist zu schwach (mindestens 10 Zeichen, am besten mehrere Wörter).","auth/too-many-requests":"Zu viele Versuche. Bitte kurz warten und erneut versuchen.","auth/network-request-failed":"Keine Verbindung zum Server.","auth/popup-closed-by-user":"Die Anmeldung wurde abgebrochen.","auth/cancelled-popup-request":"Die Anmeldung wurde abgebrochen.","auth/unauthorized-domain":"Diese Internetadresse ist in Firebase noch nicht freigegeben (Authentication → Einstellungen → Autorisierte Domains).","auth/operation-not-allowed":"Diese Anmeldeart ist in Firebase noch nicht eingeschaltet.","auth/missing-password":"Bitte ein Passwort eingeben.","auth/missing-email":"Bitte eine E-Mail-Adresse eingeben."};
const errTxt=(e)=>ERR[e&&e.code]||("Das hat nicht geklappt"+(e&&(e.code||e.message)?" ("+(e.code||e.message)+")":"")+".");
let ov=null;
function overlay(html){
  if(!document.getElementById("u13css")){const st=document.createElement("style");st.id="u13css";st.textContent=CSS;document.head.appendChild(st)}
  if(!ov){ov=document.createElement("div");ov.id="u13login";(document.body||document.documentElement).appendChild(ov)}
  ov.innerHTML='<div class="lc"><h1>TuS Haltern · Teamzentrale</h1><p class="sb">Nur für das Trainerteam</p>'+html+"</div>";return ov;
}
const hideOverlay=()=>{if(ov){ov.remove();ov=null}};
function showSetup(){overlay('<div class="ms er" style="font-size:15px">Die Verbindung zu Firebase ist noch nicht eingerichtet.</div><p class="sb">Bitte die Datei <b>firebase-config.js</b> mit den Werten aus dem Firebase-Projekt ausfüllen (siehe Anleitung) und die Dateien erneut hochladen.</p>')}
function showDenied(email){
  const o=overlay('<div class="ms er" style="font-size:15px">Dieses Konto ist nicht freigegeben.</div><p class="sb">Angemeldet als <b>'+E(email)+'</b>. Zugriff haben nur Personen, die der Besitzer unter Einstellungen → Mannschaft → „Zugang zur App“ freigegeben hat.</p><button id="u13so">Abmelden</button>');
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
    const o=overlay('<button class="pr" id="lg">Mit Google anmelden</button><div class="or">oder mit E-Mail</div><input id="le" type="email" autocomplete="username" placeholder="E-Mail" inputmode="email"><input id="lp" type="password" autocomplete="current-password" placeholder="Passwort"><label class="note" style="display:flex;gap:8px;align-items:flex-start;margin:6px 0 10px;font-size:12.5px"><input type="checkbox" id="lsh" style="width:auto;margin:3px 0 0"><span>Gemeinsames Gerät (Schule, Verein, fremdes Gerät): nichts auf diesem Gerät speichern</span></label><div class="ms" id="lm"></div><button class="pr" id="li">Anmelden</button><button id="lr">Konto anlegen</button><button class="ln" id="lf">Passwort vergessen?</button>'),m=o.querySelector("#lm"),em=o.querySelector("#le"),pw=o.querySelector("#lp");
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

/* ---------- Datenbank-Hülle: gleiche Aufrufe wie in der Artifact-Umgebung, mit Mannschafts-Präfix ---------- */
const noWrite=()=>window.__ROLE==="lesen"?Promise.reject({code:"permission-denied"}):null;
function docW(ref){return{get:()=>ref.get(),set:(d)=>noWrite()||ref.set(clean(d)),update:(d)=>noWrite()||ref.update(clean(d)),delete:()=>noWrite()||ref.delete(),onSnapshot:(a,b)=>ref.onSnapshot(a,b),collection:(n)=>colW(ref.collection(n))}}
function colW(ref){return{get:()=>ref.get(),onSnapshot:(a,b)=>ref.onSnapshot(a,b),doc:(id)=>docW(ref.doc(id))}}
const wrap=()=>({collection:(n)=>colW(fs.collection(T(n))),doc:(p)=>docW(fs.doc(T(p)))});

/* ---------- Verein: Rollen, Mannschaften ---------- */
/* Globale Rollen: admin, jugendleiter, platzwart, team. Bei "team" ergeben sich die Rechte je Mannschaft aus den Trainerarten (verein/main.arten). */
const ROLLEN_V=["admin","jugendleiter","platzwart","team"];
const RECHTE_ALLE=["sehen","bearbeiten","einstellungen","notizen","kader","kaderbearb","hinweise","fachlesen","tw","ath"];
const ARTEN_STD=[
 {id:"trainer",name:"Trainer",rechte:["sehen","bearbeiten","einstellungen","notizen","kader","kaderbearb","fachlesen"],gl:["kurz"]},
 {id:"cotrainer",name:"Co-Trainer",rechte:["sehen","bearbeiten","notizen","kader","kaderbearb","fachlesen"],gl:["kurz"]},
 {id:"sportleiter",name:"Sportlicher Leiter",rechte:["sehen","notizen","kader","hinweise"],gl:["plan"]},
 {id:"torwart",name:"Torwarttrainer",rechte:["sehen","tw"],gl:[]},
 {id:"athletik",name:"Athletiktrainer",rechte:["sehen","ath"],gl:[]},
 {id:"lesen",name:"Nur lesen",rechte:["sehen","notizen","kader"],gl:[]},
 {id:"scout",name:"Scout",rechte:["kader","kaderbearb"],gl:[]},
 {id:"platzwart",name:"Platzwart",rechte:[],gl:["plan"]}];
window.__ARTEN_STD=ARTEN_STD;window.__RECHTE_ALLE=RECHTE_ALLE;
/* Vereinslogo: zentral (verein/main.logo) oder das mitgelieferte TuS-Wappen; gilt für alle Mannschaften */
const LOGO_STD="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAFACAYAAADNkKWqAAAQAElEQVR4nOydBZgT19fGz78uSAUKxaW4uzvFvRR3d3df3N3di7u7eymLS1ukhTr9WirUv/ve3QmT2cjcZDKSvT~e~2STnSy7yeTMuUfe8wJJJBJJLOUFkkgkkliKNIASiSTWIg2gRCKJtUgDKAmI//77LyG7ScRWfLbieFmvs/UKWy95WK~rftxvbP3pYf0R/b1fvKwnbH37v//97yFJJAHwP5JIPMAMHIxbarZSRd~qv05BUUbMLvzDFozg3eh1T/P1Q2Yk/yWJRIM0gBIYu1fZTU62crOVK/o2C9nLyAXKf2x9ytZF9WIG8TFJYj3SAMYymLHDllVr7DKy9TwZxLfffks//d9P9NNPP9Fvv/1Gv//~Oz19~pT~~OMP1~0fT9nXfzwlZojo1VdepZdfeZlefvlleuWVV/gt7uPxuHHjUrz48eiNN96gt956iwzkPsU0il~TJFYhDWCYwwzey~wmH1tFoldhtt6mALh37x7dv3ef7t~/T188~ILff/ToEf3f//2fy~DBwIWS1~O8TvHjx6c34r9Bb775JiVLnoxSpU5FKVKkoJQpU/KV~N3EFAC/snWWrRNsnWTrNDOIT0gS1kgDGGYwg4f3FB7e~9GrKEUlInQBY3b9~nW6ffM23blzh27cuEH37t6jL774gpwCPMgUKVNQ6tSpKVOmTJQ~Q3rKkDEDZciQgXuYOkFc8Txb~6PXWWYQ/yRJWCENYBjAjF4ydlOWogwebt/R87y7d~/S2TNn6XLkZW70bt28Rd9//z2FM/AQYQgzZc5EefLmoUKFC/HttQ6QjT5K0QaRGcOrJHE80gA6FGb0krCbxmzVpahYnk/~/fdfunbtGp05fYYbvTNnztA3X39DEuIeYsFCBalgwYL8Nnny5HqehgzzGixmDC~TxJFIA~ggmNGDZ1eHoowe4nk~3z94c9u3bad9e/fR6VOn6ddffyWJfxIlSkSly5SmipUq8qWD2xRlDFcxY3ibJI5BGkCbw4weUp~12arHVgm2nvN1/J3bd2j3rt20a9cu~vjCxyQJjldffZVKlCxBlSpX4sZQx3b5E4oyhuuZMbxLElsjDaBNYYYP2dqWFOXxxfF17Lmz52jv3r20eeNmy5MVr732Gs/MfvvNtzyh4o8iRYtQ7jy56envT3kGGWUzuOWLPYat~~3bt~mHH34gO4BtcsXKFala9WqULFkyX4f~zdYOthaxtYcZw79JYjukAbQR0d5eM7ZaUFQhskf~/vtvOn7sOO3cuZP27NpD33xjTixPMW5JkiShpEmT8tt3k7zr~hq3cePF5ce2bdOWNm3Y5PdnDosYRh07d/R73MWPL1LE0Ag6deoU2YWsWbNS5aqVqXLlyjyp4gO8QcvZms8M4acksQ3SAFoMM3ooQC5DUd5eDfLRfbFzx04e04O398uTX8hs7nx~R2/GlIYNHUazZszye9yEiROoWYtmpAcY/gb1GtDhQ4d1HY~fmyplKoqMjKRLn1ziWe9QkSpVKqpUpRJVq1aNZ5d9cIyivEJskX8niaVIMQQLYcavGLvpx1Ylb8d8/vnntHTxUlq7Zi09fhya7q2076WlQoUK0coVK30eh6JnfwYQXR/wSNHpoYdXX3vV7f6qlavon3/~obfffpsXPKdMldKVlX3hhRdo0pRJlC93Pn6MPz6o/QHfsiq0btmatmzeQqEAReGzZ87mC95gk6ZNqE7dOhQvXjztocWjV0/2/o9jt2uZIfT/x0hCgvQATSa6UPkDtvqyldfTMWgV27plK61YtoKXqxgJWs~yZMnC69946Qdb77wTVTZYoVwFn4mTj9Z~RGXfL~u6P33qdLp58yZ9/fXX3Oh9/dXX9PPPP5MIS5YtoSpVq7juFy5YmCdy1L/v/oP7KUfOHK7HKpavSBfOXyB/f~e9L~7xbbsCvOcWzVq4Hde0eVNKmSIl9xKxzTYyhoqia8QKGzdt7GaINcAtncDWEvY7h7aNRhID6QGaBDN8L7KbJmz1ZiuDp2Pg7S1euJhWrVpl2BYXXhOSDDB08PLyF8jvySvhFC9e3KcBhKFTs3v3br~GyB~vv/66231tqQ573XhWW20AUczs7/9FB4ja~IEKFStwo6Ru16tatSrP8oK//vqLUiRNwbfaRoD/Z93adXxhi9yydUtq3Lgxb~dTAXWd2WwNZX/rVHY7hxnCn0hiCtIAhphow9ecojy~NJ6OOXH8BM2ZPYfX6xkJvI858~bQSy/5FnVBF8jRI0fp2LFjPo/76tFXbvffffdd19fYsiIR8k6id3ii5NLFS9yr8kecOO4J7t9~/S3GMfh5avT0G~fKHbM2/MUXX~TlLJs2PkvO5MyV0/U1OmKMMn5asEUePHAwjRs7jpo0aUJt27WlJEmTqA~B/NgYtvqxc2YGu50iFWtCjzSAIYKdxLjMY78Fjy9GawG8jY0bNtK8OfPo6tXQdFWhh9eX8fv1l18pV45c9OOPP5IevvrK3QAOHjqYhkYM5YZQ~/~MGTVGlwF87XV3Lw2e3t9/PTNChYsUprr16rodc/7cefJH7ty5PT6Oi4JiAJHBRpxR4eLFixRq4NnPnjWb5s6ZS1WrVaVOnTu5GWGKEpgdxFZ3dg7NYbcTmSGULTshQhpAg4mWm~rCVlfyoLqCOrcF8xdww/fdd99RKIFhxQfur7//4mUz8DTheSDpARRllUANIMQGvAFvUA/aLfCGTRt8Hj9h/AQut~WPHLmebZmRMHn~~Si1L8Qw8X9iq40yFjWIAZoF6hsR58VC1rhHzx5Urnw59SF4YXqx1YmdUwvZ7ThmCL8kiaE8RxJDYCfpc2y1Yl/eYms4aYwfPL6FCxZS3lx5aeTwkQEbP8S1kN3UAz5kJYuXpPRp01PL5i1pyeIlMba5SIboRbsFVgOD8tmnn3FDi5jX6dOnSQ/aOJ03kAEf0G8AjR873u~xiPOpjdv~fft5dhpAKaZ8hfL86~zZs7s975OLn5AVIO7asH5DKv9~eTp79qz225Cv6cTWLXZ~DWFL3wsm0YX0AA2AnZSIok9jK4f2ezBCG9ZvoHFjxtGDBw8oUJBFbNWmFf/w4gOOhMTJEyf9Pg/afWoghtC8RXPXfXRifLT6I9LDw4fuozdu37pNLVu0pEcPHwlnfxXUMUD8DHjG4P1y77ttDbt06kJ79~zV9TOzZsvq8vjA~fPn~X38TKDEAbNlz~b2f3/22WdkJfBAq1Sswr3UIUOHaIurYfgi2GrNzrc~FCXC8B9JgkJ6gEHATsQ0bG1kXx4hD8Zvz~49VKJYCerYvmNQxg/gQ129RnWXnl2tD2pRIGAbrAYxNr2gtU2dJED87uaNmwEbP/4zVB4g1GnGjxvPV8/uPd2O69u/L~klZ063mBovgt61c5frPgwMYpZ4TdXH2IUD~w9Q8aLFeTeNh/MGGaHVbJ1m514BkgSFNIABwE68uNFFrNfZimGJUBtXuUJlatywMTcQRoBYEUpCFBDMf~458bcP8TOU2yigyFipA9TDl18~C0MlThyQ8rILTTkI/fLLs9Kfy5cv8~20QrZs2VxbV3/kzedeXhl5KdItw44YIIQNUE6jYEYCRBS0EhbIW4B31XhQ8oHxgxFcEa0HKQkAaQAFYScbPD18MrENeVn9PXhCfXr1oRJFS9C5c~fISBAzVHtv6MiAZFMgQBpLjVIHpwd0gyigxhCGuH6D~tSlWxcaOXokzV84nzZv3UynzpzirXOVq1T2~rPivO5eAqM2gGDSxElu9/V6geoSGJSfQKofhv/ggYOux5EMUmNGAgRbWnU9ox7gcaOlEIYQ3UDqiyBFNTI0Yusie7w2SYSRBlAnqOdjaxhFyaS7ncWI8y1etJgnOJBowP1QsHnTZrf7NWvVpEA4ddJdUEBkG4xuDzWLliyi6TOn0~Ahg7lRwe9UtFhRSpc~HTfSvrxEbQZYawAR44TSjYIeLzBO3DiUJs2zckv11hbJGYV8~fO5Pe~TT0KbAIEk/7Yd2~jAoQO0fuN6XpQuAjptOnXoRGVLl/VUNoUZzevZ~bk~el6zRCfSAOog2uuD4RvK1ovq70FdGZnWvr376i4nCZRtW7e59cBWqlSJe2GiaA2gUZlgT6DWzhu4UGB7Ci~ND1b6KWYDhNYL7NOvD/kib1737e~lS88MIOKASjZYDYRjtYbdSJCR3rFrh6uPumSpkrRt57YYXqgeUKxdqngp6tyxsyeJMHiB16Q3qB~ZBfZBdBfHQLYGkMbw4UODyn5keEVBASxKM0QnqMFAHDx4kMqVi6oXg7cDjwgqMSIgjgePAsrHIG3atDwOqKe~Tl0LiEJq3MdCVhrGUbmvPObLsMDwwaPxxaGDh6hm9Zq80wQtfJDbSpgwodcyoly53DtA1B4gXm9kkmvUrOF2jJ7C6kCB8du8bbNHEYlguk7WfLSGtwjC827SrAnvfY5G8QZxYrZmj/sXZYzFSAPoBXYCoQZhFWnmbcBrQSEzWpqe/Cw2NRF9uKPHjOZxIMScPvzgQ~EMKkRPFQMIsOUUNYAArW9QK1FAOYx2i~0JlI8cOnSIGzfRvz9QtJlrX~DCAmOQJ18eypMnT4xuFPz~WgMYKuXsHDly0JZtW/iFCijeJ1SmQbADqHBB7NWzFy1btoymTptK2XO41TXCCyzEzuOm7PU4SBKPyC2wBqi1sNWNooZluxk/GC1sPwYNGCT84Y8YHkE7d~90BcEhULB7726XF6YXXPXVniO6BwRGPboIdBsMzwtqLWYZP1EQH5s8aTI1rNeQMqbLGENUAgZS~5h6m2wUeJ/Vxg9069LNZfyAURP4rly~wj1pGENNGCEpW/shssCW~EkSC5AGUAU7SfgJw9YUUs3SRfsaTl5U6kM4IBA0je8cTCPbu38vvZfuPdILyiHUJR34QEGIUwGlMcgOz5ozixYuXuj15ygGEMW/SNwgvhgbwLazbp26vKMExhBxNKNLYNDatnX7VjfjB~kwlPaoMXIEKbLDy5Ys44k4tdgDRWWK0ZZ5MXrMgkSF3AJHw04ODB1C87lbsAY1fY0bNObxqmBQd2T8~eefLvGApMmSck~wTu06uluxcIKj/EShZs2adP/efar9YW1eLI0YGUDCBL2~npILUEfGh0XbKRIbQGZZnV02EtQgrt~w3i3DvXrVahoxfISbliL4/jvjZzAjmdS2dVteQzl2/Fje~hcNQjrHoutXh7Ft8V8kkR4gOyFeYmsB~xL9YG7GD0rMZUuVDdr4ARgoBWTyUNOlgAA5PAZkB/WAQD4SEArQuduzbw~1at3KZfwA2r98dYzERuMXSlBas2HjBjfPD7HWrp278q/V4hHw2EQHPeH91BaPewPq3u~Xfp8~/~xztx9BUQk9GMJ3SRK7PcDokwD7BTe5XhiXrl268u4Lo1AbG8SHqlWJ8uAUqSdsZaG43KFdB7/JCGzjMBBJncRQg0QNEgeQ29q~fTuFGmVYEmSxkK3Feuvtt1xfAfSCIgAAEABJREFUY~Hv4~u1qNvXXn3NNUAJXsvvv/1Ov/3~G08U8K9Z2OGH73~g73/4nh7/8Jh~ePwDvw9RhC~/~NJ2xhsJrnUb1rl5fvi7WrVo5boPeX~FQLa/KAGqV68edWjfQVcf~I0bN6h0ydI0eepk7YUQ5/vH7PyvxTxBYyXHHUasNYDszcdJAOPndiVEEL1Z42aGf8DUHiCEOaFYjMJWGLOGjRryx1HTh04KbItnTp/p8~fBSGoNILKZ2B5jGRlfAiiTQcwSv3eKlCl4Cx2MHm7feustCgZ4wHqHLalB2Q0k7GEQUdpz584dunXrFh~jqfaQQw33/DZtcEtwAPxNh48d5jHW5UuXU~o0zzzAHx~L1Ywio9ytezce40VyBWUwA/oP8JuMQswYW2JcEGEIVeC8P8o~B02YEVxLsZRYORMkWrYKI8vcVDyhigLVkVCA7cvX3z2riUNSBQOAwJRpU6hR40Zux2O4ztAhQ73~PHwQbn16iwsIwOChHjFYwQUFGDrI42fOkpnSp0/PW7i8yejbFSjUwBhi4cKApI~eOkdRoNKzdsNaN1EHZMoTJEigrs3jcd~//vzLtYXF71O9anVd/wcM6/FTx916lwH~njat2ujyBgE6aZavWu5pnvFEtvrFxuFMscoDRLyPogxfK/XjODn79elHK5av0PVzsM1Ba5NI/ygSEvBWlAlnaikm6AOWLVuWEr/7rG2sQ6cOlCBhAm6QPU1AwzYXSjP4oAcL/pYiRYrwWsBixYvRm2~~SU4HWXesUqVLuR779M6n3FicPHmSGyAj5il/8eUX/MLZoGEDbqgQ1ytXphz38nv27sm1G~HZI~mlVs0W8dBHjhrpZvzw3uMCCK9cRJDiypUrVLxIcT6IStP/DeHV3OzzUYcZQXtMoDeJWOMBsjcXAqVr2HJLxWEb1aB~A7p6RZ8sPbYii5ct5tnVooWLCrVQbdqyiRsYgAHfzZs0p85dOvNhOdrtkwI6IZo1aeaxhStQUHaDft2iRYtyowdvJTYCg4it4YkTJ/itaFJCDV7D9h3a85iruvskRYoU1KNXD6pXv56bRuGihYv4RdcfyBwjNqyAiyiMHgwspgdmSJchoO1~n759qFefXm5eKuMeWxXZY8ZIGDmAWGEAmfHLyG52s5VK/fiRw0d4kNpTmYgn0HI0fsJ414mMPuCqlatqFTq8ot7qQiEanqc6aI4TGWMwy5Qt4/Y8eIjTpk6jQMH2DPJPEASF4RMtvo4toMYT5SO7duziFygjQW3m2vXPQm2oQ4S8vy9wkT119pRLrgw7ARjONm3b8PtI0qmTLKLgPEPMWRPeQGvSB8wIHqBYQNiXwTDjBI8POuOp1I9PmTyFt6LpNX7g1s1bbhp8BQoWoAGDBuh~/hcPns2cxRVcMX4whvPnzecDiurVqefKPmPLUrli5YCNH5SPcYIjVjh3/ly~HZPGzzuZM2fmAgVbd2ylqzeuUsSICGH5Km8gE65Gj7c5Y9YMN63GqVOm8t9RQVPwzEEp1cEjB3X93pAHK1akmLa4H9ZwD/vctKNYQFgbwOg3cQ9FvakuUGoyeuRoEgUeHwynmq7duvJtpB481RPiJC5coDAN7D/QpSaDrF2TRk2odInSwgW7hQsXpmkzptHd~3dp2YplvFc4kFa52A4uFB06duDyVRc~ucC1CH0p2/hDm~X2NxMGGovw2hVw8V26ZKnrXMNuQTtGFVUBa9at4bNOUFyPrLFmixsDxJArlqvIQy0qsMWZg6l0bD1PYUxYboGj3zTUkbhdxVCX1ah~I0~DZ3SDEwpFx~jlVUBtWtFCRf2e1GiRwnMVMB5x6OChFCzwLurWr8tnfWAAtyQ0INSBsMmypcv4uANPySlfIGPctXtXHterUbUGT8Z4AmVQJ0~fdO0Q8P~gIB87DnR3AJTBQBJLYdCQQfxirAUXUMxt8Rerxnk9acokatyksfZb2ArXC9fkSNh5gBAzYDfLSGP80PqF7Jwe44erP/TalIyt5udTs6bN3LbOqINDZs3f1fbBffcyFU8/XwR4e~j3vXnnJhdbkMYvtOD9RVZ56fKlFHk1koc/YKz0gvhu/br1qWSxkrxW0RsYZq~ODU~fNp3Xp1av~axsBkXuAKEUhDnUxg/JEQUUaE~eMpn8gfO6R7ceNGTQEO23EELaxr7v/NIAD4SVAWRvEsp6UMvSUP04Tjy0BcEI~gMnDIpXodgLo6bO3Cn8~8~/MQqlcXXu3ae3z58NDxEdDgpJk~r/8Cjg90Es7~iJozxWhd5fifngItm9R3f6~JOPuQFCdYBerl275nW30KlLJze1aGx9J46fyEuklMdRQoNkDbbVKIpWK4Nj4LpaWRuF0BjToJc5s~dQg3oN3M5TBkQUDoWjEQwbA8jeHHR9QwTSzfhB5aRqpaq6kh0YGA7ZcqWfFoFkCE6qgfzUyTMnY8yUBb379vYbD4QXiNIbxPyUdjg9IJOLmNTFSxd5QkMdDJdYBy5IMEAHDh/gZU56Bzd5Au9p/wH9XfdR74eJgqgWqF792YUORe~oC9x3cB~/YCugeD5LlixuCZf~ffu7DbLSA1RycG5qPjMYtQcjGFZZtLAohI42flAFdasfgQqH0oiuBwz23rJ5i9vg8Y6dO9KRI0d44SyyghAcUIO4ojrADW8Axabesnyo/cI2XK8aMPplu3TtQi1btnT1zjoBeB6IjWL9/NPP3KPgfb7R6~nvT3nvL7LqSm/wK6~~4uoZxhbwjTffoLfefMutQNzOoMYTC5MAJ06YKNxLju00XielYHrG9BkuQVe1iCv0GPfs3~MqWEcVQfeu3SlR4kSuOlMA7Ui9M5~1YFRBpQqVuIepEtiAEUT7XAkWDgi~itwGOD4Jwt4MBEtwprkZP/Rfirj~CvC0Dh09xGXiFbDlQNuR2utCzASZZLSznTh9wq0f9tjRY/RBzQ8oGNAy1a5dO~rYqaMtDR~C6ui9xbp39x4vpYC8E0QLQjFfAwYRrzFEFrD9hKeTJm0aSpcuHWXMmFG3SoqZ4DUZNWJUjGytL1D2Mn7ieP53lSpRint/aF375HKUVBqyvxCUUMqxsJXG~FUAwV0lZIMuF1yIcQEKBhRyI9SiaZ~7xVZ5ZgQdLyfkaAMYHfOD8aukfnzCuAl8uHagoBf24OGDXstHUK4CwQSlWBZX3Y2bN7olQcaMGsOViUWB94POEHh9dmlJg04hPAJ4I/hQ37h~w9DOFCOAl4KWPsjCIzyBmJyI0GwoQWfIqJGjeAZZL9jGKrsI7EKGRQyLcQwEVhvWb0hPnjyh4yePuyXVUE~qHgMaDPAst23fxi84KqCzVYyd88H3YlqIYw0gM364BK5mq6768YEDBtL8ufMpWND1MWnypBiPwxA0btQ4xnS0/gP7U4~ePVz34SGiVxfGQi~o4xoydAg/4awCni48FgwKwt~KgL1TgdcIY4g5wYjNogtGLVpgNtgZ9O3Tl7fgiYD4ojbJgu014oPI~CIrrZ6/DGVoyOMbCS7GGO4Ez1sFTo4STi6RcbIBhJVrrX4MaXy9ggZ6wMxbtfIywEwQD3NZufeH0hnUemHbgolxmBWsB9QHjh03lnLmyklmg1gkasUwbe7QgUMe/7ZwAbE1zD5BCxjEJzC72ArQzjZyxMgYs0m8ARkrdX0eQi9KQb72Qv3555/zMptQeOgIxWzeslnbZYKRemXY~W/PITF~cKQBZMYPTZRulzgkF3BiGQniSsdOHONxEAXM0ChRtIRbrZUCOgWWLF3CxVRRvuAPBPfh8UHK3l8NoZEg0I4Zudu3baejR4~aqp1nJxDXgudUpVoVfuEyE4RRxo0Zx7s79BRUo~Zz1NhRNHb0WK4IDrShGuw6MLdG72iFQIgbNy4v5sf/reIIRYkoiM15tQGOM4DsTUYpfF/1Y~imQFdFKIDLv//Qfl5wqiCaXdYCY9eiZQsaPHSwW8FrKIHRwwcHZUEH9h8Qnkkc7iDsUK1aNapWoxoVKFDAtAsSYqod23UU9rwx6wO1oOpkXbCxb70gPrlrzy5tTHAHWzXZ6xb4sGMLcJQBZMYP~kFj1I/pUdUIFpS~jBnn9t9yIUo9c3S1QBV4/oL5pm13UdOFtqnYMvXNCGAM4ZU3atTIlEQK6v1mzZjFjZfeC9PAwQN5r68CtCkrlKugW5koWN5J9A43ghqRVtTcNGJG8F9yCI4xgOyNRTAOFsdVvD1r5iwaNmQYmcHylcvdmtPhUSEeiJiLHiCKiXYlaMOphTFDAUQXVq1YRWvWrAlJSUpsAvFZiJ3WqlXLbdhRKMD7hjEJEN3wB5I5w0cM5zFAhGPQi272nJQkSZLQrr27tB1N05gB7EYOwREGkBm/0hRV6OyqS0GCoW/vvmQWiAdqSw301hpCUn7e/Hn8NpTA04PhQ~ufxFiw5cRgIYQuQu29i5zbyG7DY920YRNZAfrPd~/brRXV7c6M4FRyALY3gMz4ZWU3KLhzVQOjngpzdM1y9xVw4kNmCGDrDX02f79Dy1YtafjI4SHz~tCuhA8MlvT2zAFDkKAbWKVqFY~94kaAedStmrfiM03sDj4XO3btUM8gxha4KTOCK8nm2NoAMuOShKLS7EmUxzDnFBXymmZt08B2CCenv3kgqJuaM38OlSlThkIBasmQ~Fm/br1MaFgEWtdatWrFt6GhGBqFrS0SfEZXN4QClIuhbEwFkiHoFjlENsa2BjB6hscRtrIqj6GtB7pomItgZ1BwO2/BPDc1X6OAog3aq4ycWSwJDsQGMdsFM0G8zXYJBhSmo~gZfed2xoMmIWoDCzMjaNviUlsawOguD6QtXeXtaPiuVrkaXbhwgewKtkPoCEEbm9FlFOhHRpnD8mXLdQspSMwFsTgMG8KcZ6O3xug8atm8JZ0/f57MAEmW1m1a8y4afPYunL9Aa9es9WuEV6xaQRUqVlA/hMxMTvZ5sKX1tqsBHMZu3KSSIRPvaQaCXUBZwLLlyyhvvrxkJFBVwVYXGe/YWrDsNNBhAhk1ddWAEaBgGoXQiD2HEsT0lq9YHmMEAEItEUMjaOGChV6fi6JsjBFAX7aK7WzVsGN5jO0MIDN~xdnNYVKVu0Ck0YNSbQyw/YBiL9qdrl~7HrAUkCiYtjZ77uwYcx~CBXWGgwcN5sPPJc6jYKGCNH3mdEqdOjUZyeFDh6ldm3ZBK714Au1ukZcjfSoQ~Su4Rmz08NHDWjGPCGYAh5HNsJUgKjN~6DlbT6rfCzp8/owfauwwSByTvDAIqF37dpTwnYRkBtjyrl6z2lDjhzhfzeo1ebG1NH7O5czpM1SkYBHeu2tkogoXebRoaoQJDAHCq2rjB68TveLq3x/Cv4hze~Phlw/5zGsNg9nnuyTZDNsYQPbioNcMhc6uzAHKOpo2burzedCIQ28iZmKoM3E/Pv6RQgn02DC7Qa0AEyzI~uHDgqJWDOqWOB/EzyBcUCBvAe3ktaBAvBGlJ9jtGOVtrGwAABAASURBVAmKm9Wg3AujWXPnyO028H3mrJk~Ez4Y~BQxLEL9EGzNGvY5T0k2wk4e4Ay2XKPWcOI0qN/AZ9AVYgKHjhxyU6dAzAyFwKKSQyLgjV~3YR1vlzIKaAsWyl~If1igJiMJLx49ekR1P6xLLZq14AktI0D2GTqUWsWiYNDOzVFUZSC8imFgiieIba6/eTQzp8~kHdt3qB~CztvGaGfHFtjCALIXBFNd2qof69m9J125fMXn8yA/r0zlgquOrXKG9zLwGSCnT5/mAgaYo3Hi1An69O6ntHjpYq2yrTBoBN~5ZyeVKFmCjAAn1IB~A6h6leq2L~~RBA8UeHChw1hNI8A5jvq7Lt26kChTpk3hg7~QtVZCOBBRVVcZoOBbUdvG1nbdmnWu7~lxADCDGxL~KvKwFdrmfQEsN4DM~KViN27CeSj18JfA4MkO1fSsJg2b8GSJIlOVJk0a7h1ijgcyUvHjx6eq1apyY6geJCMCZLEwiCZbtmxkBBAchWz5gvkLSBJ7wK4GMvZIZOgZ1qUHZJ1Hjx0t9Bxsd9HNMnX6VG4MARIr6vZOOBhqvcGTp57NMk6fPr2//4J7kBAQ1lQwdGWf~7JkAyw1gNH1fmvZcmUQbty4wbX9/FG/QX3X19C227fv2dwFNLBDwipjpowxnoer2bTp00gUqF4g5qLWBgyGEcNHUNnSZXWN6pSEJ5jtW6RQETp65CgZAer2ME9EL~rxmQkSPuvlhaiwMu4BYEiYUt715x/PwjN6h1Vh2FiXzjE81BXs82/5tCurPUCkd13uGGJfzZo04/E/f6i9MPVVFG8WJln5ak2CxJHIHFcYP6heaOuiAgEFreXKlqPpU6eTRIIsf~1atXl3D2SxgqV5i~a6jeC1q8/GHeTLl089/Y0G9B3g9vuMmzCOF/fv3LGTK07DS0Qbplon0xeQY8M4TxUwfsbJtweIZQaQWX80yboN3UXfI3p99aCOU2CWBra6Cxcv5DNz1cOMcDVLkTQFffjBh27P1yuHjlnBMH5GtLXhSl~8aPGQKvZKnAmKm2tUq2FIggRGUM8uByNgFdC50qlzJ9d9zIJZtnSZ6z5mq1SqXImLf~B7UEJCe54eZ0Whd6/e9PDhQ/VDZdnPs1Q6yxIDyP5obHlXqv9/BF99VZhrOXHiWZkI3jwkO9RZKWVWKuaEIA4BBRn1m6WnLgtGEqMGgzV~SNBgy4srvd37OSXWcfrUaT5u4dy5cxQsDRo14LE9X0DLEvF2BdTSqucKa8d5Bpv4wwwU1LZqGMfsQQGyCKs8QLwzrv0/xv8hWyT0AyZP5bNPPQFDhyDzyhXP1HhQKqN211Fg7QtU72/bsY1nfYMBBq9mtZpyyyvRBabyVa5QmStEBwuyuxio5ItBAwbR7Vu3XfdR3oV~Zhi75i3di5nRcBAsKKrWjIuFTtwsZgRDoyvmB9Nb4aJb3dyivhgijpGBoiCWhyFE6mQH1HTRpqP9eWvWreHTwABKEVCP5Q2InkLkEQO4gwFX2No1a8vyFklAILQDL05vnM0b2Fn179vf6/chaorqBn9zqPGZwWcnWLBj23dgH5/hrMISEVVTDSAzfrD2kMZxBeCCHTCEjgz04iJWB69OXa0OIEQ6YdIEruMHkGiBnqD6qqcGiY49e/dQkqRJKBjwuzRs0FD36EOJxBMY0LR67eqg9Qb9jY9AUnHZymVuiudqMFCrUYNGZBT4vKIkTeVV4oOSiRnBL8lEzDaAw0il8oKtL1qEjKqFUsCkNcj45MmTh1q3be3myaHAWh33UIMsGIqcg21eh1FH/NGIrJ5Egulra9ev5Z5aMGAM58QJE71~H85Cuw7tqHv37m7zT1BfO3L4SMM7lPr060O9~/RWP7SVGcAaZCKmGUBm/OD1wftzacMHOlnNH4hfbNi0Icbj6BTBm~kJ6J9h25s5c2YKBl//h0QSKPAAEcaBHH8wdOnUxW~TAbwyeGgJ3k5At2/f5m1woqDjasasGbyXGF1ZnsBWGF6gZvIeRmtuIZMwMwmCFK/L~CErGwrjB1Kmcu~3RlIEdUveDBPqmzD1LRjjh/IAVPZL4ycJBT///DPVqlGLK8wEAzo~/AkooMTs1s1bXNBA1Pjhs4SKjJNnTnLFmJlzZnqNYaI6onPHztqHZ7DPUmjH76kwxQCyP6gZuymu3EdZSudOnX0~58M6H1L5CuUpEFKmiDKAmBuCq12~PPl43ZI3Jk6eGFSKHydMqxateGW/RBIqULqFhOGBAwcoUOB1rVq9SncdrAiYenjwyEFek4sdFUDnVN/~3ifcQeF92ZJl6ofQrD~STCLkW2Bm/DAqCt3Qrugqmv999b~i7u7chXO8bQ3Z3N49e~uevwvQ96s3rtixc0caFjGMAgW9x00bNaWDBw~SRGIGMGKYOeNPjcUXjx4~ovfLvM/LboIFscO~/fryOkJPpTLw9EoUK8G9Sk8gZn/2wll1rP4ftrIzb/I6hRgzPEDk313GLzIy0m/zP9puFAWK4iWK04nTJ7jen/KYP/QaP3iYwRg/eJh1a9eVxk9iKjAo2HEEo3iOKgcI~QZLwYIF~XYXajTe6gRhsKGYjooNT0DCbvBAt6Yw1AT6LmA0iJAaQOb9wfC5KRv06tHL53MwYBnDntVwWSt2dbl46SIv7jQCZNTQNhcoyIhB3w1xEonEClA~FsycHDQHTJw0kQIBqtGoUdy~a7vH7PSaj9ZwVXMYa4BWOii1ewP5AHTCqCjP7EfIM8Kh9gCh~~WalowXRVunpwW9kHlz5aXlS2OWqkD9GS/6keNH3KSwRIGgKa5~ceIEFmvFm9qkUZOgA9ISSTAg8da~bfsYLWsiNG3eVFjYF1tvhKi8OSO9evbiyQ2oms~Z9SwpiPERvtSU8DzFYEYzLTqEFjJCFgOMFjtwRWtREJwnVx6hQS64QsHgZc2a1eP3oZ4MCXlRIAIJHbRAwEnXumVrOZdXYhuwQ1q/cX2MnZNeEMcuV6YcXb/uO~SGGN3kaZOpXLlyPo~7~PFFKv9~VAITwiTYIiuGDzJbEP/1xphxY6hV61bqh/qzWOBYChEh8QCj~/pmqh9De5roFCsIhpYuUZr3KyJOoKV7j~40ZKj/aXFqWrZqGbDxAxBXkMZPYidQ5lW/bv2AVYZefvllWvnRSp6M8AUSL56MH0ZQQOJNKZnJnSc3HxIPkLnu2K6j69jChQtT3Xp1vf4fGPupEQwZwOxJyCachWoL3JgtV4MuJLHnzZ1HgQCPC89Fxwg0xbQgiwv1Zz3Akxw~cjgFCsYBqgUWJBK7gNIySL4FOgsHLXAoXPbFwP4D3bqbkASEeDFGUMD49u39rNxlwKABro4qGEh1SAtyXd5AAnNExAj1QxhRN5BChOEGMNr7c0vpDOg/wGdbGPp0kSVSCzJqgfJLy~Yt~Zt8//591~PILDVr0Yz8AVd88bLFPGUfCGgC9zULVSKxGhiPOrXr8BbTQMDIiCbNmnj9PnQA5855ljj86f9~4nF9BXxGlCFI~Lypk4xDBg/hn2FUgFStXJV8gVbVG9dvqB9qw~zKexQCDI8BRhc9u6qO1fEATyCxcf7ied7qgzhhREQELV28lHyB50DyXokr4AqDq5AvMECpZq2aFAh44xEjkdPaJE4AsfPtO7f7HFvpDWxZUbPnTZgYP/PU2VOu4WL4rELoVAFVHKfPnXYNWYJXuHhR1MgffMbR0aKHipUq8u4sFctYLLAZGYyhHqAn7w9CoL5A1biidIEG7AkTJ9CBQwd8StYjlrhu7bPpVM8/51tKDLJCgRo/XLXqfFBHGj~JY0DsHLulQMQ44LktXb6UxwU9ga024uAK2H0hrqeAKo6~faK2wohNvvraMyOs1/iB3bt2awunG4bCCzR6C9yaLVdADtp8/gZ8e5LUxhXswOEDfLaBekq9mrRp07q~9tUlAi9RZFCMGmTHYPyMqJaXSMxk/779XJgjEDJlyuQzVn740GG3Pv5pM6e5jaHYtGETV50pWqhoUMKuY0aPUd9FlfUgMhjDtsDMOuMVwIgzl9IzZhycPOG/UBgKF5OnTPY4xQ3GZ/CgwfxFVYCB3L13t6vJGmUp6vkGavbu38uzUhKJRAzE6rzVuiJef~b8GdfuDbFBTTeHIUAtBmNto8EgIGgGBpbp8YCRBhDDTaYo9/3F/rQgmYFuj379~3l0vy~cv0CLFi7iHiNkvpUXHlO1cufM7XGLCvccW2qJRCLOgwcPqGC~gl4HHzVu0tgluY9qDXzejR745SEWuJYZwHpkEIYYQPbHwz3FjD3XpOQaVWsE1CaGHsUpU6dQ6TKldR3fsH5Dj5XwmFl6~uzpgLs9JBIJ0YxpM2h4hPftMFrh0A8MkCzEyEyj8eAFZmVG8BYZgFExQPTSuIwfBp8E2iMLlQr02GL~wJdfelfHxhUHCRZvbUBTp02Vxk8iCZLOXTvzPl5vdOvcjcvBIfHSvElzCgWa8jM4W93JIIL2AJkhws/AHL~8ymOYyLZn9x4KFsT4mjZrSl26dnEbSo7sECSyvCnNYjh6MEIHEonkGVeuXOEdWd5AFhifRTglgYIaRNQQevsZKJVTiS78zlZS5gX~SEFihAGswG52K/cRN8iTMw8ZCWR2SpUuxd3g69eu8yyUtxcKdUoXIy/yeiSJRGIMECrQCJcGDT7XaIvDQHbI4vuaOocW1rHj3VqCI5gBHEZBYoQBPMJuXHLKvoYOgcpVKvNtq8hEeRH6DehHPXv1JIlEYhzoz82VI5chUw7RcwwVmvbt2/NYvQJCZ5UrVvb4HDg2kVcj1aM74f3BC/ydgiCoGCAzfoh~uowfXiRfIo3oxUWR5SeXP~FCBkbzTqJ3~NVEIpEYCzo7evfuTcHw9ttv08DBA~nytctc4Fht/ED~AvkpS5YsHp~LAuylS5aqH4IlbEtBEmwSxE3sdN6ceT49O4yoBJDVKVCwABnNyFEjvVawSySS4MDnV2mBEwHPgfDqpSuXqFv3bj5nHENZ2hsL5i3gzQkqekVXoARMwAaQ/ccIslVS7qMOz5fUPa4gSE4oYFq9kaDYOdB2N4lE4h8kJUeNGaX7eAxJWrh4IY/JY8ur7hZRQM5AXUBdrXo1SpQ4kcefB7mtDevdxt0mZasoBUEwHiDGxLvm3a1ds9bnLI7GTRu7vLO7d~/Sgf2BT7byxKjR~t8YiUQSGJUqV6Js2bP5PAaagRs3b6RjJ45x9WiMyvQEBI2h/o4ukn37osrZkBhp06aN15~NXaYG7zr7OgjGADZT31HL5GjBC9CyZUvX/buf3~WKLkZRrHgxypsvL0kkktAzYOAAn98fNnwYH2bmia~/~tr1NfQClWqOubOf2Q9v3iK4ceMGfXzhY/VDtYIRTA3IALL/MCe7ccm1YM7H7Vu3vR5foWIFSposqes~ujyuXL/CNQDz5A2~ZMbfGyKRSIyj7PtlfXqBs2fNdrv/8MuH3NtDeVzZMmV54TS4CdAdAAAQAElEQVTAdhdCrOD4seMuG4KxtvUb1Pf68zXJEOxCA56UFqgH2M7HLxQDjcY/B8KkGH6~Z98eLn9Vr369gMRKpfcnkZhP/wH9vX4P4TBFHh9A0R2zexDvQ~~~oiSD/n80OSjMmf1sgBJ0AbyBSXgaaa1mFCDCBpB5fxgc0Ei5/~TnJ7R~3Xqvx6N625s7rAB1F8hxwyvEjA/0A~tFen8Sifm8X~59r14gKkGQsVXAfBB1HHDG9GfS~w0aNeAeH4DG548/RjV3wG7g//AEEq5qJWpGjuhdqTCBeIAfsuWanrJ27VqfYqHtOjxzFo8cPsILHWHBPZXLIC6I3sNPIj~hlatXUslSJckXRYsVld6fRGIRffv19fo9qECjdg~gjRXJEAXI3R86eIh/jV2fYiNgR5YsXsIl8EYOH~m11RXgOA3NKACEO0GYpYXwnuuvKVq4qFa51QUUnq9ev~qaNqVWbnnnnXeoSdMm1Lxlc/61N2bPnE1Dhwz1~L11G9bxFjmJRGINhQoU8jqIaeTokdS2XVStMmSyMDlOASM8t2yL0vBEYiRblihvEgLIT39/qqtTbMeuHep6YmRXUjJPU0i6XcgDZMYP8syu2r~rV696NX4gTeo0rnGWUHaBSq0CrDxUY7NnyU5tW7f1au29Tb5PkzaNNH4SicV06Og9VoeYnjLoPFfuXFz4WAFCydgRjhszjooVKeZ6HCE1vW2y69e7hd7QVqJPQ0~FkAeoHXiEwCayO75AXQ8KlDGfYOOGjT6PhSJ0q1atqG79ujwNfv7ceapUoZLHY2fOnulzvqhEIgk96MzIlT2XW9JDDWYJ1/qgFv96185d1LRxUzIKNFfc/uy2Or44j30tVBcoagChceWSec6fJz8vajYabJ0bNGjAZ314KphGT~HVG1e5cZVIJNaCnRw8OU9kzpyZjp44yr9GzR8Kn5ENNoqt27dS4SKuoUzC22DdW2D2y6M/xeViQv01FMYPQHFi/rz5XrtFOnbqKI2fRGITIFXlrYTt~vXrvMYP/PrLrx7n/gTD1i1b1XeFt8G6PUBmAOFaugp1xowaQ5MnTSazwQt98/ZNr9PiJOJgrvI/f//j9zj0W/uaNYsT/NKlSx6/B1Vhve~Zt0Fa6TOk58N4fAFJJT0xJAThjeC3336j~/fu81GtIiRPkdw11zoc6NalG61aucrj94oUKUJZsmbh31dyAkaBBCp2g6ptsND8YBEDeIRU0leh2v76A3E/xP/ChUEDBvFC0VAByaEr1654/f60qdN4yYEeoOJz~Nhhr0bIl3IwpvjpKVlCP/l7qT2Pf1XHkzzhqyJBC4rw0YkkCjKWGM518MBBun//vtCsWzW9~/SmPv36ULigzfKaybad26hQoULK3SdsJdC7Dda1BWbGD5WKrv8Bbq0Vxg80a96MJMaBAdR6wZD440ePk2X4UFyPjIzUbfzA7t36/26AbOakiZO4KOjUKVO5sQ/U~IUjyPJinrAVbN/qpiKNbYbubbDeGGBFtlybfJEPjZFkyJBBFj4bjFKmoJe///nb6/d8zYQIZl6E62f4sID//vMvCf0sgd8HBbqoYR07eqyrjzVYnnveqHlk9sFTy6sZ7NixQ/tQBdKJ3nfB7QfC/beCQF7gL774giSSYEB8y~hzPhyTeB98~AG99tprZDZfPfqK7ty~o37IOAMYPfXN1ZSHGA3q88wGWoK1P6xNorRu2ZpvVySSQEAG01eve6C88Ly9DSASSaJJTnR8qUWPzeTgQbcLVAZmt1LpeZ6edwGyVy51AkxkswJMiEd9oAioI4R2WK8evWjv/r1kR9DRgrGCvrh77y6/ymnBRSFPHt9yYm8neJskgeNL5RxAuCNVylQkCrLAdgZiBpMmTOKtbEorqx6QpFqxfAWZDXqL27V3q4GGF~h3Nq4eA2iL7W8gcveLFizitxc/vsi7UKy6OvmiRcsWfPliyKAhblJBCokTJ6atO7aSJDTAC/JWiwoppwWLFvB5tt4Uj53K999/T~PHj~exT0hb~Ts/1aC8CKUpaHU1E5ROoStFNROoBukwgHpigDXUdxQxAzN5Pc7rXqVxvIEXY/Xq1a77QwYP4TVbEoleIM3kraYQo1ch6Bluxg~MGjGK13SCpYuXkgh4PXBRMBsYa6XgOpqSbBvsd0KaTwPIfgB0qV0dzJcvXxYu~DSCypUr84EsImDKvHqG6bfffEszps0giUQvf//lPeNrhJK5HUG8fOWKla77kKDHDkqEGrVqkBUoElvRwPj5VUvx5wEWVB9z7MgxsgJfxa/egLiilunTpnNVGolED5gz7Y1rV69ROIJ4uRaN~KhfChYsyDUAzebYsRj2qaC/5/gzgCXVd06fOk1mg~1vmbJlhJ6DAe2Q2tECN3no4KEkkegBpSopU6b0~D3EZI1s6rcDWzZv8ejtQcJetI6zSpUqZDYohFcUpaMJ2gC6/YCTJ0~S2ZQoUUL0KVxDEPJbnti2dZt2qpRE4hVvyTckCsqXLU~bNmwypMjbahAzHzhgoMfvwaE4dfIUiVCydEmygjOnz6jv5mHvjU8b5/Wb0U90tV2g/c3oRmY9lCkj5v0BbyKqCnDzw~GklYQezLP2VrQMI9i2TVvKlzsfl2jXK~RpRxAeQpzcGxrVFb/AcXn~~efJbCDsoSIBW~l9He/LOuKJriKys2fOkhVgBJ8Ijx4~8vu7QsnailolifOAYou/wVsQRejTqw/lzpmbCyUY1S5nFpjUNnXyVJ/HiG6DUY6i0ukzDQ~ffZ/bYF8G0O2JGtfSFNKlTyc0IQ546Av0COS81FliicQbnbp04pp3/oBSTL8~/ahQ/kI8ceAtDGM3MHPH12AzgG2waAdY6dLCCvVBgxnlT58~VT9U0tfxvgxgSfWdE8dPkNkEsv3du0dfxwcv9hw3niQSf6C2bez4sVyOy9cAL4V79~5R546dqXCBwjzmbOdwC~Lh/kZVKGjKTPxSuqz5BhDiHppETsAeoEu6FZPdza7sBiVKiiVAMIZPxFCjzQntchKJHlCOde7jc1zLD9UJ/vjss8~oZfOWVDBfQS4GakeP0FPZizcOHxZrg4UcfoIECchszp07p76bLnqWuUc8GsDoBIhr6jHk760A9UQioG1J5CRDrGZg/4EkkegFfbEQMr12/RqNGjPKa5mMGlxkoShTr049LiZiF1avWs3j4XqBZyX6~~cvkJ/MRlOj6WbLtHjzAJEAcenaIANsNpkyZxIWPwikTQ9G01PNoETiC3iAbdq2obMXztKsObMoVapUfp8DIRGUziDpYDVoCx0~bDiJcuyoWDNE/vzmG0B0r2jI6e1YbwbQ7QmY5G42gVw5RGMUCr179iaJJBBQ6lGnbh06c/4MzZg1g5IlS~bzeGyLq1erzpMKVoJJbj/88AOJcvToUaHjrfAAb9~6rd0JBmcArfAARbe/2GYEGqdE0HruHL/CERKJV2AI69Wvxz3CiBERFD9~fK/HfvbpZzRzunVzbdAOOmfWHAoE0WRozlw5TRd/RdLp5s2b6ocCN4CwpCKzFoxC9MoRbJ3i2DFjLb8qS5wPphZ26NiBLkZe9Cngu3jxYsvUifr37R9wrSKMt4ggCkRMME3QbG5edzOAWb11hPg1gDB~ZqfxkTkSHRkYbJ0i5H9GDB9BEokRxIsXj~bMm0MdO3f0~P0nPz~hmzduktmgn3/P7j0UDKJtcVbM8dHEAZEF9tgREsMAMmOH4cKJlPtWbH~zZstKohjRqbJ86XJLvF1J~DJk6BCvJTOIB5oJauR69dRf9uINUWcD5TBm48FuedwGe/IAE6vvIKBoNhiiLAKCuUadTDIh4htfAqC~vqe3PEl0Sp2e/9tKoBydOFFij9/TKJeEnGVLlxnyedb02/pF9PNsBJ/e~VT7kMc3wZMBTKW~c~/~PTKbLFnEXrDIS5FkFKdPn~bV~xLPBDr6EjOF9fD1119TINi12~Lc2XNeL85JkyYls0B8e/TI0WQElyMv~22dU5M~fXrTL1Doz9acE6k8HefXAN6/d5/MRvSKcf2asdt0zOCAPFBsQPTE9HX86695747QGzfylWX0NZzHyL8jWNBjjosyBqg3bdzU63F585oXG8NMY6OKsGFYbt/W70kiMZQ~Q3oyE~wkHj58qH4olafjPOWn3Q402wAiZZ4xY0ah5xjdqYIXbuaMmXzug0Q/b771ptfvQSUl7XtpqXWb1l6PgeKILy/F7LYqbPWqVgrNfIuixYpSosSJyAwQ14Zcl5HA6ciaVX~sHrs6s~PrD~4/UNdlpvJ0jE8DiDQ9RAPM5L107/G4iQhGe4Bg2pRp1KhRI9NO0nDgrbfeooQJE9J3333n8fsD~g2gEREjKGOmjPTqK6~6Hv/zrz953ZY/dZ5MmTKRmYRyWz0sYhiZBRIfRvchizodZnuAAIrdKkmuVJ6O8WkArdj~pkguVv6CN9ZD60vQQFhh2NBhvJQhnDH6Qw7PBp6cN/C6fnLxExIFtWR6BAj0oufvDtU2eeiwoZQjZw4yA5S8hELKTtTpEC1rMwKN/YrP3vM32HvqVuzrMwZoxcyDFCnFXqg7t~~E7Eq9Yf2GgD6sTsLoD3m3Ht0oFPTt15eMxIqsMbpFho8czvUFzWLQgEEUCjSdFn6xYhA8EiEaUmkfcDOAzJAgiOPq4XGCAbx79y6Fkh7depBEP6j5gjiAkUQMj6DSZczXljOSChUr0JFjR6h9h/ZkFhgD68EIGALEX0W6SUR3dkbw5RcxJkAm1D6g3QK/rb5jhWqFqKscqjdYAXJBUPdFn6dVpE6TmgoXjikvnjhJYgqWUHjPEAfImTMnDRo4iCugBAq2vaNGjwpJJ0Eo43tI5CH4DkVzvG8VK1XkCSAzQex~wvgJFErw2UubVt/fhTGZ8IADrfMMBA/aADHqjrQGMJ76jhVD0EU9QDPilMOGDKNq1avRa6~9RlbQvEVzvkKBaMJJLwh6r9uwji5fvsxLQpCRw44C9YD//evZ~CR8JyGXlcJFMHOWzCFtodLzd0OQ47vH35ETQbIJ8dZQAg9LrwFEyCF58uRceMQsPKjdxPAYbGcA8SKJEGoPEOCFnDRxEg0eMpjCDdHsoKjnlD17dr5Cjejv5ZR5HYFw5coVLnYaakRDZMmSJzPVAHoQN3lD~4D2Mug28ODxD~YbwDfeeEPoeLPilLNnzuYyQhKJ3RGRuQ8GDzE2n7z99ttkNhonzq8BdAsS/vBYXDAxGFBDJoqm2jtkIOAbqoyaRGIUmImtGQoUMr766iuh41EnajY/Pnbrt/ZrAOP7eHLIeettsRcIg6ghK2QWO3fs5HJCEokdQfvm4EHmhWlEFaWtMIAaDzBGDFBrAN1igN4q~kPF22~Jucg/fG~uhwpQVW9mJksi0Qu6l779xrzpjaJqNr5aJUOF5nfUbwAhEGo2bycQNICPzTeAkBOCrFBsRUQFxEz~~DN2iFd4AyVr06ZOfhM5OgAAEABJREFUIzMRNYBWxAA1v~Mr2u9rDeDLyhdWyAu9~abYFcKKJA1Aw364yOeLdkRs37ad7Mi6NeuEjrerfmCgoObS7IuTaIhM9PNtBD///LP6bgwDqC2DcR1ghQFEoaQIgUy1MgLICo0bM47GjBtDTkf0fcbkvYRviSer7IZd9QMD4eMLH9OWzVvIbETL5EQrPIzAnwH06gFawT//isXWfvnlF7KKxYsWS/l8ieXAkJtV9uLp//71V/2hMl~T8kLFkyduSVK/BtCFFVsEbx0C3vjnb~uSESikNWK~gkQSDKtWruLtmlbx9OlT3cfGf8MCA~heJRLDwbOXByiYXf37n8BG~xkFZIb27tlLEokVQD9x5PCRZCVPf9dvAK1Igmg8wBh4NYBWeICi7UmBzjY1ksEDB/N6RInEbCZMmGBZHFxBxANE//Wrr75KZqKJAWLb7mbYQtMJHyCiHqCVW2AFyHHNmzOPJBIz~fzzz2n~3PlkNb8/FRNcMHsbHLAHaKT6rl5EkyB2aWifOGGi6aMDJLEbDO6yww7oj6di9Ze~BmeFAg9bdJ8eoKXVpH/~IVbH9MKLL5AdQCYM8kMSiRkcOXzENrFn0VCZ2dMWPdgIt0yrTwMoWpcXLKKFnBi3ZxcgPwQZIokklCBM1KdXH7ILL770otDxZhdrv/yS77yuTwP48svmJoVFkwkvvij24ocaq~qxJLEHjBcN9RgIEV56UcwJMdsAag0081h9eoDuTzbZwIhuge3kAQLIEG3asIkkklCA9svxY8eTnbC9B~juxMXYf/v0AM02MJgPK4LdPEAwePBg0~McktgBetDRhmknRG2E2Z8Nze8XIyOijRC6HfDSy~YaQNEtcJw4cchuQI4IskR9~tknTuML0ZkgaGjv3bc3n/5mF6AKDs9IRLE7VLNQQgXaLu2oQvT662JZXbOl5DQeoF8D6GaeX3zBXA/rp/8Tu7pZ0VuoB8gSNW3WlBIlTkR2R1QUoFefXtS6TWuyE0XYP3QZNKzfUPdznCaGgLZLO84xERE4EJXPMgLNLjGGAdReBt2qBs32sETVJexqABHngDyRExA1BFYoeuhBdJyCkwzgrp27eNul3YgXL55QGYwV8nUaG~Y3Bujmgr3xprknO~IbIlc5u34YAeSJIFMkkQQDwkID~g0gOyKq72dF255Ghj~GC~rTAFoyxETATbZCXUIElMWEk~6cxHxmz5pt2uAvUUQdECvG7Gpk~GOoGGsNoFvnsNkeIBBxk81urBYFMkWQK5JIAgFD5CeOn0h2RXSImQ08QDED~Nablk9x8kvq1KnJzkCuCLJFEokoaK8UUVsxm6RJkwodb0UMULNN/1r7fa0B/NbHk00BVz0RkiYTexPMBlc9yBZJJCKgrXLtmrVkZ5KnSC50/Ndff01mo/EA/RpAtzmYVoyx~~LBF0LHJ0uWjOwOZIsgXySR6MUJbZUpUqQQOh71mmYjGgN0S4JY4QGKvkiibrgVQLZo8ADzBlZLnM2G9Rt4W6XdSZ5czAN8cN98A6gJ44nFABMnjjFHOOR88YWYByjqhlvFvn376Pix4ySR~OL333~nYUOHkRNIlTqVyOH06aefkpmgDS5uvLjqh2IYFzcD~L///Q~FgveV~ylSirm4RiDqAaZ9Ly05hZ7de5reCiRxFlMnT~VDzu3Oa6~9RokS6e90Qnmb2UIIHmxDjHoiTw2R95QvEEB85ZVXyEzu37svdHzWrFnJKUDGaOGChSSReAK9zDNnzCQnkClzJqHjrdj~amKU8Dx8e4DR3FPfSZvWXA8Laf9vv/1W9/FodRG5ElnNmNFjuKyRRKJl6OChpntJgZIhQwah463QMNSUyH3Jdrgxtl9~DaAVMbZrV68JHZ8ho9ibYSW//vIrjRxh7ShDif04feo0bdu6jZyCqAG8esX82cWaEN49T8f4NYApU6Yks7l~7brQ8XaSZtLDsiXL6Pp1sb9REt7Ytd/XG6JOhxXnu8Z23fN0jF8DaEUi5No1MQ8wR84c5DT69u5LEglYvmw5b5t0Ejlz5RQ63oq/zxADaEWr2Y3rN4SOz50nNzkNyBvt2L6DJLEbtElC6dlJILkA/UW9QOXpq0dfkdmkTOVmAG96OsaTAUS65lflTsZMGclsbt26JSSLlSZNGoobNy45jUEDBkn5/FjO~HHjLREJCIY8efMIHW9F/A82QVPBcs/TcTEMIMuUwPK4fmNUe0P40EyggSYaM8hfID85DcgcQe5IEjtBe~SC~QvIaYjuuC5fvkxmkyVrFvVd2DSPv4S3wQiX1HdEa36M4NzZc0LH582Xl5zIlElThAUgJOEBdgBok3Qa~fLlEzreCjXrzFncEqN3mGP3m6fjdBlAK7KsogawcOHC5ETQ~hQxNIIksYsjh4/Q/n37yWmgA0Q06YgSH7PJksXNA7zk7ThvBvCmjx9mCqIGEFtgswe5G8X6deu5/JEkdoB2yD69nDE1UEvhIoXphRde0H08tvlWDEPSeIDBGUDNDzMFiCKIBIfxphQsVJCcihPkjyTGgLifFZ0RRlCseDGh48~eOUtmA6V4TQmMmAFk~2UIB7oCU1YYQHDyxEmh40XfHDsB~aN1a9eRJLxBG~TYMWPJqRQvUVzoeNGdnBFky55N~5CwBwgilS8w/Dhd~nRkNqKxg5IlS5KTQSzwt99~I0n4gjZItEM6kQQJEgiLj1gR/8ud2y1L/TjaofOILwPo9puLZn6M4NDBQ0LHZ8~R3ZJJdkYBEQhkhSXhya2bt3gbpFMpV76c0PGPHj6izz77jMxGUxHiM7juywAeUd/Jl998A4gAKiSC9IIhzRUqViAng7pAkb9Z4hx69XR2nLdK1SpCx~/du5esQBMKO~LrWF8GENFLVztG/vzWFBof2HdA6HinG0DIIaE~TBJebN~23ZJ6OKN4Pc7rVKJkCaHnHDxwkMwGjRuaXeARX8d7NYDMm/qdVO5j~gzpKU7cOGQ2Bw~KvYh4k1588UVyMjt37LQkdiIJDWh3HDzQ2TNhylcozyXm9YJSHytGQOQr4LZThQPn86rjywMER9R3ChY0v8zk2NFjQtXyKNQsVboUOZ1~ffqRJDxAWANtj06mevXqQsfjAm5FQq9AgQLqu1eYI~dzsLI/A~hmPa3ot8WLKOoN1fqgFjkd9EIvXbyUJM4G8z2cnthCFcj75d4Xeo5VXS4FCroZwCP~jhcygJofbhpbtmwROr5ylcr8TXM6KJmAXJLEuUQMi~Dtjk4GnyfRsNKmTZvIbBCi03StHfH3HJ8GkLmP99jNbeU~3EtsMc1m25ZtQtPUIIMjmrGyI9BRwwwRiTP5~MLHvM3R6YjuqE6fPk1ff/U1mY2HOuDz/p7jzwMEu5Uvnn/~eeFKcCNA9fzRI0eFnlO3Xl0KBzBFDuVAEucRDu2N8ePHp5KlSoo8hbZsEtuxGUWZsmXUdyOZA~c38KrHAO5x~0/KlCEr2LJZ7EVFLVCSpEnI6UAYVvYJOw~0NTpN5t4TtT~szR0fvWCntnHDRrKCipUqqu/u0fMcPQbwMFsu2WLRanCj2LZtm/DIwCZNm1A4gHKCfXv3kcQZIHGH2F840K5DO6HjTxw/wUM3ZgPJPo1MvzEGkLmRMH6uZAi8qvfSvUdmg/7JPbt1/U0uGjVuxLtDwgEUR0MpW2J/kPX99hv9s63tCsrJUqVKJfIUWvPRGrKCMu~77UxhgXWVjujxAIEttsHLlor1UWJgejgkQwDkk~bPnU8Se4M2xnAZc9CmbRuh45/8/MSy2cYam3Qk2nHzS0AGsOz7ZckKUBQtqqPWrHkzChcmTJhA33//PRmJqLpHzpxi4xDNAhc7ETDZLBTAUxcN1dgR6Olpkgp~WbFihSV/O0reihQton5I91ZRl7Qrs6aX/vvvP0yL42cNEgxvvPEGz86aDbzAYRHDdB~PrDXa~G7fuk1OB2GAUSNG0ZRpxhXWjhw1kpImS0r//uN7Ct//nvsfVatWjb~WdgShmZWrV1LkpUhdx1epZvzO4NSpU7yNMRzo1LmTcPjIqsJ9TfID7CKd6P4LmQGcym66Kve7delGq1auIrNBo/PVG1eFCjNRi9WhXQcKFw4dPUTZsmUjiX1gnw8qWrhoWFxoUfpy/dZ1od5f7M4~qPkBWcGqNauoXDlXcvYsM9y6e3b1boGBW3SzZq2aZAWPHz~m7Vu3Cz0HvytUIsIFWRZjP6DzFw7GD7Rq3UrI~IEli5eQFcBYq4wfEKqXEzGAkMe6o9wpWqwo3wZbwYzpM4SOx7yQzl07U7gA~fzNmzaTxB6gXRFti~EAdlYtW7cUes6DBw8s2/pXrVZVffc/tjaQALoNIHMr8cNdDX4ojrTKC0SBqei8kOYtmmvrhBzNsKHD6OnTpySxHsz4sKL2LRTUb1CfEiZMKPScWTNm8RCAFWhs0Dlmpz4lAUQ8QODmXtaoVYOsYvZM8VKDnr17UrgAufEZ08Q8YYnxoE0RU97CAWx7e/fpLfQcJEJXr1pNVgBDrVF/Fi5CFDWAbttgDCNP/G5isoJ9~/bRp3eEjD01bdaUkiRxfnucwtQpU7ncksQ6MN8X7YrhALo~RD/PixYusmwnUr1GdXWmGi7oRySIkAHUboNB3brWiQ7MmjlL6Hhc4fr0c~ZAak~g5mrI4CEksQZchEVFOuwKkgndunUTeg7OvwXzrPN~mzZvqr57jNknYW9A1AMEqH35z8svYSpr16wV9oAQ49AMTXY0mzZu4rJLEnNBW~Kg/uEzu6Vv/74UN15coeesWL6CfvjhB7KC7NmzU8aMGdUPLaUAEDaAzMpiTsgx5T7KSzRV2KaBk3DKZLGi4Oeee44iRoRHo7oCtmESc4FMmWhXkl1JkyYNtW7TWug58P4mT5pMVtG4SWP1XWjvr6MACMQDBEvJ~y9jKsuXLRf2AqFwqwmeOprLly9bUpQeW0E74rix4yhcGDZ8GIkC788qwQeEsurUq6N~aAVzzAIaQBKoAYTMraspFYIDceOKuc9GAS8QyQBRJk~dzOsDw4URESOkfL5JjB45mrclhgOFChfy1ErmE6u9PyhUa5Tp51KABGQAmbXFu~9yOV5~~WVLFZjRHyzqBULmR1TrzM4gFjNx4kSShJYrV65w7ydcmDBxAolipfcHNDtOtL5dogAJ1AMEi0iVDLFSfBRe4LSp00gU1DxZVcYTClCQeu/ePZKEjnAaVwpDkiFjBqHnoORFNO5uJOnSp9NOpwzY~wMBG0BtMiRT5kyWJUMA6pFEZ2fAjZ42Xdxw2pmB/QeSJDRs3bKVzp09R~HAO4neoYjh4slAtKFaWXvarr3brg0p6ICSHwrBeIDAzfp27NSRrALFqIMHDCZRSpcpzQsqwwVI54vOUZb4548//qChg4dSuDB/wXzhshcYPiu7j9DKWq9~PfVDKwNNfigEawDRePylcgdCqXBRrQKFqadOniJRxk8cT/HixaNwoVfPXnFtvTwAABAASURBVEJjRCX~gefz8KHfIWOOAH3xgezWrJ5x3KqNm0rN32yJBzA1BGUAmfXFLzFJdZ86dLRWd693r97CjdnQGBw5OjzUPABkmRYvWkwSY8CM22lTwiNUguTf8JHDSRQkf6yccYxZ35DpUrFRz9hLfwTrAQIMqnis3MEgIitVV/DhhzabKOgQsWrWSSgYN2acJYrd4cjQoUPDRnln4eKF3JiI0runmEiC0TRo2EArvyde~~aBoA1g9B7crSGwdVuxqnKjGR4xnL79VjxNP2P2DMs0Do0G8kyoV5MEB9oMN23YROFAx84dKUfOHCQKpO6tbLfEzhK/uwqUvpwhAzBkZiTbciZjN~gL4pXFUG3OniU7DxxbBbo9li5fSqJAaLRNK7FpWHYFbX/HThwTLnWQPKNU8VJhMeAco2yPHj8qrPT81aOvqGD~gnzWsVVA9HTxUreQTn1mAA2Zv2nEFhgWGokQ1zh4xNSs9gKhUBvIMHEILIZLVhiZ8b59~pIkMDDjNhyMH5g7f66w8QMdO3S01PiB/gP6q~/eIkHVZ18YYgCjQXOkK/uAqVKBxBqMBIObfv75ZxIFbXJp30tL4QCUs8NlUpmZ4EM/bMgwCgeQ4MuRQ3zrC6Wh48eOk5XA~9NUloyNTr4agmEGkP1Sn5CqKBGJEKu9wO~~~y6g2i2UxKxZt8ay/majQXE0umUk~pk0cZJlUk9GglBQ23ZtSZQff/zRFl0vffq6KR2h08HQPkQjPUAAgTSXdUZhtNVe4MoVK2n/vv0kCsoFEEMUnY1qR1C/NnuW~AiB2MqXX34Z0MgFu4FzePbcwP6O9m3bcyNoJdWqV6OMmdw0/0awz6OhBa6GGsDogSQukQR4gShetBq8md98I96~g6HqgdRM2ZHJEycH9BrERuAx//23YbssS0Cb56qPVmlVU3Qxb~48OnjgIFlNv/5uHqjh3h8w2gMEqCh2nT12iAWiJKRVi1YBzW5A72E4JEUQ04JklsQ3aCPctXMXORnsWpavXE7pM6QnUW7evEkRQ60XDMZnThP7G2i09wcMN4CevEAYQas5c/pMwBpms~bMoqzZspLTwQgBVPRLPIP2QbQROp2JkydSiZIlSBRcJJs1bmaLeLEm8xtpVNmLllB4gABeoKtpEEPJ303yLlkNuiNOnxYXCoDe4Zq1a8JirnCvHs7/gIcK6Eqik8jJIOERqDQdzo3PPvuMrAbttJoqjJCpUITEAEZ7gdOV~4hDDB9hj1hay2YtA~oSSZQ4EY~pwBg6mYsfX6SNGzaSxB2EScaOHktOplLlSgH3tKN91MpeXwXUEGtmE59n9mQrhYhQeYBgFFvfKXdq1KxBBQsVJKtBaUzTRk0DCnLnyZuHG8EXX3yRnAxGaVpd3Go3YPysznoGQ~nSpWnRkkUUCJcjL1O/vvYQekXSMU7cOMpdxPxCqrEXMgPIrPYTduNWxDNx0kTenmU1Fy5coOHDAvNIEVtBgPn5558npwI583BRNzGCWzdvOVo9p2ixorRi9YqAZtzA6Deo38AWWe~cuXJqR2ssZHbkPIWQkFoj9ssvZTdnlfvoSYUWmR2YM3sO7d2zlwIBuofoTbSDMQ~UmTNm8no3SZR~YiAVAnagQIEC9NHajwJqc8Pf3KRRE0sVntVMne4m8AIHKuSDl834BHdV3~k/sL9tkgltW7el69evUyAg3jJvwTxyKpjsNWTQEIrtoF8cFQJOpEiRIrRu47qAy8ygmmSXv71Zi2aUJUsW9UNDmAP1PYUYU9oc/vvvP6SwXb4tgvDt2thjIhuy0/sP7qdEiRJRIKDPtmXzlo5VYN62YxsfjRgbQblHkYJFHDngvHCRwrRuw7qAk3KYp92ze0~yAwkTJqRzH5~jOHFcsb~bbGUNRd2fFrP2cN0oaoAJ54PaH1Cp0qXIDkDup84HdejXXwOb84peyxWrVjg2Jojtn6iCdrgwb848Rxo/xKGDMX5Hjxy1VTkURlKojB/obIbxA6YYQPbHfM1u3F7xqdOmWt4hooBtcNPGTQOOA71f7n2eGHEiqHtbsSx85tzqBdUAEyc4b44yzrUNmzYEbPxwriPuZ5eLHv6eKlWrqB9axuzFATIJ06L40QkR1xjNJEmT0IBBA8gu4KoYjHZeufLlaOPmjbYx6iIgFvTLk18oNjFqxKiAvX6rgDhAMBfaRw8f0Ye1PrRNCdTrcV6nKdPcZgxjxkcPMhGz05hQRnB90tq0bUPZc2QnuwDp72BGH0I8YfPWzeo6JkfAi4DHOLsIWAS0A65auYqcRP2G9fk8j0BKXQCEMKpUqhJQE0CoGDpsqDb23ok5So/JREzXemKuN~KBLrOPk7F0idJkJ/oN6Ec9ewUeIL527RrVrFbTUYW1KOk5fe40pUmThsKd8u~X5x0xTqFNuzY0avQoCpTvv/~eKleoTJ9//jnZhQIFC9COXTvUD61lxq8emYwVhWyYrOzaCmfLlo369reXbDu6AmbNnEWBgnT~voP7HDWLA/HP/n37U7iDmS9OMn4TJk4IyvjhIly1clVbGT~0xmpKyOD1WTJP1xK1T~YFQqfnlnIfH75KFSpZOnnKE2PGjdHOIhUCQ6Q7tu9I27dtJ6ewes1qHpgORzCkK3fO3LwTxu4kfjcxrf5oNWXLno0CBeMgqlSsQjdu3CA7MXP2TG3HR2Pm/a0kC7CklYH9sZDc6K7cx/YLfYx2i53BI1qyeAkFyquvvso7RmBIA43dmE04y~dPnzrdEcYPdZmY5heM8cNM6OpVqtvO~CHjqzF~a60yfsCyXi72R6PvxdWLljRpUho3fhzZjT69~vB6sWCAF4l4BxRl7A7q4hYtDKyp3s4gAzptqv37nzEDA8Xpb775JgUKjB88P7tNtEuSJAnNmDlD/dBXbLUnC7F04AXbCkMk8BpbrncbXRXbtm4juzFy1Ehq2158uIwaxGPat2lPBw9aLzfuC5QnXLh4gRIkSEDhAmY9I/5nVyADtWzlMipYMDjFJAxygud369Ytsht79u3hikoqyjNHSHx2rYFY2s3P/nhcAdyCnyiQRo2g3Rg0cFDQg3JwVV~zfg0Nixhm686RX3/5lUaPHE3hAmLLdjZ~EDQ4fup40MYPxd1IeNjR~HXv0V1r/KZZbfyALUaeaXuFIyMjqWypsmRHunTrQoOHDKZgQSYSYgz37t0ju3L42GHKmtX5owDKlCxDly9fJjsCcZAePYOv/X3w4AHVqV2HPvvUekVnLZDrQn2sCsxlyMsM4J9kMXbRc0IcwNWUiSHO02bYM16DQHrjho2DrqbPnSc3v~p36tLJtrJa4VAWg4JnOxo/xMN2791tiPE7dfIUr6W1o/FD3BuJQA2N7WD8gC0~eezFQMVwbbZcVqVBwwbUuEljsiN7du~h8mXL09dffU3BgLY5VMPvO7BPOwPBFkAqaeuWkKmRhxy099lxEl7FShX5xS9vvrwULKtXraaa1Wvybh67AY1ClPJoEjrt2ec9kmyCbVwP9qKgOrW1~rFxE8YFVQoQSjA~sFSJUvTJxU8oWHLkzMHLHuAN2K1cBq2BqJ9zIhMnTuRJAbuQPHlyWrJsCe/njRcvHgUD5Nd69~pNXTt3ta2Y6/SZ07WtrvPY53wu2Qhb7b3Yi7Oa3bhqYTB7A1eQN954g~wIbzGqWJnWrV1HwYKrJeJBB48ctFXc7eHDhzRj~gxyGuh8CLZ8yShQD9qnXx/eaqhRPgmIx48fU/Wq1Xnvul1p2rwpl71TcYKtzmQzbJEEUcMSIjDKqIOprDx26tQpntq3M5D6h66ZUcycPpPGjR1HT58~JavBVv38x~d5d4JTaNSgUcAjD4ykZq2aPOtvVGUDEoT424INv4SSfPnz0a49bsPlv2ArD3NwviObYbvoO3uR4M83ZOuB8ljhwoVp7nxbec4xQMdIhXIVuFdoBEiOoBavXn3T~8NjACM8dGjIRrMazulTpy03ftj6oe5t/sL5hhm/LZu3UKXylWxt/FKnTs3bKVVgPnh1Oxo/YDsPUIF5gggewG2OqzwGAUsMN7czyHqtWLmCcuXORUaBiv6~vfrSuXPnyEo8FLLaDsTGihctbtmAc3jJgwYPojp16~BiTkYxoN8AWjB/AdkZFHNDBCRlypTqhy3r89WDbceasRcNtQsIIrgivL1696L6DeqTncGELQg7YAtrlOouYoI79~zkAfSMmTKSVfTtbS/VHk/AE7fC~GHQF2banrtwjve6GmX8UCdavEhx2xs/hEnWb1yvNX4RdjZ~wLYeoIJWPxBXeKT9sc2xO0WKFqF58~cZ2gMMo7pr5y6aOH6iJb2eyOzZ9SKEHti8ufKaWhLyzjvv8HBFs~bNeLLDSFYsX0GDBgyy/RB7GHtsezEuVsUS9ngLsjm2N4CAfeghnOAar/nk5ydUvlx5unP7Dtmd~PHj05x5c0IiMYWJdJjve~H8BTILfODPXzzPNd3sRr8~/UwTckiRIgV17NyRXwyMNnw4v9u1bcdHdjqBSVMmUZOmTdQPwTspwQyg7WWFnGIAsVXfw5bLikDiu8L7FRwz3BsnSMTwiJBIfkFVG33KKFo2Q8qqc9fONGSovWYK37p5i8f~Ql0Th2mGGOVQpmwZQ2N8CgcPHKTu3brzaYVOoFv3bjRw8ED1Q/BKCpsx09cIHGEAATOCqBw9zparshLSTejIcIr0/DuJ3uFiD6ESHMW8B9SGrV69mh5~~ZBCyYVPLmjjPZZSo1oNOnniJIUCeHjw9Fq3aU3vpXuPQgG27xjKtWnDJnIKqFCYMcutRhRGD8bP/luzaBxjAAEzgqgngBF0Da64cvkKVa1SlSuYOIXqNarzLhcEzkPF6dOnae1Ha2nr1q0hmfhWoWIFPg/ZDiAmirGmRoP2xJatWlL9~vVDKta7Yf0GLkSLAmengIJuiBir~thRsFqWGb/QXIVChKMMIGBGEMYPRtBVXIVmcFTGOwm0Qg0bPizk/c6o4du1YxetW7eOb6~MBAofUPqwmjw583A1FCNAjLNqtar8Ax7qvw0ZXmTWDx08RE7Cg7rL3xRV67eLHIbjDCBgRjALuznKlsuFgkBBMMPNrQIDlBBENqO~DnpxGzds5B5H5KXg~9Ex9OnEqRNkJTOmzeBzjYMB70H5CuW5SEHOXDkp1GAe8YTxE2j~3PmOGz~A12fr9q3qJBiMXyNm/NaSA3GkAQTMCOZjN3BpXIXSa9espU4dOpETqVW7Fg0fPtw02fwvvviCZ5Fx4YDqC8qLAiHYwVHBgK6b3Dly8~FTIkBwAnM3sI2vXLkyJU2WlMxi5YqVNHL4SFuJNOglU~ZMtH3ndl7ZEA28jQZONX7AsQYQMCNYkt3sZusV5TFkQlu1sOYDGSwoJu3StQt16NiBy9KbBaaHoeQCSQR4hsgq6wVCFSiLsUKwonPHzrTmozW6joW3Wrx4cb59K1asGMWNF5fMBOGH4cOG0/Xr18mJoLMJhc5BxFFzAAAQAElEQVQq4wfaMONn7wptPzjaAAJmBKuyG8ixuIzggQMHqGmjpvTnn7bQXBQG~mmdu3SmVm1aGV5jppdLn1zixhDN95cjL/NbbyBRMHb8WDIT/G5lS3tWDcfFI1vWbPxDi8b8YsWLWaYodObMGRoZMZLOnj1LTgVDzNeuX0uvv~52UR7AjN8YcjiON4CAGcFS7AbDd13vELZ1dT~sa/sqel8kTJiQuvXoRk2bNaWXX36ZrAaeIYwhWs0~vfMp3X9wn~7fu88TLafOnKJ06dORWUB4ArM~UJaSJnUaypwlM9~iQU3cDuKyuICMHDGSjh45Sk6mTJkyfFiT6vxDf2cfZvwmUhgQFgYQMCOYn6KM4DvKYzgJa9WsxSvrnQwa7Nu1a8fbrczcGusFNYcoh3g3ybtkBoj5PXr0iNKmtZ~K9vFjx2nO7Dm0f99~cjrQ89OoMCHhAXEDfXEHBxA2BhAwI4gqVdQUJFceu3H9Bn1Y~0MuUuB0YPxatGxBbdu1pUSJ7D9jODYBUdw5s~bYbhZvoEDQdOIkNycPsuC1mfHbQWFEWBlAwIwgjB~MoKtkH8avXp16YXNygtof1uZN~CjhkFgDCsw/~ugjmjVzVsg7b8wEqjbtO7jNK/8/tmox43eYwoywM4CAGUFsg5Edzq08hlhgsybN6PCh8HoPMV0Ofca1PqhlWcIktnH~3Hlavmw5rzgQLcGxMzh/li5fSqXLlFY/DPXVcsz46S8NcBBhaQABM4Ko1NzAVkXlMRRJDx44mObPm0/hBlq1PvzwQ2rWohllzpyZJMaCUiHUmcLw3bxxk8INxJnXrFuj3VFco6gOD/vN2zSIsDWAgBnB59kNrJ2bLhl01np272mYYKndwEkMj7DmBzX5JDJJYCC7DWn9TRs30YH9BxxbVuUPXDDXb1rP2wBVIH0N42e/eZsGEtYGUIEZumHsxm2oBbbCLZq3CIlQgJ3A7NkaNWtwg4iyGol/YPQ2b9pMu3ftdnQZlR7Q9wxFF02N33qKyvY6cx6qALHCAAJmBOEFzmbLVdAELcEGdRvQjRs3KNyBdh2k9VEUXKRYESpcqHBIFU6cAsIiUBQ6cfwEnThxgqvoOElZKFCef/55runYoVMH7bcgPtyDnS/huT3SEGsMIGBGsAS72cKWW1uASEtVOIHGdhhETN0rVKiQLWsMQwG6WqAgBKMHg~f0OlFRMLwIxc0FCxbUfqszM3wzKRYRqwwgYEYwBUW5~PnVjy9fupz69~sftnEef8AjyJEzB59jUqRIEf7hCAeDiDjv5cuXucFDrzNmySChEVvJly8fLVm~RFtHikxvPWb8nN22EgCxzgAC9qF4id2gytNtUj36S5s0bkKPHj4iCVGqVKkofYb0XEggQ4aohft2nAcCPvv0M7pz5w4PaUAiH~16t27dssVweTvQrn07GjFqhPZhGD0YP/sOGw4hsdIAKjBDWJvdLCaVpBa8gx7devAaL4lnEiRIQClTpaQkSZLwLHOy5Mm4scTjb739FiV4O4Hh3iOGgX//w/f0~IfHXPz0yy~~5JJeDx8~pAf3H/CvJZ5B8mvWnFl8nokKxPgwZHsQM36BaaGFAbHaAAJmBNHBv5GtbOrH169bT7169Ar7LGAoQW0ZjGH8N~JzrxFyXyi2ffU1tl55lT/29z9/0~~//c5fZxQV41ZZ337zLf3w~IdYkZQIFZg/g1GmuDipgPY~REx3Uywn1htAEF00PYutZurH4VW0aNaCiypIJE4CF5qIERHUvEVz7bcg4Q3jd58k0gCqYYawEbuZw5arPgRKyZMnTaZJEyYFrJoskZhJpkyZeEtbmrRp1A9jyzuJrX6xecurRRpADcwIQmMJEt9uQzqghdexXcdYUTMocSYvvfQS9ejVg6uKv/jii~pvQQqpCTN8zpi0biLSAHqAGUGcPaPY6kWq1wge4IzpM2ji~In0xx9hXyQvcRAYqjV7zmyt1wdg9GD8nK8HFwKkAfQBM4Tl2M1Kttx6yDDOsF2bdlyRWGJfoJSDZEvk5ciwbXlEth0dHYj1odtHQ3f22FSSeEUaQD8wI4j02Wi2MGnpf6rHadmSZRQRERH2/cQAw4QwVwOS~EbN4A0FaPdr274t733GlhAguzxl0hSaOmVqWAlglCxVkmbOmulpkiDmZrdkxu8OSXwiDaBO2AenGLtZxJbb4AvM2h06eCgvmwlXunTrQn369nHNhciUPhMfSekPZCJTp07Ny14wO0TPc9Tg/8uWPRv98ssvvKj577//9nk8ulg2bt7Iu1o8AYGDNq3akNNJkSIFFy2tXKWy9lt4gRG2WR5benmDRRpAAZgRhAWAqgxOMrcoM7bDkNi6du0ahQPde3TnHgaKnPGBU/jpp5/ovdTv~XwuDNfosaO5UKuaffv2UYe2HfjP8AUGHY0dN5YbNMzwBfDipk~dzjPynobfI~h/7uNzlCxZMn4f7wcGY9VvWJ/3viqUKl7KscrguKB07d6VOnXu5GlI1mq2ujLDJ3aVieVIAxgAzBCiaBqxldKax7nW4OiRox05~FrN/oP7uViClgvnL1DF8hV9Pnfe/Hl80Lsn0Jdb4f0K9Ndff3n8fpKkSejkqZNelWoQdujVs1eMx0uULEEbNm3gXyMkkSFdBt7XjULg1WtWu44bMmgIH1rkNCBpNnLUSE/bXYiVdpAZ3sB4jiTCQB6crTLsywZsfal6nHs9Zy~c5UNlnMyEcRNo/NjxNGL4CLet6~3bt30~D6Mx1cZv7py51L5te5fXlz17dqpTt47X5/fs1dNl/CBX1rpla67CrIDX9e23347xPHWnw7///esStYDii5o33rRmPnCgIKa5Y9cOWrBogdb4QcKmL1tZpPELHGkAg4CdeB~xmwwUtS129czFjx~fT9S6ev0qn~KmBOOdBLarE8ZPoLmz57oZl08//dTn89SS6ojbYQTBhvUb3GKkWbNl9fp89WzhFctW0JbNW3ho4dtvv3U9jhnAWhAnBChVgvetGEntzI7vvv2OnACUeZavXE6Hjx3mg8lVYP~/kK332Pk3PjaIloYSaQCDhJ2Av7E1nKIMIUpmXMFnXLHHTRhHFy9dpNZtWttiuLko2iHjd277TixiXq~CepuLfl9Pj2tBllkBPcSu56sM2d3P78Z43smTJ6lg/oKUNHFSyp8nvysEoZ2ad/bMWbIzqOdbtWYVHTh0gCpWihFqgHJLbna~tWbrW5IEjTSABsFOyC/Zasy~LExRJ6oLGEIkBS5GXuTjBp00vS1dOrekN5eb8sW5s~d41wyAdFbxEsUpW7ZsfIynwo7t3kfLLlm8xGUgMQi~Xv16NGrMKEqZMiV/DIOJsDXWgrgf5LC07YoY7q0ATUDld7Mb8PLWbVhHe/btoXLlymm/jTgfZvKWZCuSJIYhkyAhgiVESrKbMWzFkN1FTA1by0WLFtm~hhAxuX4D~vGvYVySJEriMQurBtJYiFtpA/ZQeBk7eqzfJAQUqhcvWxwj1odtcK0atbjWnx4w7OfgkYM8k4zfuWypsrYzgEjeIOOOjLcHIFgAAb9lzPD9TRLDkR5giGAn7BG2CrEvkRFwq41BTG3QkEEUeSWSG5c333yT7Io6JgcPy5/xQwKjY6eOFDde3BjfQ/vgkyf~5ecRI/QkuoqpZUePH/WaYVaD0p2NWza6ymiQ/bWT8atQsQI3zshcezB~X7HVia307BxaJI1f6JAGMMSwk3czu8lOURljt/1jvHjxuIcVeTWSSxdpZMptAWryFPxtf8G8BfP4bGIYsIsfX6SUyVLywmlIi8HQT5k2hTp27uj1~fUb1OdbXoQJHj9~TB/U/IDH9ZCUAShynjptqs/EEv4fzLhVkjcQt503dx5ZzXPPPceN94lTJ2jFqhU8I65BKWROy86bWWzFzvkMJiINoAmwE/nf6IxxJoryCI~pv48Pe4eOHejqjas0bcY03sNqFzJmzOj62p8BxJZXHb~CcAS2vdjyI3an0LhJY68/A4XLCjBcx44e4yUtUyc/a2nF6~WpRhFAdBXGT/Fcz587TwvnL~T/J~Tgt~7Yyl9nD32zIQMGGUYfhdqokcSIAQ3X2WrHVgr2e01i63eSmMILJDGNaB02eISbo4upu1OUZ~hKDzdo2IAvxLmWLV1G69au89s5ESpQlKzOXPvLACd6x92DVSvmqLe~SkLD4/~ZJInra/X/rR1k5G3G8cTJE90uIPny56Ptu7bHOA7ZbZTphBLE92B40bKmbMVVoFpgJ1vT2XmxnySWID1Ai4gupsasYvRuDWLLbRITvARkjq/dvEaz5872NMIw5IhmgCGSoM7CYui24mmVLFnS9bivLpmbN266vq5eozovBYEIQ7fu3dyO81aPqDagWvC73b51m/cEYzsaChDGwO~KjD/ie/gbNMYPV4LpFFXHV1UaP2uRWWCbEK1BWJOigt/FPB2D8g~UkOzcvpPOnj0bcmUTGJ/xE8bz2R4gdcrUfrPWqz5aReXKP9sGI/b3448/usW7Fi9aTH179/X4fNTBoRTEF4cPHaY6tT13k4wcPZLatmtL33zzDV2/dp1uXL/B~7PxNSbE~apBDJSkyZJSpUqVuKdXsFBBb2IMUNLF2AUIFcSuQcQ2RhpAGxK9PcbIzoZseZxBCS9q185dfB09cjQkH2wFxNXee~89XSICiAMuX7HcaxwTvcA1q9X0OZsXBmxoxFCtqjFn/779fJC9Ny8SxhpF16EOG8BDV4weuja8AHcY~~~ZzOgdJIntkAbQxjBDiMZVTLVB2jStt~MwNe3w4cN87d29l3s/VoLtZeOmjbknGOf1qL5eSFkdPHCQ5s~b71fWCsCrSpUyFdWuU5uSJk1KR44coUMHD7ltkc0EF4HCRQrzuB5KWNKkSePr8B/ZWsLWVGb45LxOGyMNoANghhDvE2aUVGerBltZfR2POBc3iGyriO4HbT~sRB9ooytVphSVKlWKb2399HSjdm8bWxgofVCWsDgDaQAdCDOISKN~SFHGEMXWPiP6UEQ5feo0nTp1iuvkSYPomUyZM/EuFBg7KGBrZul6AjEBGDwYvvNShNR5SAPocKIl~yENXI0tZB/i~DoemVAIDpw~fZoLA2A5XbswEODN5cqdi/fgIsOO5al7xQOo4YTB28wM3uckcTTSAIYRzBhij1aKooxhVbaS63ne/fv3KfJSJEVGRkbdsvV///d/FC7A2MG7Q7IiR46ohfs6ZcqQTdlLUUZvFzN6P5IkbJAGMIxhBhFxQ3iHRSlKlEGXiwMw~Q6GEOUjd~/e5UYScz3s7C2i/S5FyhS80BqzSNANohg9Qc5RlKLPHmbwDpEkbJEGMJbAjCHihCjGKxK9YBR1eYhq0NoG4/jg/gN~i4zzzz/9zD1GlJ7gVrmP~r9gwbY0frz4vBgaQrPx4sdzfZ0gYQJKnjw5N3gwfN66Q/wAV/c0Wyej1xlm9J6SJFYgDWAshhlFdKHkANBaeAAAANBJREFUYytz9EKvMpp/DRUsfPLzE3r6x1PeGvfH0z~ivma3f/z5Bz33v~d4iQna3l559RV65eVX~C3uh0A38Ub0uh59G8mMXXhMsZIEhDSAkhgww4iaQ8UgouAtdfRKR/YHGnqQjL7HFpIUKBy8Lg2dxBPSAEqEYMYRzbaKQUQ5DrzIxJr1CoWGh2x9Hb2~il6Y0s4NHjNyn5FEIoA0gBLDYUYS3f9IsaKXLdhzDD1~fzLjFrpeP0msRRpAiUQSa5F6gBKJJNYiDaBEIom1/D8AAAD//8WXuqgAAAAGSURBVAMAHm7VMwdy/aQAAAAASUVORK5CYII=".split("~").join("+");
window.__LOGO_STD=LOGO_STD;
Object.defineProperty(window,"__CLUBLOGO",{configurable:true,get(){return (window.__VEREIN&&window.__VEREIN.logo)||LOGO_STD}});
const STD_TEAMS=[["a1","A1","U19",1],["b1","B1","U17",1],["b2","B2","U16",0],["c1","C1","U15",1],["c2","C2","U14",1],["d1","D1","U13",1],["d2","D2","U12",1],["e1","E1","U11",1],["e2","E2","U10",1],["f1","F1","U9",1],["f2","F2","U8",1],["g","G","U7",1],["minis","Minis","U6",1]];
/* Rechte einer Person in einer Mannschaft (Liste), unter Berücksichtigung der Kaderfreigabe mit Ablaufzeit */
function rightsIn(me,rolle,tid){
  if(rolle==="admin"||rolle==="jugendleiter")return RECHTE_ALLE.slice();
  const r=((me&&me.tr&&me.tr[tid])||[]).slice();
  if(me&&me.kader&&(me.kader[tid]||0)>Date.now()){["kader","kaderbearb"].forEach((x)=>{if(r.indexOf(x)<0)r.push(x)})}
  return r;
}
/* Betriebsart der bisherigen Mannschafts-App: voll (bearbeiten), lesen (nur ansehen), scout (nur Kader & Scouting) */
function modeOf(rights){return rights.indexOf("bearbeiten")>=0?"voll":rights.indexOf("sehen")>=0?"lesen":(rights.indexOf("kader")>=0||rights.indexOf("kaderbearb")>=0)?"scout":null}
const lowC=(s)=>String(s||"").trim().toLowerCase();
function showInfo(title,html,btn){
  const o=overlay('<div class="ms er" style="font-size:15px">'+E(title)+'</div><p class="sb">'+html+'</p><button id="u13so">'+(btn||"Abmelden")+'</button>');
  o.querySelector("#u13so").onclick=()=>signOutClean();
}
function showClubSetup(email){
  return new Promise((res)=>{
    const o=overlay('<p class="sb" style="margin-top:0">Der Verein ist noch nicht eingerichtet. Du bist als Besitzer eingetragen und legst ihn jetzt an. Mannschaften kannst du später jederzeit ergänzen.</p><label class="sb">Name des Vereins<input id="vn" value="TuS Haltern am See"></label><label class="sb">Saison<input id="vs" value="2026/27"></label><div class="sb"><b>Mannschaften</b></div><div id="vt" style="margin:0 0 10px">'+STD_TEAMS.map((t)=>'<label style="display:flex;gap:8px;align-items:center;margin:2px 0"><input type="checkbox" data-t="'+t[0]+'" checked style="width:auto;margin:0"> '+E(t[1])+' ('+E(t[2])+')'+(t[3]?"":" – derzeit nicht besetzt")+'</label>').join("")+'</div><div class="ms" id="vm"></div><button class="pr" id="vgo">Verein anlegen</button><button class="ln" id="vso">Abmelden</button>'),m=o.querySelector("#vm");
    o.querySelector("#vso").onclick=()=>signOutClean();
    o.querySelector("#vgo").onclick=async()=>{
      const teams=STD_TEAMS.filter((t)=>o.querySelector('[data-t="'+t[0]+'"]').checked).map((t)=>({id:t[0],name:t[1],ak:t[2],aktiv:!!t[3]}));
      if(!teams.length){m.className="ms er";m.textContent="Bitte mindestens eine Mannschaft wählen.";return}
      const v={name:o.querySelector("#vn").value.trim()||"Verein",saison:o.querySelector("#vs").value.trim()||"2026/27",teams,arten:ARTEN_STD,bereiche:[],settings:{ausgrauenTage:42,erinnerungTage:21,loeschMonate:24},erstellt:new Date().toISOString()};
      try{
        await fs.doc("verein/main").set(v);
        await fs.doc("plaene/platz").set({plaetze:[],kabinen:["0","1","2","3","4"],extern:[{id:"erste",name:"1. Mannschaft"},{id:"ah",name:"Alte Herren"}],stdKabine:{},slots:[]});
        res(v)}catch(e){m.className="ms er";m.textContent=errTxt(e)}};
  });
}
function chooseTeam(V,me,rolle){
  const act=(V.teams||[]);
  const allowed=act.filter((t)=>rightsIn(me,rolle,t.id).length>0);
  let want=TQ;
  try{want=want||localStorage.getItem("u13team")||""}catch(e){}
  const hit=allowed.find((t)=>t.id===want);
  const mine=allowed.find((t)=>t.aktiv!==false&&rightsIn(me,rolle,t.id).indexOf("bearbeiten")>=0&&rolle==="team");
  const first=mine||allowed.find((t)=>t.aktiv!==false)||allowed[0];
  return{allowed,team:hit||first||null};
}
async function clubInit(u){
  const em=lowC(u&&u.email);
  let fixed=null,me=null,V=null,offline=false;
  let owner=false,frei=false;
  try{await fs.doc("ownercheck/x").get();fixed=true}catch(e){if(denied(e))fixed=false;else offline=true}
  if(!offline){
    try{await fs.doc("ownercheck/owner").get();owner=true}catch(e){if(!denied(e))offline=true}
    try{const s=await fs.doc("ownercheck/frei").get();frei=!!s.exists}catch(e){if(!denied(e))offline=true}
  }
  if(!offline){
    try{const s=await fs.doc("mitglieder/"+em).get();me=s.exists?s.data():null}catch(e){if(!denied(e))offline=true}
    try{const s=await fs.doc("verein/main").get();V=s.exists?s.data():null}catch(e){if(!denied(e))offline=true}
  }
  let cache=null;try{cache=JSON.parse(localStorage.getItem("u13v:"+em)||"null")}catch(e){}
  if(offline){
    if(!cache){showInfo("Keine Verbindung","Die App wurde auf diesem Gerät noch nie online geöffnet. Bitte einmal mit Internet öffnen.","Neu laden");return null}
    fixed=cache.fixed;me=cache.me;V=cache.V;owner=!!cache.owner;frei=!!cache.frei;
  }
  if(!V){
    if(!fixed){showInfo(me?"Der Verein ist noch nicht eingerichtet.":"Dieses Konto ist nicht freigegeben.","Angemeldet als <b>"+E(em)+"</b>. "+(me?"Bitte den Besitzer der App fragen.":"Zugriff haben nur Personen, die der Verein freigegeben hat."));return null}
    V=await showClubSetup(em);hideOverlay();
  }
  if(owner&&frei&&!fixed&&!me){
    const o=overlay('<div class="ms er" style="font-size:15px">Du hast deine Besitzerrechte abgegeben</div><p class="sb">Angemeldet als <b>'+E(em)+'</b>. Zurzeit hast du keine Rolle im Verein. Du kannst die Besitzerrechte jederzeit zurücknehmen – du bist dann wieder Administrator.</p><button id="u13ow">Besitzerrechte zurücknehmen</button> <button id="u13so">Abmelden</button>');
    o.querySelector("#u13so").onclick=()=>signOutClean();
    o.querySelector("#u13ow").onclick=async()=>{try{await fs.doc("ownercheck/frei").delete();location.reload()}catch(e){o.querySelector("#u13ow").textContent="Hat nicht geklappt – erneut versuchen"}};
    return null}
  const rolle=fixed?"admin":(me&&me.rolle);
  if(!rolle||ROLLEN_V.indexOf(rolle)<0){showInfo("Dieses Konto ist nicht freigegeben.","Angemeldet als <b>"+E(em)+"</b>. Zugriff haben nur Personen, die der Verein freigegeben hat.");return null}
  me=me||{email:em,rolle:rolle,zu:[],tr:{},g:[],kader:{}};
  if(fixed&&me.rolle!=="admin")me={...me,rolle:"admin"};
  if(!SHARED)try{localStorage.setItem("u13v:"+em,JSON.stringify({fixed:!!fixed,me,V,owner,frei}))}catch(e){}
  /* Administratoren und Jugendleitung müssen sich mindestens alle 30 Tage neu anmelden (die Zugriffsregeln verlangen es ebenfalls) */
  if((rolle==="admin"||rolle==="jugendleiter")&&!window.__DEMO){
    const FRIST=30*864e5,check=async()=>{try{const r=await auth.currentUser.getIdTokenResult(),t=Date.parse(r.authTime);if(t&&Date.now()-t>FRIST){try{sessionStorage.setItem("u13expired","1")}catch(e){}await signOutClean()}}catch(e){}};
    await check();setInterval(check,36e5);document.addEventListener("visibilitychange",()=>{if(!document.hidden)check()});
  }
  const ch=chooseTeam(V,me,rolle);
  window.__VEREIN=V;window.__VROLLE=rolle;window.__VFIXED=!!fixed;window.__VOWNER=owner;window.__VFREI=frei;window.__VALLOWED=ch.allowed.map((t)=>t.id);
  window.__VME={email:em,rolle,name:me.name||"",zu:me.zu||[],tr:me.tr||{},g:me.g||[],kader:me.kader||{},teams:ch.allowed.map((t)=>t.id)};
  if(rolle==="platzwart"){window.__KABACCT=true;return{kabOnly:true}}
  if(rolle==="team"&&!ch.team&&(me.zu||[]).some((z)=>z.art==="platzwart")){window.__KABACCT=true;window.__KABRO=(me.g||[]).indexOf("plan")<0;return{kabOnly:true}}
  if(!ch.team){showInfo("Du bist noch keiner Mannschaft zugeordnet.","Angemeldet als <b>"+E(em)+"</b>. Bitte die Jugendleitung bitten, dich unter „Personen &amp; Rechte“ einer Mannschaft zuzuordnen.");return null}
  const rights=rightsIn(me,rolle,ch.team.id);
  window.__VRIGHTS=rights;window.__VMODE=modeOf(rights)||"lesen";
  window.__TID=ch.team.id;window.__TEAM=ch.team;window.__WEB_BASE=window.__WEB_BASE0+"?t="+ch.team.id;
  try{localStorage.setItem("u13team",ch.team.id)}catch(e){}
  return{team:ch.team};
}
/* Platzwart-Link: anonyme Anmeldung, dann Eintrag „kabzugang/<uid>“ mit dem geheimen Schlüssel aus dem Link */
async function kabStart(){
  let u=await firstUser();
  try{
    if(!u){await auth.signInAnonymously();u=auth.currentUser}
    await fs.doc("kabzugang/"+u.uid).set({s:KABKEY,at:new Date().toISOString()});
    window.__kabFs=fs;window.__kabUid=u.uid;window.__kabOk=true;
  }catch(e){window.__kabOk=false;window.__kabErr=(e&&e.code)||"fehler"}
  window.__kabReady=true;document.dispatchEvent(new Event("u13kab"));
}

async function start(){
  if(window.__DEMO&&document.readyState!=="complete")await new Promise((r)=>window.addEventListener("load",r));
  if(!window.__DEMO&&!cfgOk()){showSetup();return new Promise(()=>{})}
  try{
    if(!window.__DEMO)for(const f of["firebase-app-compat.js","firebase-auth-compat.js","firebase-firestore-compat.js"])await loadScript(SDK+f);
  }catch(e){overlay('<div class="ms er">Die Firebase-Bausteine konnten nicht geladen werden. Bitte die Internetverbindung prüfen und die Seite neu laden.</div>');return new Promise(()=>{})}
  fb=window.firebase;fb.initializeApp(CFG);auth=fb.auth();fs=fb.firestore();
  if(SHARED){try{await auth.setPersistence(fb.auth.Auth.Persistence.SESSION)}catch(e){}try{await fs.clearPersistence()}catch(e){}}
  else{try{await fs.enablePersistence({synchronizeTabs:true})}catch(e){}}
  if(KABKEY){await kabStart();return new Promise(()=>{})}
  let u=await firstUser();
  if(!u){await showLogin();u=auth.currentUser}
  if(needsVerify(u)){try{await u.reload()}catch(e){}u=auth.currentUser;if(needsVerify(u)){await showVerify(u);u=auth.currentUser}}
  window.__webFs=fs;
  const ci=await clubInit(u);
  if(!ci)return new Promise(()=>{});
  if(ci.kabOnly){hideOverlay();document.documentElement.classList.add("kabmode");window.__KAB=true;window.__kabFs=fs;window.__kabOk=true;window.__kabReady=true;document.dispatchEvent(new Event("u13kab"));addSignOut();return new Promise(()=>{})}
  /* Zugriffstest; bei leerer Mannschaft ein Grundgerüst anlegen, damit die Sicherung eingespielt werden kann */
  try{
    const c=await fs.doc(T("config/main")).get();
    if(!c.exists&&(window.__VROLLE==="admin"||window.__VROLLE==="jugendleiter"||window.__VMODE==="voll"))await fs.doc(T("config/main")).set({saison:window.__VEREIN.saison||"2026/27",mannschaft:window.__TEAM.ak||"",zaehlendeAbwesenheiten:{e:true,u:true,v:false,t:false}});
  }catch(e){
    if(denied(e)){showInfo("Kein Zugriff auf diese Mannschaft.","Angemeldet als <b>"+E(u&&u.email)+"</b>.");return new Promise(()=>{})}
    /* offline: weiter, die Daten kommen aus dem Gerätespeicher */
  }
  hideOverlay();addSignOut();
  await afterLogin();
  window.__CLUB=true;document.dispatchEvent(new Event("u13club"));
  return wrap();
}
/* ---------- Nach der Anmeldung: Rolle, Scouting-Schlüssel ---------- */
let scoutKey="";
const rndKey=()=>{const a=new Uint8Array(18);crypto.getRandomValues(a);return window.__TID+"-"+btoa(String.fromCharCode.apply(null,a)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"")};
const denied=(e)=>!!(e&&/permission|denied|insufficient/i.test(String(e.code)+" "+String(e.message)));
async function afterLogin(){
  const rolle=window.__VROLLE,rights=window.__VRIGHTS||[],owner=rolle==="admin"||rolle==="jugendleiter"||rights.indexOf("einstellungen")>=0;
  window.__webOwner=owner;
  window.__ROLE=window.__VMODE;window.__ACCT=(((auth.currentUser&&auth.currentUser.email)||"")+"").toLowerCase().replace(/[^a-z0-9@._-]/g,"_")||"main";
  if(!owner)document.body.classList.add("co");
  if(window.__ROLE==="scout")document.body.classList.add("scoutonly");
  const lbl={lesen:"· Nur Ansicht",scout:"· Scouting-Zugang"}[window.__ROLE];
  if(lbl){const t=document.querySelector(".top .note");if(t){const sp=document.createElement("span");sp.style.marginLeft="8px";sp.textContent=lbl;t.appendChild(sp)}}
  if(window.__ROLE==="scout"){window.__scoutLink=()=>"(nur für Trainer sichtbar)";return}
  if(window.__ROLE==="lesen"){try{const r=await fs.doc(T("config/scout")).get();scoutKey=(r.exists&&r.data()&&r.data().k)||""}catch(e){}window.__scoutLink=()=>scoutKey?window.__WEB_BASE0+"#scout."+scoutKey:"(nicht verfügbar)";return}
  try{const r=await fs.doc(T("config/scout")).get();let k=r.exists&&r.data()&&r.data().k;if(!k){k=rndKey();await fs.doc(T("config/scout")).set({k})}scoutKey=k}catch(e){}
  window.__scoutLink=()=>scoutKey?window.__WEB_BASE0+"#scout."+scoutKey:"";window.__scoutNew=true;
  let last=null;const tid=window.__TID;
  fs.doc(T("config/main")).onSnapshot((d)=>{const aus=!!(d.exists&&d.data()&&d.data().kaderAus);if(aus===last)return;const first=last===null;last=aus;
    const w=()=>fs.doc("pub/scout_"+tid).set({aus}).catch(()=>{});
    if(first)fs.doc("pub/scout_"+tid).get().then((x)=>{if(!x.exists||!!(x.data()&&x.data().aus)!==aus)w()}).catch(()=>{});else w()},()=>{});
  document.addEventListener("click",async(ev)=>{const b=ev.target.closest&&ev.target.closest("[data-scn]");if(!b)return;
    if(!b.dataset.arm){b.dataset.arm="1";b.textContent="Wirklich neu erzeugen?";return}
    const k=rndKey();try{await fs.doc(T("config/scout")).set({k});scoutKey=k;const i=document.getElementById("sclink");if(i)i.value=window.__scoutLink();b.dataset.arm="";b.textContent="Neu erzeugen";document.dispatchEvent(new Event("u13scoutkey"))}catch(e){b.textContent="Hat nicht geklappt"}});
  if(rolle==="admin")cards();
}
function cards(){
  const put=()=>{
    const m=document.getElementById("etp-m"),sv=document.getElementById("etp-s");if(!m||!sv){setTimeout(put,500);return}
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
  const tid=window.__TID,pre=(k)=>k+"_"+tid+"_";
  for(const pid of Object.keys(snap.p||{}))await put(pre("p")+pid,snap.p[pid]);
  for(const k of Object.keys(snap.x||{}))await put(pre("x")+k,snap.x[k]);
  if(snap.bg){let bg=clean(snap.bg);if(JSON.stringify(bg).length>900000)bg={L:bg.L||"",D:bg.D||"",i:""};keep.add("bg_"+tid);await fs.doc("pub/bg_"+tid).set(bg)}
  keep.add("scout_"+tid);
  const all=await fs.collection("pub").get();
  for(const d of all.docs){const mine=d.id.indexOf(pre("p"))===0||d.id.indexOf(pre("x"))===0||d.id==="bg_"+tid;if(mine&&!keep.has(d.id))await fs.doc("pub/"+d.id).delete()}
  await fs.doc(T("linkmeta/main")).set({u:snap.u,k:snap.k||{},xk:snap.xk||{},fp:snap.fp||"",fa:snap.fa||"",fs:snap.fs||"",dzs:snap.dzs||""});
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
    const s={u:meta.u||"",k:meta.k||{},xk:meta.xk||{},fp:meta.fp||"",fa:meta.fa||"",fs:meta.fs||"",dzs:meta.dzs||"",p:{},x:{},a:{}},tp="_"+window.__TID+"_";
    Object.keys(raw).forEach((id)=>{if(id.indexOf("~")>=0)return;if(id.slice(0,2)==="a_"){s.a[id]={s:raw[id].s,w:raw[id].w,v:raw[id].v|0};return}if(id.indexOf("p"+tp)===0){const b=join(id);if(b)s.p[id.slice(tp.length+1)]=b}else if(id.indexOf("x"+tp)===0){const b=join(id);if(b)s.x[id.slice(tp.length+1)]=b}});
    window.__webSnapReady=true;cb(s);
  };
  const later=()=>{clearTimeout(tm);tm=setTimeout(build,150)};
  fs.collection("pub").onSnapshot((s)=>{docs=s.docs;later()},()=>{});
  fs.doc(T("linkmeta/main")).onSnapshot((s)=>{meta=s.exists?s.data():{};later()},()=>{});
};

/* ---------- Schnittstelle zur App ---------- */
let dbP=null;
window.claude={use:async function(name){
  if(name==="db")return isScout?scoutDb:isViewerHash?null:(dbP||(dbP=start()));
  if(name==="downloads")return isViewerHash?null:{save:nativeSave};
  if(name==="artifact")return isViewerHash?null:{publish:async(snap)=>{await (dbP||(dbP=start()));return publishSnap(snap)}};
  return null;
}};

/* ---------- Offline-Start (Service Worker) und Installation ---------- */
if("serviceWorker" in navigator&&/^https:|^http:\/\/localhost/.test(location.protocol+"//"+location.hostname)){window.addEventListener("load",()=>{navigator.serviceWorker.register("sw.js").catch(()=>{})})}
})();
