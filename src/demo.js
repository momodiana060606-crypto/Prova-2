// Risposte simulate per provare l'interfaccia senza chiave API (MODALITA_DEMO=1).

const attesa = (ms) => new Promise((r) => setTimeout(r, ms));
const idsIn = (testo) => [...new Set([...testo.matchAll(/"id": "(I\d+)"/g)].map((m) => m[1]))];

const IDEE = {
  ideatore_1: [
    ["Pacchetto di template Canva", "Crei 20 template per piccoli negozi e li vendi su Etsy.", "Vendita di file digitali", 2, 13, "30-150", "3-6 settimane"],
    ["Newsletter di nicchia con sponsor", "Newsletter settimanale curata con AI su un hobby che conosci.", "Sponsor e affiliazioni", 3, 0, "0-100", "3-6 mesi"],
    ["Mini-corso registrato una volta", "Corso breve su una tua competenza, venduto su piattaforma.", "Vendita del corso", 2, 30, "50-300", "1-2 mesi"],
  ],
  ideatore_2: [
    ["Affitto attrezzatura inutilizzata", "Metti a noleggio attrezzi o strumenti che usi poco.", "Noleggio a giornata", 1, 0, "40-120", "2 settimane"],
    ["Svuota-cantina su Vinted/Subito", "Vendi in blocco ciò che non usi, con foto fatte in un pomeriggio.", "Vendita usato", 2, 0, "50-200 (una tantum)", "1 settimana"],
    ["Posto auto o deposito in affitto", "Affitti uno spazio che non usi come deposito o parcheggio.", "Canone mensile", 0.5, 10, "30-100", "1 mese"],
  ],
};

export async function rispostaDemo(idAgente, schema, contenuto) {
  await attesa(600 + Math.random() * 900);
  const ids = idsIn(contenuto);
  switch (schema) {
    case "idee":
      return {
        messaggio_chat: idAgente === "ideatore_1" ? "Ecco le mie 3 proposte digitali 💡 tutte poco impegnative una volta avviate." : "Io punto su cose che hai già in casa 🌱 zero investimento quasi ovunque.",
        idee: IDEE[idAgente].map(([titolo, descrizione, come_si_guadagna, ore, costo, guadagno, tempo]) => ({
          titolo, descrizione, come_si_guadagna, ore_settimanali_tue: ore, costo_iniziale_eur: costo, guadagno_mensile_stimato_eur: guadagno, tempo_per_primi_guadagni: tempo,
        })),
      };
    case "analisi":
      return {
        messaggio_chat: idAgente === "analista_1" ? "Ho controllato la domanda per ognuna. Un paio sono troppo sature 📉" : "Fattibilità controllata. Una richiede troppo tempo rispetto a quello che hai.",
        valutazioni: ids.map((id, k) => {
          const no = idAgente === "analista_1" ? k === 1 : k === 2 || k === 4;
          return { id, esito: no ? "scartata" : "approvata", punteggio: no ? 4 : 7, motivo: no ? "Rapporto tempo/guadagno poco convincente." : "Domanda presente e impegno contenuto." };
        }),
      };
    case "revisione":
      return {
        messaggio_chat: "Ho riguardato gli scarti: una si salva con una modifica, le altre no.",
        decisioni: ids.map((id, k) => ({
          id, esito: k === 0 ? "ripescata" : "scartata_definitivamente",
          motivo: k === 0 ? "Lo scarto era per un dettaglio sistemabile." : "Concorrenza troppo alta per i guadagni attesi.",
          correzione: k === 0 ? "Ridurre il perimetro a una sola nicchia per tagliare il tempo a metà." : "",
        })),
      };
    case "ceo":
      return {
        messaggio_chat: "Ho deciso 👑 partiamo con le due idee più rapide, le altre restano in panchina.",
        decisioni: ids.map((id, k) => ({
          id, decisione: k < 2 ? "GO" : "NO_GO", motivo: k < 2 ? "Miglior rapporto guadagno/tempo." : "Non prioritaria ora.",
          specialista: ["spec_digitale", "spec_vendite", "spec_automazione"][k % 3], priorita: k + 1,
        })),
      };
    case "piano":
      return {
        messaggio_chat: contenuto.includes("PIANO PRECEDENTE") ? "Piano aggiornato con le correzioni dei controllori 🔧" : "Piano pronto! Il grosso del lavoro lo fai una volta sola.",
        piano: {
          obiettivo: "Primi 100 € entro 30 giorni.",
          passi: [
            { titolo: "Preparazione", dettaglio: "Crea l'account e prepara il materiale.", chi: "tu", tempo_stimato: "2 h" },
            { titolo: "Pubblicazione", dettaglio: "Pubblica gli annunci con i testi che ti prepariamo.", chi: "team", tempo_stimato: "30 min" },
            { titolo: "Gestione", dettaglio: "Risposte automatiche ai messaggi frequenti.", chi: "automatico", tempo_stimato: "15 min/settimana" },
          ],
          strumenti: ["Canva", "Etsy", "Google Sheets"],
          costi: ["0,20 $ per annuncio", "nessun abbonamento"],
          ore_settimanali_tue: 1.5,
          primi_7_giorni: ["Giorno 1: apri l'account", "Giorno 2-3: prepara il materiale", "Giorno 4: pubblica"],
          kpi: ["visite agli annunci", "vendite al mese"],
          aspetti_legali_fiscali: "Sotto i 5.000 €/anno puoi valutare la prestazione occasionale; chiedi a un commercialista.",
        },
      };
    case "controllo":
      return {
        messaggio_chat: idAgente === "ctrl_tempo" ? "Attenzione: in un piano manca il tempo per l'assistenza clienti ⏱️" : "Ho riletto tutto, per me è a posto ✅",
        problemi: idAgente === "ctrl_tempo" && ids[0]
          ? [{ id_idea: ids[0], gravita: "media", problema: "Non è conteggiato il tempo per rispondere ai clienti.", soluzione: "Aggiungere 30 min/settimana e risposte predefinite." }]
          : [],
      };
    default:
      return {
        messaggio_chat: contenuto.includes("Il capo ha appena scritto")
          ? "Ricevuto capo! (modalità demo: imposta ANTHROPIC_API_KEY per risposte vere 😉)"
          : "Riepilogo: partono le idee approvate, ti servono circa 2-3 ore a settimana e meno di 20 €. Oggi: apri l'account sulla piattaforma indicata nel primo piano.",
      };
  }
}
