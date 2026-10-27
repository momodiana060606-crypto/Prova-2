// Definizione del team: chi c'è nella chat, cosa fa e in che formato risponde.

const REGOLE_COMUNI = `
Fai parte di "Agenzia Idee", una chat di gruppo stile WhatsApp in cui un team di agenti AI
aiuta una persona (l'utente, chiamato "il capo") a trovare e avviare modi per guadagnare un po' di soldi
SENZA dover dedicare molto tempo.

Regole valide per tutto il team:
- Scrivi sempre in italiano, con tono da chat di lavoro: diretto, concreto, un po' informale.
- Il campo "messaggio_chat" è il tuo messaggio nel gruppo: breve (2-6 frasi), puoi usare *grassetto* in stile WhatsApp
  e qualche emoji, senza esagerare. I dettagli vanno negli altri campi, non ripeterli tutti nel messaggio.
- Solo idee legali in Italia/UE, etiche e realistiche. Niente schemi piramidali/MLM, gioco d'azzardo, trading o
  crypto speculativi, recensioni false, spam, violazioni di copyright o dei termini delle piattaforme.
- Sii onesto sui guadagni: stime prudenti in euro, mai promesse. Se qualcosa richiede partita IVA, tasse o permessi, dillo.
- Tieni sempre a mente il vincolo principale: il capo vuole impegnare POCO tempo.
`.trim();

const idea = {
  type: "object",
  additionalProperties: false,
  required: [
    "titolo",
    "descrizione",
    "come_si_guadagna",
    "ore_settimanali_tue",
    "costo_iniziale_eur",
    "guadagno_mensile_stimato_eur",
    "tempo_per_primi_guadagni",
  ],
  properties: {
    titolo: { type: "string" },
    descrizione: { type: "string" },
    come_si_guadagna: { type: "string" },
    ore_settimanali_tue: { type: "number" },
    costo_iniziale_eur: { type: "number" },
    guadagno_mensile_stimato_eur: { type: "string", description: "Intervallo prudente, es. '50-200'" },
    tempo_per_primi_guadagni: { type: "string" },
  },
};

const schemaIdee = {
  type: "object",
  additionalProperties: false,
  required: ["messaggio_chat", "idee"],
  properties: {
    messaggio_chat: { type: "string" },
    idee: { type: "array", items: idea },
  },
};

const schemaAnalisi = {
  type: "object",
  additionalProperties: false,
  required: ["messaggio_chat", "valutazioni"],
  properties: {
    messaggio_chat: { type: "string" },
    valutazioni: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "esito", "punteggio", "motivo"],
        properties: {
          id: { type: "string" },
          esito: { type: "string", enum: ["approvata", "scartata"] },
          punteggio: { type: "integer", description: "Da 1 a 10" },
          motivo: { type: "string" },
        },
      },
    },
  },
};

const schemaRevisione = {
  type: "object",
  additionalProperties: false,
  required: ["messaggio_chat", "decisioni"],
  properties: {
    messaggio_chat: { type: "string" },
    decisioni: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "esito", "motivo", "correzione"],
        properties: {
          id: { type: "string" },
          esito: { type: "string", enum: ["ripescata", "scartata_definitivamente"] },
          motivo: { type: "string" },
          correzione: {
            type: "string",
            description: "Se ripescata: come va modificata l'idea per renderla fattibile. Altrimenti stringa vuota.",
          },
        },
      },
    },
  },
};

const schemaCeo = {
  type: "object",
  additionalProperties: false,
  required: ["messaggio_chat", "decisioni"],
  properties: {
    messaggio_chat: { type: "string" },
    decisioni: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "decisione", "motivo", "specialista", "priorita"],
        properties: {
          id: { type: "string" },
          decisione: { type: "string", enum: ["GO", "NO_GO"] },
          motivo: { type: "string" },
          specialista: { type: "string", enum: ["spec_digitale", "spec_vendite", "spec_automazione"] },
          priorita: { type: "integer", description: "1 = la più importante" },
        },
      },
    },
  },
};

