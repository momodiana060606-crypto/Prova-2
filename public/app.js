const $ = (id) => document.getElementById(id);
const stato = { agenti: {}, corrente: null, sorgente: null, scrivendo: [] };

const api = async (metodo, url, corpo) => {
  const r = await fetch(url, { method: metodo, headers: { "content-type": "application/json" }, body: corpo && JSON.stringify(corpo) });
  const dati = await r.json();
  if (!r.ok) throw new Error(dati.errore || r.statusText);
  return dati;
};

// Testo stile WhatsApp: *grassetto*, _corsivo_, `codice`
const escape = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const formatta = (s) =>
  escape(s ?? "")
    .replace(/\*([^*\n]+)\*/g, "<b>$1</b>")
    .replace(/(^|[\s(])_([^_\n]+)_/g, "$1<i>$2</i>")
    .replace(/`([^`\n]+)`/g, "<code>$1</code>");

const ora = (iso) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
const giornoOra = (iso) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? ora(iso) : d.toLocaleDateString("it-IT");
};
const ETICHETTE_STATO = { in_corso: "il team sta lavorando…", completata: "lavoro completato", errore: "interrotta per un errore", interrotta: "interrotta (server riavviato)" };

function nomeDi(da) {
  if (da === "tu") return "Tu";
  if (da === "sistema") return "";
  return stato.agenti[da]?.nome ?? da;
}

// ---------- Elenco chat ----------
async function caricaElenco() {
  const lista = await api("GET", "/api/sessioni");
  $("vuoto").hidden = lista.length > 0;
  $("elenco").innerHTML = "";
  for (const s of lista) {
    const li = document.createElement("li");
    li.className = s.id === stato.corrente ? "attiva" : "";
    const ultimo = s.ultimo ? `${s.ultimo.da === "sistema" ? "" : nomeDi(s.ultimo.da) + ": "}${s.ultimo.testo}` : "";
    li.innerHTML = `<div class="avatar">💸</div><div class="corpo"><div class="riga1"><span class="nome"></span><span class="ora"></span></div><div class="anteprima"></div></div>`;
    li.querySelector(".nome").textContent = s.titolo;
    li.querySelector(".ora").textContent = giornoOra(s.ultimo?.ora ?? s.creata);
    li.querySelector(".anteprima").textContent = s.stato === "in_corso" ? "✍️ il team sta lavorando…" : ultimo.replace(/[*_]/g, "");
    li.onclick = () => apriChat(s.id);
    $("elenco").append(li);
  }
}

// ---------- Chat ----------
let ultimoMittente = null;

function aggiungiMessaggio(m) {
  const box = $("messaggi");
  if (m.da === "sistema") {
    const d = document.createElement("div");
    d.className = "sistema";
    d.innerHTML = formatta(m.testo);
    box.append(d);
    ultimoMittente = null;
  } else {
    const a = stato.agenti[m.da];
    const el = document.createElement("div");
    el.className = `msg${m.da === "tu" ? " mio" : ""}${ultimoMittente === m.da ? " seguito" : ""}`;
    el.innerHTML = `
      <div class="avatar">${a?.avatar ?? "🙂"}</div>
      <div class="bolla">
        ${m.da !== "tu" && ultimoMittente !== m.da ? `<div class="mittente" style="color:${a?.colore}">${escape(a?.nome ?? m.da)}<span class="ruolo">${escape(a?.ruolo ?? "")}</span></div>` : ""}
        <div class="testo">${formatta(m.testo)}</div>
        ${m.dettagli ? `<details class="dettagli"><summary>Mostra dettagli</summary><div class="testo">${formatta(m.dettagli)}</div></details>` : ""}
        <span class="meta">${ora(m.ora)}</span>
      </div>`;
    box.append(el);
    ultimoMittente = m.da;
  }
  const vicinoAlFondo = box.scrollHeight - box.scrollTop - box.clientHeight < 300;
  if (vicinoAlFondo) box.scrollTop = box.scrollHeight;
}

function aggiornaSottotitolo(s) {
  const sotto = $("sotto-titolo");
  if (stato.scrivendo.length) {
    const nomi = stato.scrivendo.map(nomeDi);
    sotto.innerHTML = `<span class="scrive">${escape(nomi.join(", "))} ${nomi.length > 1 ? "stanno" : "sta"} scrivendo…</span>`;
  } else {
    sotto.textContent = s ? ETICHETTE_STATO[s.stato] ?? "" : Object.values(stato.agenti).map((a) => a.nome).join(", ");
  }
}

let sessioneCorrente = null;

async function apriChat(id) {
  stato.sorgente?.close();
  stato.corrente = id;
  location.hash = id;
  document.querySelector(".app").classList.add("in-chat");
  const s = await api("GET", `/api/sessioni/${id}`);
  sessioneCorrente = s;
  stato.scrivendo = s.scrivendo ?? [];
  $("titolo-chat").textContent = s.titolo;
  $("messaggi").innerHTML = "";
  ultimoMittente = null;
  s.messaggi.forEach(aggiungiMessaggio);
  $("messaggi").scrollTop = $("messaggi").scrollHeight;
  $("scrivi").hidden = false;
  $("elimina").hidden = false;
  aggiornaSottotitolo(s);
  caricaElenco();

  const visti = new Set(s.messaggi.map((m) => m.id));
  const sorgente = new EventSource(`/api/sessioni/${id}/eventi`);
  stato.sorgente = sorgente;
  sorgente.onmessage = (e) => {
    const ev = JSON.parse(e.data);
    if (ev.tipo === "messaggio" && !visti.has(ev.messaggio.id)) {
      visti.add(ev.messaggio.id);
      aggiungiMessaggio(ev.messaggio);
      caricaElenco();
    } else if (ev.tipo === "scrivendo") {
      stato.scrivendo = ev.agenti;
    } else if (ev.tipo === "stato") {
      sessioneCorrente.stato = ev.stato;
      caricaElenco();
    }
    aggiornaSottotitolo(sessioneCorrente);
  };
}

// ---------- Azioni ----------
$("nuova").onclick = () => $("dialogo-nuova").showModal();
$("dialogo-nuova").addEventListener("close", async () => {
  if ($("dialogo-nuova").returnValue !== "ok") return;
  const dati = Object.fromEntries(new FormData($("form-nuova")));
  $("form-nuova").reset();
  const s = await api("POST", "/api/sessioni", dati);
  await apriChat(s.id);
});

$("scrivi").onsubmit = async (e) => {
  e.preventDefault();
  const testo = $("testo").value.trim();
  if (!testo || !stato.corrente) return;
  $("testo").value = "";
  try {
    await api("POST", `/api/sessioni/${stato.corrente}/messaggi`, { testo });
  } catch (err) {
    alert(err.message);
  }
};

$("elimina").onclick = async () => {
  if (!stato.corrente || !confirm("Eliminare questa chat?")) return;
  try {
    await api("DELETE", `/api/sessioni/${stato.corrente}`);
    stato.sorgente?.close();
    stato.corrente = null;
    location.hash = "";
    location.reload();
  } catch (err) {
    alert(err.message);
  }
};

$("indietro").onclick = () => {
  document.querySelector(".app").classList.remove("in-chat");
};

$("partecipanti-btn").onclick = () => $("dialogo-partecipanti").showModal();

// ---------- Avvio ----------
const info = await api("GET", "/api/info");
for (const a of info.agenti) stato.agenti[a.id] = a;
stato.agenti.tu = { nome: "Tu", avatar: "🙂" };
$("avviso-demo").hidden = !info.demo;
$("modello").textContent = `Modello: ${info.modello}`;
$("partecipanti").innerHTML = info.agenti
  .map((a) => `<li><div class="avatar">${a.avatar}</div><div><div class="nome" style="color:${a.colore}">${escape(a.nome)}</div><div class="sotto">${escape(a.ruolo)}</div></div></li>`)
  .join("");
aggiornaSottotitolo(null);
await caricaElenco();
if (location.hash.length > 1) apriChat(location.hash.slice(1)).catch(() => (location.hash = ""));
