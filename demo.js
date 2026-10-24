/* ===== Demo-Ansicht der Vereinslösung =====
   Wird nur aktiv, wenn die Adresse mit #demo:<rolle> endet. Alles läuft im Browser mit ERFUNDENEN Daten (Lorem-ipsum-Namen, erfundene Vereine).
   Es gibt keine Verbindung zur echten Datenbank, nichts wird gespeichert, ein Neuladen setzt alles zurück. */
(function(){
"use strict";
const ARTEN=[
  {id:"trainer",name:"Trainer",rechte:["sehen","bearbeiten","einstellungen","notizen","kader","kaderbearb","fachlesen"],gl:["kurz"]},
  {id:"cotrainer",name:"Co-Trainer",rechte:["sehen","bearbeiten","notizen","kader","kaderbearb","fachlesen"],gl:["kurz"]},
  {id:"sportleiter",name:"Sportlicher Leiter",rechte:["sehen","notizen","kader","hinweise"],gl:["plan"]},
  {id:"torwart",name:"Torwarttrainer",rechte:["sehen","tw"],gl:[]},
  {id:"athletik",name:"Athletiktrainer",rechte:["sehen","ath"],gl:[]},
  {id:"lesen",name:"Nur lesen",rechte:["sehen","notizen","kader"],gl:[]},
  {id:"scout",name:"Scout",rechte:["kader","kaderbearb"],gl:[]},
  {id:"platzwart",name:"Platzwart",rechte:[],gl:["plan"]}];
/* Rollen, die ein Demo-Link darstellen kann */
const ROLLEN={
  "administrator":{n:"Administrator",rolle:"admin"},
  "jugendleiter":{n:"Jugendleiter",rolle:"jugendleiter"},
  "sportleiter-alle":{n:"Sportlicher Leiter (alle Mannschaften)",art:"sportleiter",teams:"*"},
  "sportleiter-d":{n:"Sportlicher Leiter (nur D1 und D2)",art:"sportleiter",teams:["d1","d2"]},
  "trainer":{n:"Trainer (D1)",art:"trainer",teams:["d1"]},
  "cotrainer":{n:"Co-Trainer (D1)",art:"cotrainer",teams:["d1"]},
  "torwarttrainer":{n:"Torwarttrainer (alle)",art:"torwart",teams:"*"},
  "athletiktrainer":{n:"Athletiktrainer (alle)",art:"athletik",teams:"*"},
  "nur-lesen":{n:"Nur Ansicht (D1)",art:"lesen",teams:["d1"]},
  "platzwart":{n:"Platzwart",rolle:"platzwart"}};
window.__DEMO_ROLLEN=ROLLEN;
const m=/^#demo:([a-z0-9-]{2,30})$/.exec(location.hash||"");
if(!m)return;
const P=ROLLEN[m[1]]||ROLLEN.administrator;
window.__DEMO={key:m[1],label:P.n,roles:ROLLEN};
const EMAIL="demo@beispiel.test";

/* ---------- Zufall mit festem Startwert: jede Demo sieht gleich aus ---------- */
let sd=20260901;const R=()=>{sd|=0;sd=sd+0x6D2B79F5|0;let t=Math.imul(sd^sd>>>15,1|sd);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const ri=(a,b)=>a+Math.floor(R()*(b-a+1)),pick=(a)=>a[Math.floor(R()*a.length)],shuf=(a)=>a.map((x)=>[R(),x]).sort((p,q)=>p[0]-q[0]).map((x)=>x[1]);
const pad=(n)=>String(n).padStart(2,"0"),iso=(d)=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const addD=(s,n)=>{const d=new Date(s+"T12:00:00");d.setDate(d.getDate()+n);return iso(d)};
const TODAY=iso(new Date());
const dow=(s)=>{const g=new Date(s+"T12:00:00").getDay();return g===0?7:g};
const MON=addD(TODAY,1-dow(TODAY));
const FN="Max Leon Finn Noah Paul Ben Luca Elias Jonas Felix Tim Malte Emil Anton Jan Moritz Lukas Kilian Carl Ole Mats Hugo Levi Niklas".split(" ");
const LN="Muster Beispiel Probe Demo Test Platzhalter Exempel Sample Vorlage Modell Schema Entwurf Beleg Kopie Attrappe Nachbau Muster-Meier Probst Beispieler".split(" ");
const CL="SV Musterstadt|FC Beispieldorf|TuS Platzhausen|SC Testfeld|Spvgg Demotal|BV Probeheim|VfL Zufallsburg|SG Loremberg|DJK Ipsumhagen|FSV Sampledorf|TSV Fiktivstadt|RW Exempelau".split("|");
const TEAMS=[["m1","Minis","U6"],["g1","G1","U7"],["f2","F2","U8"],["f1","F1","U9"],["e2","E2","U10"],["e1","E1","U11"],["d2","D2","U12"],["d1","D1","U13"],["c2","C2","U14"],["c1","C1","U15"],["b1","B1","U17"],["a1","A1","U19"]];
const FORM={m1:["3gg3",3],g1:["4gg4",4],f1:["5gg5",5],f2:["5gg5",5],e1:["7gg7",7],e2:["7gg7",7],d1:["9gg9",9],d2:["9gg9",9],c1:["11gg11",11],c2:["9gg9",9],b1:["11gg11",11],a1:["11gg11",11]};

const store=new Map();
const put=(p,d)=>store.set(p,JSON.parse(JSON.stringify(d)));

/* ---------- Mannschaften mit erfundenen Daten ---------- */
TEAMS.forEach(([tid,name],ti)=>{
  const [form,nF]=FORM[tid],cnt=nF+ri(4,6),pl=[];
  for(let i=0;i<cnt;i++){const k=(ti*3+i*5)%FN.length;pl.push({id:"p"+(i+1),slot:i+1,vorname:FN[k],name:LN[(k*7+i+ti)%LN.length],geburtsdatum:(2013-ti%4)+"-"+pad(ri(1,12))+"-"+pad(ri(1,28)),positionen:i===0?["TW"]:shuf(["IV","AV","ZM","OM","ST","FL"]).slice(0,ri(1,2)),torwart:i===0,aktiv:true,nr:i+1})}
  pl.forEach((p)=>put(tid+"__players/"+p.id,p));
  const ids=pl.map((p)=>p.id);
  [-35,-28,-21,-14,-7].forEach((off,i)=>{const d=addD(TODAY,off),sp={};ids.forEach((id)=>{const r=R();sp[id]=r<.75?"x":r<.85?"e":r<.92?"u":"v"});put(tid+"__trainings/t"+i,{id:"t"+i,datum:d,spieler:sp})});
  const gl=[];
  [-54,-40,-26,-12,-5,4,11,25].forEach((off,i)=>{let d=addD(TODAY,off);while(dow(d)<6)d=addD(d,1);const past=d<TODAY,sp={};
    ids.forEach((id,j)=>{const r=R();sp[id]=past&&r<.7?{status:"k",minuten:Math.round(30*(1+R()))}:{status:past?"t":"n",minuten:0}});
    const noRes=/^[fgm]/.test(tid),to=past&&!noRes?pick([0,1,2,3,4]):null,gg=past&&!noRes?pick([0,1,2,3]):null;if(past&&!noRes)gl.push([d,to,gg]);   /* F- und G-Jugend: Spiele ohne Wertung, keine Ergebnisse */
    put(tid+"__games/g"+(i+1),{id:"g"+(i+1),nr:i+1,datum:d,art:/^[fgm]/.test(tid)?"Turnier":"Meisterschaft",dauer:60,form,gewichtet:true,spielerzahl:nF,gegner:pick(CL),ha:i%2?"A":"H",tore:to,gt:gg,wertung:true,spieler:past?sp:{}})});
  /* weitere gespielte Spiele, damit jede Mannschaft 9 Ergebnisse für die Formkurve hat */
  for(let k=0;!/^[fgm]/.test(tid)&&gl.length<9;k++){let d=addD(TODAY,-61-7*k);while(dow(d)<6)d=addD(d,1);const to=pick([0,1,2,3,4]),gg=pick([0,1,2,3]),sp={};ids.forEach((id)=>{sp[id]={status:R()<.7?"k":"t",minuten:30}});gl.push([d,to,gg]);
    put(tid+"__games/gv"+k,{id:"gv"+k,nr:20+k,art:"Meisterschaft",datum:d,dauer:60,form,gewichtet:true,spielerzahl:nF,gegner:pick(CL),ha:k%2?"A":"H",tore:to,gt:gg,wertung:true,spieler:sp})}
  /* Termine bis Ende Dezember (Auswertungen zählen trotzdem nur bis heute) */
  {const END=TODAY.slice(0,4)+"-12-31";let n=0,gi=8;
   for(let d=addD(TODAY,1);d<=END;d=addD(d,1)){const w=dow(d);
    if(w===2||w===4){put(tid+"__trainings/tf"+(n++),{id:"tf"+n,datum:d,spieler:{}})}
    if(w===6&&Math.round((new Date(d+"T12:00:00")-new Date(TODAY+"T12:00:00"))/864e5/7)%2===ti%2&&d>addD(TODAY,26)&&d<=TODAY.slice(0,4)+"-12-20"){put(tid+"__games/g"+gi,{id:"g"+gi,nr:gi,datum:d,art:/^[fgm]/.test(tid)?"Turnier":"Meisterschaft",dauer:60,form,gewichtet:true,spielerzahl:nF,gegner:pick(CL),ha:gi%2?"A":"H",tore:null,gt:null,wertung:true,spieler:{}});gi++}}
   const Y=TODAY.slice(0,4);
   [[Y+"-11-12","Termin","Elternabend","19:00",true],[Y+"-11-21","Turnier","Hallenturnier Musterstadt","10:00",true],[Y+"-12-04","Termin","Trainersitzung","20:00",false],[Y+"-12-12","Turnier","Nikolausturnier","09:30",true],[Y+"-12-18","Termin","Weihnachtsfeier","18:00",true]].forEach((e,i)=>{if(e[0]>TODAY)put(tid+"__events/ef"+i,{id:"ef"+i,datum:e[0],typ:e[1],titel:e[2],zeit:e[3],ort:e[4]?"Vereinsheim Musterstadt":"",eltern:e[4]})})}
  {const bet=.7+R()*.25,zt=.55+R()*.35;put(tid+"__vstat/main",{tid,ak:TEAMS[ti][2],n:cnt,tr:5,sp:gl.length,bet,betl:bet,zeit:zt,min:40,low:ri(0,2),lt:addD(TODAY,-7),ls:gl.length?gl.sort().slice(-1)[0][0]:null,naechste:[],fbet:bet>.9?4:bet>.8?3:2,fzeit:zt>.7?4:zt>.6?3:2,form:gl.slice().sort((x,y)=>y[0].localeCompare(x[0])).slice(0,5).map((g)=>g[1]>g[2]?"S":g[1]<g[2]?"N":"U").join(""),at:new Date().toISOString(),upd:new Date().toISOString()})}
  put(tid+"__events/e1",{id:"e1",datum:addD(TODAY,6),typ:"Termin",titel:"Elternabend",zeit:"19:00",ort:"Vereinsheim Musterstadt",eltern:true});
  put(tid+"__events/e2",{id:"e2",datum:addD(TODAY,9),typ:"Termin",titel:"Trainersitzung",zeit:"20:00",eltern:false});
  put(tid+"__dienste/d1",{id:"d1",art:"Materialdienst",datum:MON,bis:addD(MON,6),label:"Gruppe 1",spieler:ids.slice(0,2)});
  put(tid+"__todos/t1",{id:"t1",typ:"todo",text:"Lorem ipsum Bälle aufpumpen.",datum:addD(TODAY,3),wer:"Max Mustermann",done:false});
  put(tid+"__todos/t2",{id:"t2",typ:"todo",text:"Dolor sit amet Trikots abholen.",datum:null,wer:null,done:true});
  put(tid+"__notes/n1",{id:"n1",pid:ids[1],datum:addD(TODAY,-10),art:"notiz",kategorie:"Allgemein",text:"Lorem ipsum dolor sit amet, consetetur sadipscing elitr.",sichtbar:false});
  /* Kaderplanung für die kommende Saison + Scouting-Datenbank (erfundene Personen) */
  {const n0=+TEAMS[ti][2].slice(1),n=Math.min(19,n0+1),sa="2027/28",plid="kp"+tid,pt=n%2===0?n+1:n-1,auto=Array.from(new Set([n-1,n,pt])).filter((x)=>x>=6&&x<=19);
   const TWn=n<=10?0:2,POS=n<=11?[...(TWn?[["Torwart",TWn,1]]:[]),["Abwehr",4,0],["Mittelfeld",5,0],["Angriff",3,0]]:[["Torwart",2,1],["Innenverteidiger",n<=13?3:4,0],["Außenverteidiger",n<=13?2:4,0],["Zentrales MF",n<=13?4:5,0],["Außenmittelfeld",0,0],["Flügel",3,0],["Stürmer",2,0]];
   const lk=(id,name,c,z)=>({id,name,c,z:z||0});
   const plan={id:plid,name:"U"+n+" "+sa,stufe:"U"+n,saison:sa,ziel:{f:n<=11?12:n<=13?14:18,t:TWn},min:{f:n<=11?11:n<=13?13:17,t:TWn?1:0},max:{f:n<=11?14:n<=13?16:20,t:TWn},frist:"2028-04-30",fristName:"Go/No-Go-Entscheidung",
    pos:POS.map((x,i)=>({id:"x"+i,name:x[0],soll:x[1],tw:!!x[2]})),
    status:[lk("go","Fest eingeplant (Go)","g",1),lk("gof","Wackelkandidat (Go mit Frist)","y",1),lk("ngf","Entwicklungsfall (No-Go mit Frist)","o",1),lk("ng","Keine Perspektive (No-Go)","r",0)],
    rollen:[{id:"an",name:"Ankerspieler",c:"g"},{id:"st",name:"Startelf",c:"b"},{id:"sr",name:"Startelf bis Rotation",c:"ac"},{id:"rp",name:"Rotation, großes Entwicklungspotenzial",c:"p"},{id:"ro",name:"Rotation",c:"be"}],
    phasen:[lk("be","Im Blick","b"),lk("ka","Kontakt & Gespräch","ac"),lk("pe","Probetraining eingeladen","y"),lk("pa","Probetraining","o"),lk("en","Entscheidungsfindung","y"),lk("zu","Zusage","g",1),{id:"ab",name:"Absage",c:"r",z:0,aus:1}],
    prios:[{id:"a",name:"A – Wunschspieler",c:"n1"},{id:"b",name:"B – hoch",c:"n2"},{id:"c",name:"C – mittel",c:"n3"},{id:"d",name:"D – niedrig",c:"n4"}],
    wk:[{id:"zu",name:"Zugesagt",c:"g",p:100,z:1},{id:"sw",name:"Sehr wahrscheinlich",c:"g",p:80},{id:"wa",name:"Wahrscheinlich",c:"y",p:60},{id:"un",name:"Unsicher",c:"o",p:40},{id:"en",name:"Eher nicht",c:"r",p:20},{id:"ab",name:"Abgang / Absage",c:"gr",p:0,a:1}],
    krit:[{id:"te",name:"Technik"},{id:"ta",name:"Taktik"},{id:"at",name:"Athletik"},{id:"pe",name:"Persönlichkeit"}]};
   put(tid+"__kplan/"+plid,plan);
   const posNames=POS.map((x)=>x[0]),mk=(id,o)=>put(tid+"__kperson/"+id,Object.assign({id,typ:"extern",vorname:"",name:"",geb:"",verein:"",mannschaft:"",nr:"",fuss:"",groesse:"",telM:"",telV:"",mail:"",adresse:"",pos:{},kr:{},manuell:null,staerken:"",schwaechen:"",notiz:"",beob:[],kontakt:[],probe:[],plans:{}},o));
   /* eigene Spieler: bleiben sie? */
   pl.forEach((pp,i)=>{const r=R(),wk=r<.55?"sw":r<.75?"wa":r<.9?"un":"zu";mk("kq_e"+pp.id,{typ:"eigen",sid:pp.id,pos:{[pp.torwart&&TWn?posNames[0]:posNames[(TWn?1:0)+i%(posNames.length-(TWn?1:0))]]:2},plans:{[plid]:{status:r<.8?"go":r<.92?"gof":"ngf",rolle:pick(["an","st","sr","rp","ro"]),wk,phase:"",prio:"",kontakt:false,wunsch:"",next:{}}}})});
   /* gescoutete Spieler: Jahrgänge nach Regel sichtbar, zwei bewusst außerhalb */
   const ages=auto.concat([n+3<=19?n+3:n-3,n-3>=6?n-3:n+4]);
   ages.forEach((a,i)=>{for(let k=0;k<(i<auto.length?3:1);k++){const id="kq_x"+i+"_"+k,vor=pick(FN),nach=pick(LN),r=R(),ph=pick(["be","be","ka","pe","pa","en","zu"]),by=2028-a,inP=i<auto.length&&k<2;
      mk(id,{vorname:vor,name:nach+" (Demo)",geb:by+"-"+pad(ri(1,12))+"-"+pad(ri(1,28)),verein:pick(CL),mannschaft:"U"+(a-1)+" / "+pick(["1","2"]),nr:String(ri(2,18)),fuss:pick(["rechts","links","beidfüßig"]),groesse:String(ri(140,175)),
        pos:{[pick(posNames)]:2},kr:{te:ri(5,9),ta:ri(4,9),at:ri(4,9),pe:ri(5,9)},staerken:"Lorem ipsum: schnell, gutes Auge.",schwaechen:"Dolor sit amet: Zweikampfverhalten.",notiz:"Erfundene Demo-Person.",
        beob:[{id:"b"+id,datum:addD(TODAY,-ri(5,40)),bew:ri(5,9),text:"Beispielhafte Beobachtung (erfunden).",von:"Demo-Scout"}],
        plans:inP?{[plid]:{phase:ph,prio:pick(["a","b","c"]),rolle:"",kontakt:r<.3,wunsch:"",next:{}}}:{}})}});
   put(tid+"__kobs/ko1",{id:"ko1",verein:CL[ti%CL.length],mannschaft:"U"+(n-1),datum:addD(TODAY,ri(2,9)),zeit:"11:00",entf:ri(5,40)+" km",status:"geplant",blick:"Beispiel: Rechtsverteidiger beobachten",notiz:"",personIds:[]});
   put(tid+"__kobs/ko2",{id:"ko2",verein:CL[(ti+4)%CL.length],mannschaft:"U"+n,datum:addD(TODAY,-ri(6,20)),zeit:"10:00",entf:ri(5,40)+" km",status:"erledigt",blick:"",notiz:"Erledigt (erfunden)",personIds:[]})}
  put(tid+"__config/main",{saison:"2026/27",mannschaft:name,kontakte:[{titel:"Trainerteam",zeilen:"Max Mustermann · 0123 456789"}],zaehlendeAbwesenheiten:{e:true,u:true,v:false,t:false},spielformen:[{id:form,name:nF+" gegen "+nF,spieler:nF}],staff:[{id:"s1",name:"Max Mustermann",rolle:"Trainer",owner:true}]});
});

/* ---------- FUSSBALL.DE (erfundene Daten: Spielplan, Tabelle, Abweichungen zum Ausprobieren) ---------- */
{
  const NAMES=["SV Musterstadt","FC Beispieldorf","TuS Platzhausen","SC Testfeld","Spvgg Demotal","BV Probeheim","VfL Zufallsburg","SG Loremberg"];
  const fdid=(t)=>"DEMO"+t.toUpperCase()+"00000000000000000000";
  const gamesOf=(tid)=>[...store.entries()].filter(([k])=>k.indexOf(tid+"__games/")===0).map(([,v])=>v).sort((a,b)=>a.datum.localeCompare(b.datum));
  TEAMS.forEach(([tid])=>gamesOf(tid).forEach((g,i)=>{g.nr=i+1;put(tid+"__games/"+g.id,g)}));   /* Spielnummern fortlaufend nach Datum */
  const idx={v:1,stand:new Date(Date.now()-2*36e5).toISOString(),aktiv:true,teams:{}};
  [["a1",true,2],["b1",true,1],["c1",true,6],["c2",true,3],["d1",true,3],["d2",true,5],["e1",true,4],["e2",true,7],["f1",false,0],["f2",false,0],["g1",false,0],["m1",false,0]].forEach(([tid,liga,platz])=>{   /* Tabellen für alle Mannschaften bis einschließlich U10 (und D1/D2) */
    const AK={a:["Bezirksliga A-Junioren","A-Junioren"],b:["Kreisliga A B-Junioren","B-Junioren"],c:["Kreisliga B C-Junioren","C-Junioren"],m:["Spielfest","Bambini"],d:["Kreisliga B D-Junioren","D-Junioren"],e:["Kreisliga C E-Junioren","E-Junioren"],f:["Spielfest","F-Junioren"],g:["Spielfest","Bambini"]}[tid[0]];
    const cfg=store.get(tid+"__config/main");
    cfg.fd={team:"https://www.fussball.de/mannschaft/demo/-/saison/2627/team-id/"+fdid(tid)+"#!/",liga:liga?"https://www.fussball.de/spieltagsuebersicht/demo/-/staffel/DEMOSTAFFEL#!/":""};put(tid+"__config/main",cfg);
    const own="TuS Musterstadt "+tid.toUpperCase(),gs=gamesOf(tid),sp=[],fut=gs.filter((g)=>g.datum>=TODAY);
    gs.forEach((g,i)=>{
      const past=g.datum<TODAY,h=g.ha==="H",f={id:"DG"+tid+i,d:g.datum,z:"10:30",wett:liga?AK[0]:"Spielfest",alt:AK[1],heim:h?own:g.gegner,gast:h?g.gegner:own,st:"",ht:null,gt:null,ort:"Sportanlage Musterstadt, Beispielweg 1, 12345 Musterstadt",ortUrl:"",h};
      if(past){f.ht=h?g.tore:g.gt;f.gt=h?g.gt:g.tore;g.fd=f.id}
      else{const k=fut.indexOf(g);
        if(k===0){g.fd=f.id;f.z="11:00"}                 /* verknüpft, Anstoß wird still ergänzt */
        else if(k===1){/* unverknüpft, gleicher Tag und Gegner: wird still verbunden */}
        else if(k===2&&tid==="d1"){g.fd=f.id;f.d=addD(g.datum,1);f.z="11:00"}   /* verlegt: App fragt */
        else if(k===3&&tid==="d1"){const o=NAMES.find((n)=>n!==g.gegner&&n!==NAMES[0]&&n!==own);f.heim=h?own:o;f.gast=h?o:own}  /* gleicher Tag, anderer Gegner: App fragt */}
      put(tid+"__games/"+g.id,g);sp.push(f)});
    if(tid==="d1"){const last=fut[fut.length-1],d=addD(last?last.datum:TODAY,14);sp.push({id:"DG"+tid+"neu",d,z:"10:30",wett:"Kreisliga B D-Junioren",alt:"D-Junioren",heim:NAMES[3],gast:own,st:"",ht:null,gt:null,ort:"Sportplatz Testfeld, Probeweg 2",ortUrl:"",h:false});
      sp.push({id:"DG"+tid+"fr",d:addD(d,7),z:"11:00",wett:"Freundschaftsspiele",alt:"D-Junioren",heim:own,gast:NAMES[6],st:"",ht:null,gt:null,ort:"",ortUrl:"",h:true})}
    sp.sort((a,b)=>(a.d+a.z).localeCompare(b.d+b.z));
    const opps=NAMES.filter((n)=>n!==NAMES[0]).slice(0,7),tab=[own].concat(opps).map((t,i)=>({team:t,sp:6,s:0,u:0,n:0,tore:"",diff:0,pkt:0,auf:false,ab:false}));
    const order=tab.slice(1);order.splice(platz-1,0,tab[0]);
    const T=liga?order.map((r,i)=>{const N=9,w=Math.max(0,N-3-i),u=i%3===0?1:0,l=N-w-u;return{p:i+1,team:r.team,sp:N,s:w,u,n:Math.max(0,l),tore:(w*2+u+3)+":"+(l*2+u+2),diff:(w*2+u+3)-(l*2+u+2),pkt:w*3+u,auf:i===0,ab:i===order.length-1}}):[];
    put("fussball/"+fdid(tid),{v:1,id:fdid(tid),tids:[tid],abgeholt:idx.stand,geaendert:idx.stand,fehler:null,eigen:own,spiele:sp,tabelle:T,tabelleStand:idx.stand,hash:"demo"+tid});
    idx.teams[fdid(tid)]={tids:[tid],ok:true,fehler:null,abgeholt:idx.stand,geaendert:idx.stand,nSpiele:sp.length,nTabelle:T.length,eigen:own}});
  put("fussball/_index",idx);
  /* Nutzungsstufen (Demo): D1 voll wie bisher, D2 und E1 Standard, E2 Basis */
  [["d2","standard"],["e1","standard"],["e2","basis"]].forEach(([tid,st])=>{const c=store.get(tid+"__config/main");if(c){c.stufe=st;put(tid+"__config/main",c)}const v=store.get(tid+"__vstat/main");if(v){v.st=st;put(tid+"__vstat/main",v)}});

  /* Kennzahlen: nächste Spiele (mit Ort) für Übersicht und Wochenende */
  TEAMS.forEach(([tid])=>{const vs=store.get(tid+"__vstat/main");if(!vs)return;
    vs.naechste=gamesOf(tid).filter((g)=>g.datum>=TODAY).slice(0,8).map((g)=>({d:g.datum,z:"10:30",g:g.gegner,h:g.ha,o:"Sportanlage Musterstadt",a:"Meisterschaft"}));if(tid==="a1"||tid==="d1"){const g0=vs.naechste.find((g)=>g.h==="H");if(g0)g0.p=tid==="a1"?"Kunstrasen":"Naturrasen"}put(tid+"__vstat/main",vs)});
}

/* ---------- Verein, Rollen, Personen ---------- */
put("verein/main",{name:"TuS Musterstadt (Demo)",saison:"2026/27",teams:TEAMS.map(([id,name,ak])=>({id,name,ak,aktiv:true})),arten:ARTEN,bereiche:[{id:"mini",name:"Minis bis U13",teams:["m1","g1","f1","f2","e1","e2","d1","d2"]},{id:"gross",name:"U14 bis U19",teams:["c2","c1","b1","a1"]}],settings:{ausgrauenTage:42,erinnerungTage:21,loeschMonate:24},kontakteVerein:[]});
const memDoc=(email,name,art,teams)=>{const a=ARTEN.find((x)=>x.id===art),all=TEAMS.map((t)=>t[0]),tl=teams==="*"?all:teams,tr={};tl.forEach((t)=>{tr[t]=a.rechte.slice()});return{email,name,rolle:"team",zu:[{art,teams:teams==="*"?[]:tl,...(teams==="*"?{alle:true}:{})}],tr,g:a.gl.slice(),kader:{}}};
if(P.rolle==="admin"||P.rolle==="jugendleiter"||P.rolle==="platzwart")put("mitglieder/"+EMAIL,{email:EMAIL,name:"Demo-Person",rolle:P.rolle,zu:[],tr:{},g:P.rolle==="platzwart"?[]:["plan","kurz"],kader:{}});
else put("mitglieder/"+EMAIL,memDoc(EMAIL,"Demo-Person",P.art,P.teams));
[["erika.beispiel@beispiel.test","Erika Beispiel","trainer",["d2"]],["jonas.probe@beispiel.test","Jonas Probe","cotrainer",["d1"]],["lena.muster@beispiel.test","Lena Muster","sportleiter",["e1","e2"]]].forEach(([e,n,a,t])=>put("mitglieder/"+e,memDoc(e,n,a,t)));
put("mitglieder/ina.demo@beispiel.test",{email:"ina.demo@beispiel.test",name:"Ina Demo",rolle:"jugendleiter",zu:[],tr:{},g:["plan","kurz"],kader:{}});

/* ---------- Platzplan (Standardwoche) ---------- */
const PL=[{id:"p1",name:"Kunstrasen",typ:"platz",viertel:true},{id:"p2",name:"Rasenplatz",typ:"platz",viertel:true},{id:"h1",name:"Sporthalle",typ:"halle",felder:3}];
const slots=[];let sn=0;
const sl=(tid,platz,tag,von,bis,teil)=>slots.push({id:"s"+(++sn),tid,art:"Training",platz,tag,von,bis,teil:teil||[1,2,3,4],pid:"sommer"});
[["m1",1,"15:30","16:30",[1]],["g1",1,"16:00","17:00",[1]],["c2",1,"18:30","20:00",[1,2,3,4]],["f1",1,"16:00","17:00",[2]],["f2",1,"16:00","17:00",[3,4]],["e1",1,"17:00","18:30",[1,2]],["e2",1,"17:00","18:30",[3,4]],["d1",2,"17:30","19:00",[1,2]],["d2",2,"17:30","19:00",[3,4]],["c1",1,"18:30","20:00",[1,2,3,4]],["b1",2,"19:00","20:30",[1,2]],["a1",2,"19:00","20:30",[3,4]]].forEach(([t,p,v,b,te],i)=>{[1,3].forEach((tg)=>sl(t,"p"+p,tg+(i%2),v,b,te))});
sl("g1","h1",5,"16:00","17:30",[1]);sl("f1","h1",5,"16:00","17:30",[2]);sl("f2","h1",5,"16:00","17:30",[3]);sl("e1","h1",5,"17:30","19:00",[1,2,3]);
put("plaene/platz",{plaetze:PL,kabinen:["0","1","2","3","4"],extern:[],stdKabine:{m1:"1",c2:"4",g1:"1",f1:"1",f2:"2",e1:"2",e2:"3",d1:"3",d2:"4",c1:"4",b1:"0",a1:"0"},stdKabineTag:{},slots,plans:[{id:"sommer",name:"Sommerplan"},{id:"winter",name:"Winterplan"}],aktiv:"sommer",aus:[]});
/* Platz frei / übernommen: E1 sagt das nächste Training auf dem Kunstrasen ab, D1 übernimmt ein Viertel zusätzlich, ein Viertel bleibt frei */
{const e1=slots.find((x)=>x.tid==="e1"&&x.platz==="p1"&&x.art==="Training");
  if(e1){let d=TODAY;for(let i=0;i<8&&dow(d)!==e1.tag;i++)d=addD(d,1);if(d===TODAY&&e1.bis<new Date().toTimeString().slice(0,5))d=addD(d,7);
    const up=new Date().toISOString();
    put("pfrei/f~"+e1.id+"~"+d,{slot:e1.id,datum:d,tid:"e1",platz:"p1",teil:e1.teil.slice(),von:e1.von,bis:e1.bis,up,by:"Lena Muster"});
    put("pnahme/"+d+"~"+e1.id+"~1",{datum:d,tid:"d1",platz:"p1",v:1,von:e1.von,bis:e1.bis,art:"Zusätzlich",qs:e1.id,up,by:"Jonas Probe"})}}
/* To-Dos und ein Anliegen */
put("todos/demo1",{text:"Lorem ipsum: Trikotsatz für die Saison bestellen",von:EMAIL,vname:"Demo-Person",fuer:EMAIL,fname:"",bis:addD(TODAY,5),done:false,at:new Date().toISOString()});
put("todos/demo2",{text:"Dolor sit amet: Hallenzeiten im Winter abstimmen",von:EMAIL,vname:"Demo-Person",fuer:EMAIL,fname:"",bis:"",done:false,at:new Date().toISOString()});
put("anliegen/demoa1",{id:"demoa1",von:"erika.beispiel@beispiel.test",vname:"Erika Beispiel",r_jl:true,r_ad:true,r_sl:false,art:"platz",betreff:"Rasenplatz am Freitag",text:"Lorem ipsum: Dürfen wir am Freitag zusätzlich den Rasenplatz nutzen?",at:new Date().toISOString(),st:"offen",msgs:[]});
/* Zwei Spiele an Wochentagen (heute bzw. morgen), damit der Hinweis in der Demo zu sehen ist */
let hd=TODAY;if(dow(hd)>5)hd=addD(hd,8-dow(hd));
put("kabinen/"+hd,{datum:hd,eintraege:[{id:"k1",kabine:"1",art:"Heim",tid:"d1",von:"18:00",bis:"20:15",txt:"gegen "+CL[0]},{id:"k2",kabine:"2",art:"Gast",fremd:CL[0],von:"18:00",bis:"20:15",txt:"bei D1"}]});

/* ---------- Mini-Firestore im Speicher ---------- */
const L=new Set();
const norm=(p)=>String(p).replace(/^\/+|\/+$/g,"");
const clone=(x)=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
const denyErr=()=>{const e=new Error("Missing or insufficient permissions.");e.code="permission-denied";return e};
const isFixed=P.rolle==="admin";
const snapDoc=(p,d)=>({id:p.split("/").pop(),exists:d!==undefined,data:()=>clone(d)});
const kick=()=>setTimeout(()=>L.forEach((f)=>{try{f()}catch(e){}}),0);
function docRef(path){path=norm(path);return{path,id:path.split("/").pop(),
  async get(){if(path.indexOf("ownercheck/")===0&&!isFixed)throw denyErr();return snapDoc(path,store.get(path))},
  async set(d,o){if(o&&o.merge)store.set(path,{...(store.get(path)||{}),...clone(d)});else store.set(path,clone(d));kick()},
  async update(d){if(!store.has(path)){const e=new Error("nf");e.code="not-found";throw e}store.set(path,{...store.get(path),...clone(d)});kick()},
  async delete(){store.delete(path);kick()},
  onSnapshot(a,b){const cb=typeof a==="function"?a:a&&a.next;let last=null;const run=()=>{const s=JSON.stringify(store.get(path));if(s!==last){last=s;cb&&cb(snapDoc(path,store.get(path)))}};L.add(run);setTimeout(run,0);return()=>L.delete(run)},
  collection(n){return colRef(path+"/"+n)}}}
function colRef(path,flt){path=norm(path);flt=flt||[];
  const rows=()=>{const out=[],dep=path.split("/").length+1;store.forEach((v,k)=>{const p=k.split("/");if(k.indexOf(path+"/")===0&&p.length===dep&&flt.every(([f,o,x])=>{const y=v[f];return o==="=="?y===x:o===">="?y>=x:o==="<="?y<=x:o===">"?y>x:o==="<"?y<x:o==="in"?x.indexOf(y)>=0:true}))out.push({id:p[p.length-1],data:v})});return out};
  const snap=()=>{const docs=rows().map((r)=>snapDoc(path+"/"+r.id,r.data));return{docs,empty:!docs.length,size:docs.length,forEach:(f)=>docs.forEach(f),docChanges:()=>docs.map((d)=>({type:"added",doc:d}))}};
  return{path,doc:(id)=>docRef(path+"/"+id),where:(f,o,x)=>colRef(path,flt.concat([[f,o,x]])),orderBy(){return this},limit(){return this},
    async get(){if(path==="mitglieder"&&P.rolle!=="admin"&&P.rolle!=="jugendleiter"){throw denyErr()}return snap()},
    onSnapshot(a,b){const cb=typeof a==="function"?a:a&&a.next;let last=null;const run=()=>{const s=JSON.stringify(rows());if(s!==last){last=s;cb&&cb(snap())}};L.add(run);setTimeout(run,0);return()=>L.delete(run)}}}
const user={email:EMAIL,emailVerified:true,isAnonymous:false,uid:"demo-uid",providerData:[{providerId:"password"}],async reload(){},async getIdToken(){return"demo"}};
const auth={currentUser:user,onAuthStateChanged(f){setTimeout(()=>f(user),0);return()=>{}},async signOut(){location.hash="";location.reload()},async signInAnonymously(){return{user}}};
const fsx={doc:docRef,collection:colRef,async enablePersistence(){}};
window.firebase={initializeApp(){},auth:Object.assign(()=>auth,{GoogleAuthProvider:function(){}}),firestore:()=>fsx};

/* ---------- Hinweisleiste oben ---------- */
const bar=()=>{if(document.getElementById("u13demo"))return;
  const st=document.createElement("style");st.textContent="#u13demo{position:relative;z-index:9000;background:#7c3aed;color:#fff;font:13px/1.4 system-ui,sans-serif;padding:6px 12px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:center;text-align:center}#u13demo b{font-weight:700}#u13demo a{color:#fff;text-decoration:underline;cursor:pointer}";document.head.appendChild(st);
  const d=document.createElement("div");d.id="u13demo";d.innerHTML="<span><b>Demo</b> · Ansicht als <b>"+P.n.replace(/&/g,"&amp;").replace(/</g,"&lt;")+"</b> · alle Namen und Daten sind erfunden, nichts wird gespeichert</span>";
  document.body.insertBefore(d,document.body.firstChild);
  const fitD=()=>document.documentElement.style.setProperty("--demoh","0px");fitD();window.addEventListener("resize",fitD);setTimeout(fitD,300);setTimeout(fitD,1500)};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bar);else bar();
setInterval(bar,1500);
})();