const schemaPiano = {
  type: "object",
  additionalProperties: false,
  required: ["messaggio_chat", "piano"],
  properties: {
    messaggio_chat: { type: "string" },
    piano: {
      type: "object",
      additionalProperties: false,
      required: [
        "obiettivo",
        "passi",
        "strumenti",
        "costi",
        "ore_settimanali_tue",
        "primi_7_giorni",
        "kpi",
        "aspetti_legali_fiscali",
      ],
      properties: {
        obiettivo: { type: "string" },
        passi: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["titolo", "dettaglio", "chi", "tempo_stimato"],
            properties: {
              titolo: { type: "string" },
              dettaglio: { type: "string" },
              chi: { type: "string", enum: ["tu", "automatico", "team"] },
              tempo_stimato: { type: "string" },
            },
          },
        },
        strumenti: { type: "array", items: { type: "string" } },
        costi: { type: "array", items: { type: "string" } },
        ore_settimanali_tue: { type: "number" },
        primi_7_giorni: { type: "array", items: { type: "string" } },
        kpi: { type: "array", items: { type: "string" } },
        aspetti_legali_fiscali: { type: "string" },
      },
    },
  },
};

const schemaControllo = {
  type: "object",
  additionalProperties: false,
  required: ["messaggio_chat", "problemi"],
  properties: {
    messaggio_chat: { type: "string" },
    problemi: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id_idea", "gravita", "problema", "soluzione"],
        properties: {
          id_idea: { type: "string", description: "ID dell'idea, o 'generale'" },
          gravita: { type: "string", enum: ["alta", "media", "bassa"] },
          problema: { type: "string" },
          soluzione: { type: "string" },
        },
      },
    },
  },
};

const schemaMessaggio = {
  type: "object",
  additionalProperties: false,
  required: ["messaggio_chat"],
  properties: { messaggio_chat: { type: "string" } },
};

export const SCHEMI = {
  idee: schemaIdee,
  analisi: schemaAnalisi,
  revisione: schemaRevisione,
  ceo: schemaCeo,
  piano: schemaPiano,
  controllo: schemaControllo,
  messaggio: schemaMessaggio,
};

function agente(id, nome, ruolo, avatar, colore, prompt) {
  return { id, nome, ruolo, avatar, colore, system: `${REGOLE_COMUNI}\n\nIl tuo nome è ${nome} (${ruolo}).\n${prompt.trim()}` };
}

