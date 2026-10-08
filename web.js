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
window.__WEB_BASE=location.origin+location.pathname.replace(/index\.html$/,"");
const H=location.hash;
const isScout=/^#scout\.[A-Za-z0-9_-]{16,}$/.test(H);
window.__SCOUTKEY=isScout?H.slice(7):"";
const isKurz=/^#k\/[A-Za-z0-9_-]{4,40}$/.test(H);
const isViewerHash=(/^#[A-Za-z0-9]+\.[A-Za-z0-9_-]{16,}$/.test(H)&&!/^#co[A-Za-z0-9]+\./.test(H)&&!isScout)||isKurz;
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
window.__webSnap=async function(pid){
  if(!cfgOk())throw new Error("config");
  const x=XIDS.indexOf(pid)>=0,b=await restBlob((x?"x_":"p_")+pid),bg=await restDoc("bg"),s={p:{},x:{}};
  if(b)(x?s.x:s.p)[pid]=b;
  if(bg)s.bg={L:bg.L||"",D:bg.D||"",i:bg.i||""};
  return s;
};

/* ---------- Anmeldung ---------- */
let fb=null,fs=null,auth=null;
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
const ERR={"auth/invalid-credential":"E-Mail oder Passwort stimmt nicht.","auth/wrong-password":"E-Mail oder Passwort stimmt nicht.","auth/user-not-found":"E-Mail oder Passwort stimmt nicht.","auth/invalid-email":"Diese E-Mail-Adresse ist ungültig.","auth/email-already-in-use":"Zu dieser E-Mail gibt es schon ein Konto. Bitte anmelden.","auth/weak-password":"Das Passwort ist zu kurz (mindestens 6 Zeichen).","auth/too-many-requests":"Zu viele Versuche. Bitte kurz warten und erneut versuchen.","auth/network-request-failed":"Keine Verbindung zum Server.","auth/popup-closed-by-user":"Die Anmeldung wurde abgebrochen.","auth/cancelled-popup-request":"Die Anmeldung wurde abgebrochen.","auth/unauthorized-domain":"Diese Internetadresse ist in Firebase noch nicht freigegeben (Authentication → Einstellungen → Autorisierte Domains).","auth/operation-not-allowed":"Diese Anmeldeart ist in Firebase noch nicht eingeschaltet.","auth/missing-password":"Bitte ein Passwort eingeben.","auth/missing-email":"Bitte eine E-Mail-Adresse eingeben."};
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
  o.querySelector("#u13so").onclick=()=>auth.signOut().then(()=>location.reload());
}
function showVerify(user){
  return new Promise((res)=>{
    const o=overlay('<p>Bitte die E-Mail-Adresse <b>'+E(user.email)+'</b> bestätigen. Wir haben dir dazu eine Nachricht geschickt (auch im Spam-Ordner nachsehen).</p><div class="ms" id="vm"></div><button class="pr" id="vok">Ich habe bestätigt</button><button id="vre">Nachricht noch einmal senden</button><button class="ln" id="vso">Abmelden</button>'),m=o.querySelector("#vm");
    o.querySelector("#vok").onclick=async()=>{try{await user.reload();if(auth.currentUser&&auth.currentUser.emailVerified){await auth.currentUser.getIdToken(true);res()}else{m.className="ms er";m.textContent="Noch nicht bestätigt. Bitte zuerst auf den Link in der E-Mail klicken."}}catch(e){m.className="ms er";m.textContent=errTxt(e)}};
    o.querySelector("#vre").onclick=async()=>{try{await user.sendEmailVerification();m.className="ms ok";m.textContent="Gesendet."}catch(e){m.className="ms er";m.textContent=errTxt(e)}};
    o.querySelector("#vso").onclick=()=>auth.signOut().then(()=>location.reload());
  });
}
function showLogin(){
  return new Promise((res)=>{
    const o=overlay('<button class="pr" id="lg">Mit Google anmelden</button><div class="or">oder mit E-Mail</div><input id="le" type="email" autocomplete="username" placeholder="E-Mail" inputmode="email"><input id="lp" type="password" autocomplete="current-password" placeholder="Passwort"><div class="ms" id="lm"></div><button class="pr" id="li">Anmelden</button><button id="lr">Konto anlegen</button><button class="ln" id="lf">Passwort vergessen?</button>'),m=o.querySelector("#lm"),em=o.querySelector("#le"),pw=o.querySelector("#lp");
    const msg=(t,k)=>{m.className="ms"+(k?" "+k:"");m.textContent=t||""};
    const busy=(b)=>o.querySelectorAll("button").forEach((x)=>{x.disabled=b});
    const run=async(f)=>{busy(true);msg("");try{await f()}catch(e){msg(errTxt(e),"er")}busy(false)};
    o.querySelector("#lg").onclick=()=>run(async()=>{const p=new fb.auth.GoogleAuthProvider();try{await auth.signInWithPopup(p)}catch(e){if(e&&(e.code==="auth/popup-blocked"||e.code==="auth/operation-not-supported-in-this-environment")){await auth.signInWithRedirect(p);return}throw e}});
    o.querySelector("#li").onclick=()=>run(async()=>{await auth.signInWithEmailAndPassword(em.value.trim(),pw.value)});
    o.querySelector("#lr").onclick=()=>run(async()=>{const c=await auth.createUserWithEmailAndPassword(em.value.trim(),pw.value);try{await c.user.sendEmailVerification()}catch(e){}});
    o.querySelector("#lf").onclick=()=>run(async()=>{if(!em.value.trim()){msg("Bitte oben die E-Mail-Adresse eintragen.","er");return}await auth.sendPasswordResetEmail(em.value.trim());msg("Nachricht zum Zurücksetzen wurde gesendet.","ok")});
    pw.addEventListener("keydown",(e)=>{if(e.key==="Enter")o.querySelector("#li").click()});
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
  try{await fs.enablePersistence({synchronizeTabs:true})}catch(e){}
  let u=await firstUser();
  if(!u){await showLogin();u=auth.currentUser}
  if(needsVerify(u)){try{await u.reload()}catch(e){}u=auth.currentUser;if(needsVerify(u)){await showVerify(u);u=auth.currentUser}}
  /* Zugriffstest; bei leerer Datenbank ein Grundgerüst anlegen, damit die Sicherung eingespielt werden kann */
  try{
    const c=await fs.doc("config/main").get();
    if(!c.exists){await fs.doc("config/main").set({saison:"2026/27"})}
  }catch(e){
    if(e&&/permission|denied|insufficient/i.test(String(e.code)+" "+String(e.message))){showDenied(u&&u.email);return new Promise(()=>{})}
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
  try{if(owner===null)owner=localStorage.getItem("u13role")!=="co";else localStorage.setItem("u13role",owner?"owner":"co")}catch(e){if(owner===null)owner=true}
  window.__webOwner=owner;
  let role="voll";
  if(!owner){
    try{const em=((auth.currentUser&&auth.currentUser.email)||"").toLowerCase(),me=await fs.doc("trainer/"+em).get();role=(me.exists&&me.data()&&me.data().rolle)||"voll";try{localStorage.setItem("u13rolle",role)}catch(e){}}
    catch(e){try{role=localStorage.getItem("u13rolle")||"voll"}catch(x){role="voll"}}
  }
  window.__ROLE=owner?"voll":role;
  if(!owner)document.body.classList.add("co");
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
    const k=rndKey();try{await fs.doc("config/scout").set({k});scoutKey=k;const i=document.getElementById("sclink");if(i)i.value=window.__scoutLink();b.dataset.arm="";b.textContent="Neu erzeugen"}catch(e){b.textContent="Hat nicht geklappt"}});
  if(owner)cards();
}
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
  const put=()=>{if(!document.getElementById("u13css")){const st=document.createElement("style");st.id="u13css";st.textContent=CSS;document.head.appendChild(st)}const t=document.querySelector(".top .note")||document.querySelector(".top");if(!t||document.getElementById("u13out"))return;const b=document.createElement("button");b.id="u13out";b.type="button";b.textContent="Abmelden";b.title=(auth.currentUser&&auth.currentUser.email)||"";b.onclick=()=>auth.signOut().then(()=>location.reload());t.appendChild(b)};
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
  if(snap.bg){let bg=clean(snap.bg);if(JSON.stringify(bg).length>900000)bg={L:bg.L||"",D:bg.D||"",i:""};keep.add("bg");await fs.doc("pub/bg").set(bg)}
  keep.add("scout");
  const all=await fs.collection("pub").get();
  for(const d of all.docs){if(!keep.has(d.id)&&d.id.slice(0,2)!=="a_")await fs.doc("pub/"+d.id).delete()}
  await fs.doc("linkmeta/main").set({u:snap.u,k:snap.k||{},xk:snap.xk||{},fp:snap.fp||"",fa:snap.fa||"",fs:snap.fs||""});
}
/* Kurzlinks (Trainer): Passwort-Paket veröffentlichen/entfernen; das geheime Zeichen liegt nur für Trainer lesbar in „aliasauth“ */
if(!isViewerHash&&!isScout)window.__kurzTr={
  async put(aid,o,t){await (dbP||(dbP=start()));await fs.doc("aliasauth/"+aid).set({t});await fs.doc("pub/"+aid).set({s:o.s,w:o.w,v:o.v|0})},
  async del(aid){await (dbP||(dbP=start()));await fs.doc("pub/"+aid).delete();await fs.doc("aliasauth/"+aid).delete()}};
