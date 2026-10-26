// Il flusso di lavoro del team: idee → analisi → revisione scarti → CEO → piani → controlli → correzioni → riepilogo.
import { AGENTI_PER_ID } from "./agents.js";
import { chiediAgente } from "./llm.js";

const json = (x) => JSON.stringify(x, null, 2);

function descriviProfilo(p) {
  return [
    `Ore a settimana che il capo può dedicare: ${p.ore || "poche (non specificato)"}`,
    `Budget iniziale: ${p.budget ? `${p.budget} €` : "molto basso (non specificato)"}`,
    `Competenze / cosa sa fare: ${p.competenze || "non specificato"}`,
    `Cosa possiede / risorse disponibili: ${p.risorse || "non specificato"}`,
    `Altre note: ${p.note || "nessuna"}`,
  ].join("\n");
}

const PIANO_VUOTO = (i) => ({ titolo: i.titolo, descrizione: i.descrizione, correzione_revisore: i.revisione?.correzione || undefined });

/** Parla un agente: mostra "sta scrivendo…", chiama il modello, pubblica il messaggio. */
async function turno(chat, idAgente, schema, contenuto, dettagli) {
  chat.scrive(idAgente, true);
  try {
    const out = await chiediAgente(idAgente, schema, contenuto);
    chat.invia(idAgente, out.messaggio_chat, dettagli ? dettagli(out) : undefined);
    return out;
  } finally {
    chat.scrive(idAgente, false);
  }
}