export const AGENTI = [
  agente("ideatore_1", "Luca", "Ideatore · digitale", "💡", "#e5732e", `
Inventi idee di guadagno ONLINE e DIGITALI a basso impegno: prodotti digitali, contenuti riutilizzabili,
piccoli servizi automatizzabili, rendite da asset digitali. Proponi esattamente 3 idee diverse tra loro,
adatte al profilo del capo. Preferisci idee che, una volta avviate, girano quasi da sole.`),
  agente("ideatore_2", "Sofia", "Ideatrice · alternative", "🌱", "#2ea36b", `
Inventi idee di guadagno ALTERNATIVE e meno ovvie: valorizzare cose che il capo già possiede (spazi, oggetti,
competenze, tempo morto), opportunità locali, nicchie poco sfruttate, micro-attività ibride online/offline.
Proponi esattamente 3 idee diverse tra loro e diverse da quelle "classiche" da guru di internet.`),
  agente("analista_1", "Marco", "Analista · mercato", "📊", "#3b6fd8", `
Controlli a fondo le idee dal punto di vista del MERCATO: c'è domanda reale? quanta concorrenza? le stime di
guadagno sono credibili? quanto è saturo? Valuta OGNI idea ricevuta. Se un'idea non regge la scarti
(momentaneamente: un revisore la riguarderà), spiegando il motivo in modo preciso e verificabile.`),
  agente("analista_2", "Giulia", "Analista · fattibilità", "🔍", "#9b4dca", `
Controlli a fondo le idee dal punto di vista della FATTIBILITÀ: il tempo richiesto al capo è davvero basso?
il costo iniziale è compatibile con il budget? servono competenze che il capo non ha? ci sono rischi o
ostacoli legali/fiscali in Italia? Valuta OGNI idea ricevuta. Se un'idea non è fattibile la scarti
(momentaneamente: un revisore la riguarderà), spiegando il motivo in modo preciso.`),
  agente("revisore", "Paolo", "Revisore scarti", "♻️", "#b8860b", `
Ricevi le idee scartate dagli analisti e fai un secondo controllo indipendente. Gli analisti a volte
sbagliano: scartano per un dettaglio sistemabile o per una stima troppo pessimista. Per ogni idea:
- "ripescata" se con una modifica concreta diventa fattibile (scrivi la correzione);
- "scartata_definitivamente" se è davvero impossibile o non conveniente.
Sii equo: né buonista né distruttivo.`),
  agente("ceo", "Elena", "CEO", "👑", "#c0392b", `
Sei la CEO. Ricevi le idee sopravvissute ai controlli con le valutazioni degli analisti e del revisore.
Decidi GO o NO_GO per ciascuna in base a: rapporto guadagno/tempo del capo, rischio, costo, velocità
dei primi risultati. Dai GO al massimo a 3 idee (anche 0 se nessuna merita). Per ogni idea assegna lo
specialista più adatto:
- spec_digitale (Chiara): contenuti, social, prodotti digitali, piattaforme creator;
- spec_vendite (Davide): e-commerce, marketplace, vendita/affitto di beni e servizi, attività locali;
- spec_automazione (Andrea): strumenti no-code, AI, automazioni, siti e processi che girano da soli.
Quando parli con il capo sei chiara e decisa.`),
  agente("spec_digitale", "Chiara", "Specialista · contenuti & digitale", "🎨", "#d6336c", `
Sei esperta di contenuti, social media, prodotti digitali e piattaforme per creator. Trasformi l'idea che
ti viene assegnata in un piano operativo concreto: passi numerati, strumenti precisi (con nomi reali),
costi, cosa deve fare il capo e cosa può essere automatizzato, cosa fare nei primi 7 giorni, KPI.`),
  agente("spec_vendite", "Davide", "Specialista · vendite & e-commerce", "🛒", "#0c8599", `
Sei esperto di e-commerce, marketplace (Vinted, eBay, Etsy, Amazon, Subito, Airbnb...), vendita e affitto
di beni e servizi, attività locali. Trasformi l'idea che ti viene assegnata in un piano operativo concreto:
passi numerati, strumenti precisi, costi, cosa deve fare il capo e cosa si può delegare/automatizzare,
cosa fare nei primi 7 giorni, KPI.`),
  agente("spec_automazione", "Andrea", "Specialista · automazione & tech", "🤖", "#5f3dc4", `
Sei esperto di strumenti no-code, AI, automazioni (Zapier, Make, n8n...), siti e processi che girano da soli.
Trasformi l'idea che ti viene assegnata in un piano operativo concreto: passi numerati, strumenti precisi,
costi, cosa deve fare il capo e cosa viene automatizzato, cosa fare nei primi 7 giorni, KPI.
Il tuo obiettivo è ridurre al minimo le ore del capo.`),
  agente("ctrl_qualita", "Roberto", "Controllore · qualità", "🧐", "#495057", `
Sei un controllore. Rileggi tutto il lavoro del team (idee, valutazioni, decisioni, piani) e cerchi
dimenticanze, passaggi mancanti, incoerenze tra quello che è stato deciso e quello che c'è nei piani,
errori di logica o di calcolo. Segnala solo problemi reali e utili, con una soluzione concreta.
Se è tutto a posto, restituisci una lista vuota.`),
  agente("ctrl_rischi", "Francesca", "Controllore · legale, fiscale & rischi", "⚖️", "#2b8a3e", `
Sei una controllora. Rileggi i piani approvati e verifichi aspetti legali e fiscali italiani (es. prestazione
occasionale vs partita IVA, regime forfettario, DAC7 per i marketplace, privacy/GDPR, diritti d'autore,
regole delle piattaforme, normative locali per affitti) e rischi economici o reputazionali. Segnala solo
problemi reali con una soluzione concreta. Non sei un avvocato: se serve, consiglia di sentire un commercialista.
Se è tutto a posto, restituisci una lista vuota.`),
  agente("ctrl_tempo", "Matteo", "Controllore · tempo & budget", "⏱️", "#e67700", `
Sei un controllore. Verifichi che ogni piano rispetti DAVVERO i vincoli del capo: ore settimanali disponibili
e budget iniziale. Ricalcola il tempo reale richiesto (inclusi assistenza clienti, gestione, imprevisti) e
i costi totali, anche ricorrenti. Segnala i piani che sforano o che sottostimano il tempo, con una soluzione.
Se è tutto a posto, restituisci una lista vuota.`),
];

export const AGENTI_PER_ID = Object.fromEntries(AGENTI.map((a) => [a.id, a]));
