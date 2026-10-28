/* Versand der Benachrichtigungen. Läuft als Zeitplan bei GitHub (.github/workflows/benachrichtigungen.yml) alle paar Minuten.
   Meldet sich als Versand-Helfer an (eigenes Konto ohne Trainer-Rechte), holt fällige Einträge aus „pushq“, schickt sie an die
   passenden Geräte aus „push“ und löscht sie danach. Abgemeldete Geräte werden entfernt.
   Das Protokoll bei GitHub ist öffentlich: Es enthält nur Zahlen, keine Adressen oder Namen. */
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const HELFER = "benachrichtigungen@trainerzentrale-u13.firebaseapp.com";
const VAPID_PUB = "BA1CPAVyJeqOF8ANijTZ6ykGbY4n_gXJMExX4VKQslCF_ES6SJ_ZFJGpQWYDuhbTiSMT_fqGmb_xMy0g3gZFO04";   /* passt zu web.js */
const ALT = 3 * 864e5;   /* ältere Einträge (Zeitplan lag still) werden ohne Versand gelöscht */
/* Texte ohne Namen; u = Adresse beim Antippen (./?link öffnet den auf dem Gerät gemerkten Spielerlink) */
const TX = {
  clip: { t: "Neuer Clip für dich", b: "Schau ihn dir in der App an und schreib deine Meinung dazu.", u: "./?link" },
  frist: { t: "Erinnerung: Clip-Aufgabe", b: "Bitte kommentiere den Clip bald. Falls du das schon gemacht hast: Danke!", u: "./?link" },
  kom: { t: "Antwort vom Trainer", b: "Der Trainer hat auf deinen Kommentar zum Clip geantwortet.", u: "./?link" },
  antwort: { t: "Antwort vom Trainer", b: "Der Trainer hat auf deine Nachricht geantwortet.", u: "./?link" },
  fb: { t: "Neues Feedback", b: "Ein Spieler oder Elternteil hat dir geschrieben.", u: "./" },
  hinweis: { t: "Neuer Hinweis vom Trainer", b: "Schau in die App.", u: "./?link" },
  notiz: { t: "Neue Notiz vom Trainer", b: "Schau in dein Profil in der App.", u: "./?link" },
  termin: { t: "Termin geändert", b: "Ein Termin wurde abgesagt oder verlegt. Schau in den Terminplan.", u: "./?link" },
  afrist: { t: "Erinnerung: Aufgabe", b: "Bitte denk an deine Aufgabe in der App.", u: "./?link" },
  aantw: { t: "Antwort auf eine Aufgabe", b: "Ein Spieler oder Elternteil hat auf eine Aufgabe geantwortet.", u: "./" },
  skom: { t: "Neuer Clip-Kommentar", b: "Ein Spieler hat einen Clip kommentiert.", u: "./" },
  kanfr: { t: "Neue Konto-Anfrage", b: "Bitte in der App freigeben oder ablehnen.", u: "./" },
};
/* Was ein Gerät abgewählt hat (Feld x, durch Komma getrennt): die Antwort auf einen Clip-Kommentar zählt zu „antwort“ */
const GRP = { kom: "antwort" };

/* Wer bekommt den Eintrag? s = Anmeldung eines Geräts (ro: s Spieler, e Elternteil, t Trainer, leer = noch nicht gewählt) */
export function passt(q, s) {
  if (typeof s.x === "string" && s.x.split(",").includes(GRP[q.art] || q.art)) return false;
  if (q.art === "fb" || q.art === "aantw" || q.art === "skom" || q.art === "kanfr") return s.ro === "t";
  if (q.art === "termin") return s.ro !== "t";
  if (q.art === "notiz" || q.art === "afrist") return s.ro !== "t" && !!s.pid && Array.isArray(q.an) && q.an.includes(s.pid);
  if (q.art === "hinweis") return s.ro !== "t" && (!Array.isArray(q.an) || (!!s.pid && q.an.includes(s.pid)));   /* Hinweis an einzelne Spieler: nur deren Geräte */
  if (q.art === "antwort") return !!q.r && s.r === q.r && s.ro !== "t";
  if (q.art === "clip" || q.art === "frist" || q.art === "kom") return s.ro !== "t" && s.ro !== "e" && !!s.pid && (q.an === "alle" || (Array.isArray(q.an) && q.an.includes(s.pid)));
  return false;
}
export function nachricht(q, id) {
  const x = TX[q.art];
  const b = (q.art === "frist" || q.art === "afrist") && typeof q.tx === "string" && q.tx.length < 200 ? q.tx : x.b;
  const t = q.art === "hinweis" && q.a ? "Neue Aufgabe für dich" : x.t;   /* Aufgabe (mit Antwort oder Abhaken) statt Hinweis */
  return { t, b, u: x.u, g: q.art + "-" + id };
}

const val = (v) => v == null ? null : "stringValue" in v ? v.stringValue : "integerValue" in v ? +v.integerValue : "doubleValue" in v ? v.doubleValue
  : "booleanValue" in v ? v.booleanValue : "arrayValue" in v ? (v.arrayValue.values || []).map(val) : "timestampValue" in v ? Date.parse(v.timestampValue) : null;