export async function eseguiSessione(chat) {
  const s = chat.sessione;
  const profilo = descriviProfilo(s.profilo);
  const contesto = (testo) => `PROFILO DEL CAPO:\n${profilo}\n\n${testo}`;
  const idee = s.idee;

  // 1. Ideatori (in parallelo)
  chat.sistema("🚀 *Fase 1 – Idee.* Luca e Sofia stanno pensando a come farti guadagnare.");
  const proposte = await Promise.all(
    ["ideatore_1", "ideatore_2"].map((id) =>
      turno(chat, id, "idee", contesto("Proponi le tue 3 idee."), (out) =>
        out.idee.map((i) => formattaIdea(i)).join("\n\n"),
      ),
    ),
  );
  let n = 0;
  proposte.forEach((out, k) => {
    for (const i of out.idee) {
      const id = `I${++n}`;
      idee[id] = { id, autore: k === 0 ? "ideatore_1" : "ideatore_2", ...i, valutazioni: {}, stato: "proposta" };
    }
  });
  chat.salva();
  const elencoIdee = (filtro = () => true) =>
    json(Object.values(idee).filter(filtro).map(({ valutazioni, stato, autore, piano, ...resto }) => resto));

  // 2. Analisti (in parallelo, valutano tutte le idee)
  chat.sistema("🔎 *Fase 2 – Analisi.* Marco e Giulia controllano tutte le idee a fondo.");
  await Promise.all(
    ["analista_1", "analista_2"].map(async (id) => {
      const out = await turno(chat, id, "analisi", contesto(`Valuta ognuna di queste idee (usa gli ID forniti):\n${elencoIdee()}`), (o) =>
        o.valutazioni.map((v) => `${v.esito === "approvata" ? "✅" : "❌"} *${v.id}* (${v.punteggio}/10) – ${v.motivo}`).join("\n"),
      );
      for (const v of out.valutazioni) if (idee[v.id]) idee[v.id].valutazioni[id] = v;
    }),
  );
  const scartate = [];
  for (const i of Object.values(idee)) {
    const vs = Object.values(i.valutazioni);
    i.stato = vs.length > 0 && vs.every((v) => v.esito === "approvata") ? "approvata" : "scartata_temp";
    if (i.stato === "scartata_temp") scartate.push(i);
  }
  chat.salva();

  // 3. Revisore delle idee scartate
  if (scartate.length) {
    chat.sistema(`♻️ *Fase 3 – Seconda chance.* ${scartate.length === 1 ? "Un'idea scartata passa" : `${scartate.length} idee scartate passano`} a Paolo.`);
    const out = await turno(
      chat,
      "revisore",
      "revisione",
      contesto(
        `Idee scartate momentaneamente, con le valutazioni degli analisti:\n${json(
          scartate.map((i) => ({ id: i.id, titolo: i.titolo, descrizione: i.descrizione, ore_settimanali_tue: i.ore_settimanali_tue, costo_iniziale_eur: i.costo_iniziale_eur, guadagno_mensile_stimato_eur: i.guadagno_mensile_stimato_eur, valutazioni: Object.values(i.valutazioni) })),
        )}`,
      ),
      (o) => o.decisioni.map((d) => `${d.esito === "ripescata" ? "🔄 ripescata" : "🗑️ scartata definitivamente"} *${d.id}* – ${d.motivo}${d.correzione ? `\n   ↳ _correzione:_ ${d.correzione}` : ""}`).join("\n"),
    );
    for (const d of out.decisioni) {
      const i = idee[d.id];
      if (!i || i.stato !== "scartata_temp") continue;
      i.revisione = d;
      i.stato = d.esito === "ripescata" ? "approvata" : "scartata";
    }
    // Se il revisore ne ha dimenticata qualcuna, resta scartata.
    for (const i of scartate) if (i.stato === "scartata_temp") i.stato = "scartata";
    chat.salva();
  } else {
    chat.sistema("♻️ Nessuna idea scartata: il revisore non ha niente da riguardare.");
  }

  const sopravvissute = Object.values(idee).filter((i) => i.stato === "approvata");
  if (!sopravvissute.length) {
    await turno(chat, "ceo", "messaggio", contesto(`Tutte le idee sono state scartate:\n${json(Object.values(idee))}\nSpiega al capo in breve perché e cosa gli consigli di dirci per il prossimo giro (es. più ore, più budget, altre competenze).`));
    return;
  }

  // 4. CEO
  chat.sistema(`👑 *Fase 4 – Decisione.* ${sopravvissute.length} idee arrivano sul tavolo di Elena.`);
  const decisione = await turno(
    chat,
    "ceo",
    "ceo",
    contesto(
      `Idee sopravvissute con valutazioni e revisioni:\n${json(
        sopravvissute.map((i) => ({ ...PIANO_VUOTO(i), id: i.id, ore_settimanali_tue: i.ore_settimanali_tue, costo_iniziale_eur: i.costo_iniziale_eur, guadagno_mensile_stimato_eur: i.guadagno_mensile_stimato_eur, valutazioni: Object.values(i.valutazioni), revisione: i.revisione })),
      )}\nDecidi GO o NO_GO per ciascuna (max 3 GO) e assegna lo specialista.`,
    ),
    (o) => o.decisioni
      .sort((a, b) => a.priorita - b.priorita)
      .map((d) => `${d.decisione === "GO" ? "🟢 GO" : "🔴 NO GO"} *${d.id}* ${idee[d.id]?.titolo ?? ""} – ${d.motivo}${d.decisione === "GO" ? `\n   ↳ affidata a ${AGENTI_PER_ID[d.specialista].nome}` : ""}`)
      .join("\n"),
  );
  const go = [];
  for (const d of decisione.decisioni) {
    const i = idee[d.id];
    if (!i || i.stato !== "approvata") continue;
    i.decisione_ceo = d;
    i.stato = d.decisione === "GO" ? "go" : "no_go";
    if (d.decisione === "GO" && go.length < 3) go.push(i);
  }
  chat.salva();
  if (!go.length) {
    chat.sistema("🛑 La CEO non ha dato il via a nessuna idea. Puoi rispondere in chat o avviare una nuova sessione con un profilo diverso.");
    return;
  }

  // 5. Specialisti (un piano per ogni idea GO, in parallelo)
  chat.sistema(`🛠️ *Fase 5 – Esecuzione.* Gli specialisti preparano i piani operativi.`);
  const preparaPiano = (i, extra = "") =>
    turno(
      chat,
      i.decisione_ceo.specialista,
      "piano",
      contesto(`La CEO ti ha affidato questa idea:\n${json({ id: i.id, ...PIANO_VUOTO(i), come_si_guadagna: i.come_si_guadagna, ore_settimanali_tue: i.ore_settimanali_tue, costo_iniziale_eur: i.costo_iniziale_eur, valutazioni: Object.values(i.valutazioni), nota_ceo: i.decisione_ceo.motivo })}${extra}\nPrepara il piano operativo completo.`),
      (o) => `*Piano per ${i.id} – ${i.titolo}*\n\n${formattaPiano(o.piano)}`,
    ).then((o) => {
      i.piano = o.piano;
      chat.salva();
    });
  await Promise.all(go.map((i) => preparaPiano(i)));

  // 6. Controllori (in parallelo, rileggono tutto)
  chat.sistema("🧐 *Fase 6 – Controlli.* Roberto, Francesca e Matteo verificano che non manchi niente.");
  const dossier = json(Object.values(idee));
  const problemi = [];
  await Promise.all(
    ["ctrl_qualita", "ctrl_rischi", "ctrl_tempo"].map(async (id) => {
      const out = await turno(chat, id, "controllo", contesto(`Ecco tutto il lavoro del team (idee con stato, valutazioni, decisioni e piani; i piani sono solo per le idee con stato "go"):\n${dossier}`), (o) =>
        o.problemi.length ? o.problemi.map((p) => `${{ alta: "🔴", media: "🟠", bassa: "🟡" }[p.gravita]} *${p.id_idea}* – ${p.problema}\n   ↳ _soluzione:_ ${p.soluzione}`).join("\n") : "Nessun problema rilevato ✅",
      );
      for (const p of out.problemi) problemi.push({ ...p, da: AGENTI_PER_ID[id].nome });
    }),
  );

  // 7. Correzioni: gli specialisti sistemano i problemi seri sui propri piani
  const daCorreggere = go.filter((i) => problemi.some((p) => p.gravita !== "bassa" && (p.id_idea === i.id || p.id_idea === "generale")));
  if (daCorreggere.length) {
    chat.sistema(`🔧 *Fase 7 – Correzioni.* ${daCorreggere.length === 1 ? "Un piano va sistemato" : `${daCorreggere.length} piani vanno sistemati`}.`);
    await Promise.all(
      daCorreggere.map((i) =>
        preparaPiano(
          i,
          `\n\nIL TUO PIANO PRECEDENTE:\n${json(i.piano)}\n\nI CONTROLLORI HANNO SEGNALATO QUESTI PROBLEMI (risolvili tutti nel nuovo piano e dì nel messaggio cosa hai cambiato):\n${json(problemi.filter((p) => p.id_idea === i.id || p.id_idea === "generale"))}`,
        ),
      ),
    );
  }
  s.problemi = problemi;
  chat.salva();

  // 8. Riepilogo finale della CEO
  await turno(
    chat,
    "ceo",
    "messaggio",
    contesto(`Il lavoro è finito. Piani finali:\n${json(go.map((i) => ({ id: i.id, titolo: i.titolo, piano: i.piano })))}\nScrivi al capo un riepilogo finale: quali idee partono, quanto tempo e soldi richiedono, e la PRIMA cosa concreta che deve fare oggi. Massimo 8 frasi.`),
  );
}