/* Trainer-Ansicht: Stand der veröffentlichten Links (für Statusanzeige und Prüfung) */
window.__webOwnerSnap=function(cb){
  if(!fs){const t=setInterval(()=>{if(fs){clearInterval(t);window.__webOwnerSnap(cb)}},300);return}
  let docs=null,meta=null,tm=null;
  const build=()=>{
    if(docs==null||meta==null)return;
    const raw={};docs.forEach((d)=>{raw[d.id]=d.data()});
    const join=(id)=>{const m=raw[id];if(!m||typeof m.b!=="string")return null;let b=m.b;for(let i=1;i<(m.n||1);i++){const c=raw[id+"~"+i];if(!c)return null;b+=c.b}return b};
    const s={u:meta.u||"",k:meta.k||{},xk:meta.xk||{},fp:meta.fp||"",fa:meta.fa||"",fs:meta.fs||"",p:{},x:{},a:{}};
    Object.keys(raw).forEach((id)=>{if(id.indexOf("~")>=0)return;if(id.slice(0,2)==="a_"){s.a[id]={s:raw[id].s,w:raw[id].w,v:raw[id].v|0};return}if(id.slice(0,2)==="p_"){const b=join(id);if(b)s.p[id.slice(2)]=b}else if(id.slice(0,2)==="x_"){const b=join(id);if(b)s.x[id.slice(2)]=b}});
    window.__webSnapReady=true;cb(s);
  };
  const later=()=>{clearTimeout(tm);tm=setTimeout(build,150)};
  fs.collection("pub").onSnapshot((s)=>{docs=s.docs;later()},()=>{});
  fs.doc("linkmeta/main").onSnapshot((s)=>{meta=s.exists?s.data():{};later()},()=>{});
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