const obj = (d) => { const o = { id: d.name.split("/").pop() }; Object.entries(d.fields || {}).forEach(([k, v]) => { o[k] = val(v); }); return o; };

export async function run({ fetch, webpush, env, now = Date.now(), log = console.log, cfg }) {
  if (!env.HELFER_PASSWORT || !env.VAPID_PRIVAT) throw new Error("Geheimnisse HELFER_PASSWORT und VAPID_PRIVAT fehlen (GitHub → Settings → Secrets → Actions).");
  const api = cfg.apiKey, base = "https://firestore.googleapis.com/v1/projects/" + cfg.projectId + "/databases/(default)/documents";
  /* falls der Schlüssel auf die eigene Seite beschränkt ist: Herkunft wie die App (GitHub Pages) angeben */
  const [own, repo] = String(env.GITHUB_REPOSITORY || "").split("/"), ref = own && repo ? { Referer: "https://" + own.toLowerCase() + ".github.io/" + repo + "/" } : {};
  const login = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + api,
    { method: "POST", headers: { "Content-Type": "application/json", ...ref }, body: JSON.stringify({ email: HELFER, password: String(env.HELFER_PASSWORT).trim(), returnSecureToken: true }) });
  if (!login.ok) { let c = ""; try { c = ((await login.json()).error || {}).message || ""; } catch (e) { }
    throw new Error("Anmeldung des Versand-Helfers fehlgeschlagen (" + login.status + (c ? ", " + c : "") + "). Konto und Passwort prüfen."); }
  const H = { Authorization: "Bearer " + (await login.json()).idToken, "Content-Type": "application/json", ...ref };
  const call = async (url, o = {}) => { const r = await fetch(url, { headers: H, ...o }); if (!r.ok && r.status !== 404) throw new Error("Datenbank " + r.status); return r; };

  /* Aufgabe mit Abhaken: schon erledigt? (geheimer Pfad aufg/<s>/m/x, nur für diesen Spieler) */
  const abgehakt = async (sg) => { if (typeof sg !== "string" || !/^[0-9a-f]{64}$/.test(sg)) return false;
    const r = await fetch(base + "/aufg/" + sg + "/m/x", { headers: H }); if (!r.ok) return false; const d = obj(await r.json()); return d.d === true; };

  /* fällige Einträge */
  const qr = await call(base + ":runQuery", { method: "POST", body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "pushq" }],
    where: { fieldFilter: { field: { fieldPath: "t" }, op: "LESS_THAN_OR_EQUAL", value: { integerValue: String(now) } } }, limit: 200 } }) });
  const due = (await qr.json()).filter((x) => x.document).map((x) => obj(x.document));
  if (!due.length) { log("Nichts zu senden."); return { gesendet: 0 }; }

  /* angemeldete Geräte */
  const subs = []; let tok = "";
  do { const r = await call(base + "/push?pageSize=300" + (tok ? "&pageToken=" + encodeURIComponent(tok) : "")); const j = await r.json();
    (j.documents || []).forEach((d) => subs.push(obj(d))); tok = j.nextPageToken || ""; } while (tok && subs.length < 5000);

  webpush.setVapidDetails("https://github.com/" + (env.GITHUB_REPOSITORY || "U13-HUB"), VAPID_PUB, env.VAPID_PRIVAT);
  const weg = new Set(); let ok = 0, fehl = 0, alt = 0;
  for (const q of due) {
    if (now - q.t > ALT || !TX[q.art]) alt++;
    else if (q.art === "afrist" && await abgehakt(q.s)) { }
    else {
      const msg = JSON.stringify(nachricht(q, q.id)), seen = new Set();
      for (const s of subs) {
        if (weg.has(s.id) || seen.has(s.e) || !passt(q, s)) continue; seen.add(s.e);
        try { await webpush.sendNotification({ endpoint: s.e, keys: { p256dh: s.p, auth: s.a } }, msg, { TTL: 86400 }); ok++; }
        catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) weg.add(s.id); else fehl++; }
      }
    }
    await call(base + "/pushq/" + encodeURIComponent(q.id), { method: "DELETE" });
  }
  for (const id of weg) await call(base + "/push/" + id, { method: "DELETE" });
  log("Einträge: " + due.length + (alt ? " (davon " + alt + " veraltet)" : "") + " · gesendet: " + ok + " · Fehler: " + fehl + " · abgemeldete Geräte entfernt: " + weg.size);
  return { gesendet: ok, fehler: fehl, entfernt: weg.size, alt };
}

/* Aufruf bei GitHub: node push/senden.mjs */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const txt = fs.readFileSync(new URL("../firebase-config.js", import.meta.url), "utf8"), get = (k) => (txt.match(new RegExp(k + '\\s*:\\s*"([^"]+)"')) || [])[1];
  const webpush = (await import("web-push")).default;
  run({ fetch, webpush, env: process.env, cfg: { apiKey: get("apiKey"), projectId: get("projectId") } }).catch((e) => { console.error(e.message); process.exit(1); });
}
