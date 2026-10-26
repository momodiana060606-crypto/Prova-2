# 💸 Agenzia Idee

Una chat di gruppo **in stile WhatsApp** in cui un team di 12 agenti AI (Claude) inventa, controlla e
trasforma in piani concreti delle idee per guadagnare qualcosa **senza che tu debba dedicarci molto tempo**.

Tu sei "il capo": compili un breve profilo (ore a settimana, budget, cosa sai fare, cosa possiedi) e guardi
il team discutere nella chat. Puoi anche scrivere nel gruppo e chiedere qualcosa a un agente con `@Nome`.

## Il team

| Ruolo | Chi | Cosa fa |
|---|---|---|
| 2 ideatori | 💡 Luca (digitale) · 🌱 Sofia (alternative) | Propongono 3 idee a testa |
| 2 analisti | 📊 Marco (mercato) · 🔍 Giulia (fattibilità) | Controllano a fondo ogni idea e scartano *momentaneamente* quelle che non reggono |
| 1 revisore | ♻️ Paolo | Riguarda le idee scartate: le ripesca (con una correzione) o le scarta *definitivamente* |
| 1 CEO | 👑 Elena | Decide GO / NO GO (max 3 idee) e assegna ogni idea allo specialista giusto |
| 3 specialisti | 🎨 Chiara (contenuti & digitale) · 🛒 Davide (vendite & e-commerce) · 🤖 Andrea (automazione & tech) | Scrivono il piano operativo: passi, strumenti, costi, primi 7 giorni, KPI |
| 3 controllori | 🧐 Roberto (qualità) · ⚖️ Francesca (legale, fiscale & rischi) · ⏱️ Matteo (tempo & budget) | Cercano dimenticanze e problemi; se ne trovano, lo specialista corregge il piano |

## Come funziona una sessione

```
Ideatori ──► Analisti ──► idee approvate da entrambi ───────────────┐
                 └──► idee scartate ──► Revisore ──► ripescate ─────┤
                                              └──► scartate per sempre
                                                                    ▼
                                         CEO (GO / NO GO + assegnazione)
                                                                    ▼
                                          Specialisti (piani operativi)
                                                                    ▼
                                    Controllori ──► correzioni dei piani
                                                                    ▼
                                            Riepilogo finale della CEO
```

Un'idea passa l'analisi solo se **entrambi** gli analisti la approvano; altrimenti va al revisore.
Ogni messaggio in chat ha un pulsante **"Mostra dettagli"** con i dati completi (idee, voti, piani…).
Le chat vengono salvate nella cartella `data/` e restano disponibili dopo un riavvio.

## Avvio

Serve [Node.js](https://nodejs.org) 20 o superiore e una chiave API di Anthropic
(la crei su <https://console.anthropic.com>).

```bash
npm install
export ANTHROPIC_API_KEY="la-tua-chiave"
npm start
```

Poi apri <http://localhost:3000> e premi **＋** per avviare una sessione.

Per provare l'interfaccia **senza chiave** (risposte simulate, nessun costo): `npm run demo`.

### Impostazioni opzionali

| Variabile | Predefinito | Note |
|---|---|---|
| `MODELLO` | `claude-opus-5-5` | Il modello usato da tutti gli agenti |
| `EFFORT` | `medium` | `low` costa meno, `high` ragiona di più |
| `PORT` | `3000` | Porta del server |
| `CARTELLA_DATI` | `./data` | Dove vengono salvate le chat |

**Costi:** una sessione completa fa circa 15–20 chiamate al modello. Con le impostazioni predefinite costa
indicativamente 1–2 € (dipende da quanto scrivono gli agenti); con `EFFORT=low` meno. Se un modello rifiuta una richiesta, è attivo
il fallback automatico lato server (`fallbacks: "default"`).

## Avvertenze

Gli agenti danno idee e piani, **non consulenza fiscale o legale**: prima di incassare, soprattutto in modo
continuativo, senti un commercialista. Le stime di guadagno sono indicative.

## Struttura

```
src/agents.js    profili, prompt e formato delle risposte di ogni agente
src/pipeline.js  il flusso di lavoro del team e le risposte ai tuoi messaggi
src/llm.js       chiamate a Claude (output JSON strutturato)
src/demo.js      risposte simulate per la modalità demo
src/server.js    server web + aggiornamenti in tempo reale (SSE) + salvataggio
public/          interfaccia stile WhatsApp
test/            test della pipeline (npm test)
```
