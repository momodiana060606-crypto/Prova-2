import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { AGENTI } from "./agents.js";
import { eseguiSessione, rispondiAlCapo } from "./pipeline.js";
import { infoModello, MODALITA_DEMO } from "./llm.js";

const qui = path.dirname(fileURLToPath(import.meta.url));
const CARTELLA_PUBBLICA = path.join(qui, "..", "public");
const CARTELLA_DATI = process.env.CARTELLA_DATI || path.join(qui, "..", "data");
const PORTA = Number(process.env.PORT) || 3000;

fs.mkdirSync(CARTELLA_DATI, { recursive: true });

// ---------- Sessioni (una sessione = una chat di gruppo) ----------
const sessioni = new Map();
const iscritti = new Map(); // id sessione -> Set di risposte SSE

for (const f of fs.readdirSync(CARTELLA_DATI).filter((f) => f.endsWith(".json"))) {
  const s = JSON.parse(fs.readFileSync(path.join(CARTELLA_DATI, f), "utf8"));
  if (s.stato === "in_corso") s.stato = "interrotta";
  s.scrivendo = [];
  sessioni.set(s.id, s);
}

function salva(s) {
  const { scrivendo, ...daSalvare } = s;
  fs.writeFileSync(path.join(CARTELLA_DATI, `${s.id}.json`), JSON.stringify(daSalvare, null, 2));
}

function trasmetti(s, evento) {
  const riga = `data: ${JSON.stringify(evento)}\n\n`;
  for (const res of iscritti.get(s.id) ?? []) res.write(riga);
}

function creaChat(s) {
  const aggiungi = (da, testo, dettagli) => {
    const m = { id: crypto.randomUUID(), da, testo, dettagli, ora: new Date().toISOString() };
    s.messaggi.push(m);
    salva(s);
    trasmetti(s, { tipo: "messaggio", messaggio: m });
  };
  return {
    sessione: s,
    invia: (idAgente, testo, dettagli) => aggiungi(idAgente, testo, dettagli),
    sistema: (testo) => aggiungi("sistema", testo),
    scrive: (idAgente, attivo) => {
      s.scrivendo = attivo ? [...new Set([...s.scrivendo, idAgente])] : s.scrivendo.filter((x) => x !== idAgente);
      trasmetti(s, { tipo: "scrivendo", agenti: s.scrivendo });
    },
    salva: () => salva(s),
  };
}

function cambiaStato(s, stato) {
  s.stato = stato;
  salva(s);
  trasmetti(s, { tipo: "stato", stato });
}

function avviaSessione(profilo) {
  const s = {
    id: crypto.randomUUID().slice(0, 8),
    titolo: profilo.titolo?.trim() || `Sessione del ${new Date().toLocaleDateString("it-IT")}`,
    creata: new Date().toISOString(),
    profilo,
    stato: "in_corso",
    idee: {},
    messaggi: [],
    scrivendo: [],
  };
  sessioni.set(s.id, s);
  const chat = creaChat(s);
  eseguiSessione(chat)
    .then(() => cambiaStato(s, "completata"))
    .catch((err) => {
      console.error(err);
      chat.sistema(`⚠️ Si è verificato un errore: ${err.message}`);
      cambiaStato(s, "errore");
    });
  return s;
}

// ---------- HTTP ----------
const TIPI = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };

function inviaJson(res, codice, dati) {
  res.writeHead(codice, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(dati));
}

async function leggiCorpo(req) {
  let corpo = "";
  for await (const pezzo of req) {
    corpo += pezzo;
    if (corpo.length > 100_000) throw new Error("Richiesta troppo grande");
  }
  return corpo ? JSON.parse(corpo) : {};
}

const riassunto = (s) => ({
  id: s.id,
  titolo: s.titolo,
  creata: s.creata,
  stato: s.stato,
  ultimo: s.messaggi.at(-1) ?? null,
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const parti = url.pathname.split("/").filter(Boolean);
  try {
    if (parti[0] === "api") {
      const s = parti[2] ? sessioni.get(parti[2]) : null;

      if (req.method === "GET" && parti[1] === "info") {
        return inviaJson(res, 200, {
          modello: infoModello(),
          demo: MODALITA_DEMO,
          agenti: AGENTI.map(({ system, ...a }) => a),
        });
      }
      if (parti[1] !== "sessioni") return inviaJson(res, 404, { errore: "Non trovato" });

      if (parti.length === 2 && req.method === "GET") {
        return inviaJson(res, 200, [...sessioni.values()].map(riassunto).sort((a, b) => (b.ultimo?.ora ?? b.creata).localeCompare(a.ultimo?.ora ?? a.creata)));
      }
      if (parti.length === 2 && req.method === "POST") {
        const { titolo, ore, budget, competenze, risorse, note } = await leggiCorpo(req);
        const profilo = Object.fromEntries(
          Object.entries({ titolo, ore, budget, competenze, risorse, note }).map(([k, v]) => [k, String(v ?? "").slice(0, 2000)]),
        );
        return inviaJson(res, 201, riassunto(avviaSessione(profilo)));
      }
      if (!s) return inviaJson(res, 404, { errore: "Sessione non trovata" });

      if (parti.length === 3 && req.method === "GET") {
        const { scrivendo, ...resto } = s;
        return inviaJson(res, 200, { ...resto, scrivendo });
      }
      if (parti.length === 3 && req.method === "DELETE") {
        if (s.stato === "in_corso") return inviaJson(res, 409, { errore: "Aspetta che il team finisca prima di eliminarla" });
        sessioni.delete(s.id);
        fs.rmSync(path.join(CARTELLA_DATI, `${s.id}.json`), { force: true });
        return inviaJson(res, 200, { ok: true });
      }
      if (parti[3] === "eventi" && req.method === "GET") {
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
        res.write(`data: ${JSON.stringify({ tipo: "scrivendo", agenti: s.scrivendo })}\n\n`);
        if (!iscritti.has(s.id)) iscritti.set(s.id, new Set());
        iscritti.get(s.id).add(res);
        const battito = setInterval(() => res.write(": ping\n\n"), 25_000);
        req.on("close", () => {
          clearInterval(battito);
          iscritti.get(s.id)?.delete(res);
        });
        return;
      }
      if (parti[3] === "messaggi" && req.method === "POST") {
        const testo = String((await leggiCorpo(req)).testo ?? "").trim().slice(0, 4000);
        if (!testo) return inviaJson(res, 400, { errore: "Messaggio vuoto" });
        const chat = creaChat(s);
        chat.invia("tu", testo);
        rispondiAlCapo(chat, testo).catch((err) => {
          console.error(err);
          chat.sistema(`⚠️ Nessuno è riuscito a risponderti: ${err.message}`);
        });
        return inviaJson(res, 202, { ok: true });
      }
      return inviaJson(res, 404, { errore: "Non trovato" });
    }

    // File statici
    const file = path.join(CARTELLA_PUBBLICA, path.normalize(url.pathname === "/" ? "index.html" : url.pathname));
    if (!file.startsWith(CARTELLA_PUBBLICA) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      return res.end("Non trovato");
    }
    res.writeHead(200, { "content-type": TIPI[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  } catch (err) {
    console.error(err);
    inviaJson(res, 500, { errore: err.message });
  }
});

server.listen(PORTA, () => {
  console.log(`💬 Agenzia Idee pronta su http://localhost:${PORTA}`);
  console.log(`   Modello: ${infoModello()}`);
  if (MODALITA_DEMO) console.log("   ⚠️  Nessuna ANTHROPIC_API_KEY trovata: uso risposte simulate (modalità demo).");
});