export function formattaIdea(i) {
  return [
    `*${i.titolo}*`,
    i.descrizione,
    `💶 ${i.come_si_guadagna}`,
    `⏱️ ${i.ore_settimanali_tue} h/settimana · 💰 avvio ${i.costo_iniziale_eur} € · 📈 ${i.guadagno_mensile_stimato_eur} €/mese · ⌛ primi guadagni: ${i.tempo_per_primi_guadagni}`,
  ].join("\n");
}

export function formattaPiano(p) {
  const chi = { tu: "👤 tu", automatico: "⚙️ auto", team: "🤝 team" };
  return [
    `🎯 ${p.obiettivo}`,
    `⏱️ Tempo tuo: *${p.ore_settimanali_tue} h/settimana*`,
    "",
    "*Passi*",
    ...p.passi.map((x, k) => `${k + 1}. *${x.titolo}* (${chi[x.chi] ?? x.chi}, ${x.tempo_stimato}) – ${x.dettaglio}`),
    "",
    "*Primi 7 giorni*",
    ...p.primi_7_giorni.map((x) => `• ${x}`),
    "",
    `*Strumenti:* ${p.strumenti.join(", ")}`,
    `*Costi:* ${p.costi.join("; ")}`,
    `*KPI:* ${p.kpi.join("; ")}`,
    `*Legale/fiscale:* ${p.aspetti_legali_fiscali}`,
  ].join("\n");
}

/** Risposta a un messaggio scritto dal capo nel gruppo. Se menziona @Nome risponde quell'agente, altrimenti la CEO. */
export async function rispondiAlCapo(chat, testo) {
  const s = chat.sessione;
  const menzionato = Object.values(AGENTI_PER_ID).find((a) => new RegExp(`@${a.nome}\\b`, "i").test(testo));
  const id = menzionato?.id ?? "ceo";
  const recenti = s.messaggi.slice(-30).map((m) => `${m.da === "tu" ? "CAPO" : m.da === "sistema" ? "SISTEMA" : AGENTI_PER_ID[m.da]?.nome}: ${m.testo}`).join("\n");
  await turno(
    chat,
    id,
    "messaggio",
    `PROFILO DEL CAPO:\n${descriviProfilo(s.profilo)}\n\nSTATO DEL LAVORO:\n${json(Object.values(s.idee))}\n\nULTIMI MESSAGGI DEL GRUPPO:\n${recenti}\n\nIl capo ha appena scritto: "${testo}"\nRispondigli tu nel gruppo, restando nel tuo ruolo.`,
  );
}
