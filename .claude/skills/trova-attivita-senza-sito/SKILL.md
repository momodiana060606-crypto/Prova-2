---
name: trova-attivita-senza-sito
description: Trova attività locali (negozi, artigiani, barbieri, sartorie, ristoranti…) che NON hanno un sito web, verifica l'assenza del sito e salva i risultati come lead strutturati in leads/<zona>.json. Usala quando l'utente chiede di "cercare attività senza sito", "trovare clienti per siti web", "lead generation locale", "attività senza sito internet a <città>".
---

# Trova attività senza sito

Obiettivo: produrre una lista di lead **verificati** (attività reali, con indirizzo, che non hanno un sito proprio) in `leads/<zona>.json`, pronti per la skill `crea-sito-attivita`.

## Input
- **Zona**: città/quartiere/comune (default se non specificato: chiedi, oppure usa quella dell'ultimo file in `leads/`).
- **Settori** (opzionale): es. barbiere, parrucchiere, sartoria, calzolaio, panificio, ristorante, bar, idraulico, elettricista, negozio.
- **Quantità**: default 5–10 lead.

## Fonti (in ordine di preferenza)
1. **OpenStreetMap / Overpass** — se la rete lo consente, esegui
   `python3 .claude/skills/trova-attivita-senza-sito/scripts/osm_senza_sito.py "<città>" --categorie shop,craft,amenity --out leads/osm_<zona>.json`.
   Restituisce attività con nome ma senza tag `website`/`contact:website`. È solo una pre-selezione: OSM spesso non ha il tag anche se il sito esiste.
2. **WebSearch** su directory: Fresha, Treatwell, informazione-aziende.it, aziende.it, Virgilio, Tuttocittà, PagineGialle, visitbergamo/visit<città>. Query utili:
   - `<settore> <città> via indirizzo telefono`
   - `fresha <città> barbiere` / `treatwell <città> parrucchiere`
   - `"<settore>" <città> impresa individuale`
3. Attività piccole e individuali (imprese individuali, artigiani, botteghe) sono i candidati migliori; catene, franchising e aziende con >20 dipendenti hanno quasi sempre un sito → scartale.

## Verifica (obbligatoria per ogni candidato)
Una sola ricerca per nome NON basta: nei test su Torino due attività che sembravano senza sito
(Doctor Shoes, Il Mago delle Scarpe) avevano un dominio proprio, emerso solo con la query "sito web".
Esegui **tutti** questi controlli e registra ognuno in `verifiche`:

| # | Controllo | Query / azione | Esito che fa scartare |
|---|---|---|---|
| 1 | Nome + città | `<nome> <città>` | un dominio proprio tra i risultati |
| 2 | Nome + "sito web" | `<nome> <città> sito web www` | idem; anche schede directory con campo "sito" valorizzato |
| 3 | Telefono | `<nome> <città> <telefono>` (con e senza spazi) | il numero compare su un dominio proprio |
| 4 | Social e mini-siti | `<nome> instagram facebook` | link a un sito nella bio; pagine eatbu/wix/jimdo/sites.google = **ha già un sito** |
| 5 | Domini (se la rete lo consente) | `python3 .claude/skills/trova-attivita-senza-sito/scripts/verifica_sito.py leads/<zona>.json --scrivi` | dominio che risolve con titolo pari al nome |

Regole:
- Scarta anche le attività con dati contraddittori (stesso indirizzo assegnato a un'altra ditta, più sedi incompatibili) o che non trovi da nessuna parte oltre a una directory generica.
- Una pagina Facebook, Instagram, Tumblr o una scheda di prenotazione (Fresha, Treatwell) **non** conta come sito: tieni il lead e annota la presenza in `presenza_online`.
- Annota sempre le fonti in `fonti` e i dati discordanti in `note`.

Imposta `stato_verifica`:
- `"nessun_sito_trovato"` — controlli 1–4 (e 5 se possibile) fatti, nessun dominio proprio.
- `"dubbio"` — indizi contrastanti; da verificare a mano su Google Maps o telefonando.
- Aggiungi `livello_certezza`: `"alta"` (≥2 fonti concordi, tutti i controlli negativi), `"media"` (una sola fonte o un indizio non chiarito), `"bassa"`.

**Certezza assoluta non esiste** dalla sola ricerca web: la conferma definitiva è la telefonata al titolare ("avete un sito internet?"), da fare prima di presentare la proposta. Il controllo 5 copre i domini con nomi prevedibili, non quelli con nomi di fantasia.

Non inventare mai dati: telefono, orari, recensioni vanno inseriti solo se trovati in una fonte. Campi sconosciuti → `null`.

## Formato di output (`leads/<zona>.json`)
```json
{
  "zona": "Bergamo",
  "data_ricerca": "YYYY-MM-DD",
  "metodo": "breve descrizione",
  "leads": [
    {
      "slug": "caruso-barbershop-bg",
      "nome": "Caruso Barbershop BG",
      "settore": "barbiere",
      "indirizzo": "Via Borgo Santa Caterina 61a",
      "cap": "24124",
      "citta": "Bergamo",
      "provincia": "BG",
      "telefono": "+39 035 016 0947",
      "email": null,
      "orari": null,
      "descrizione": "Fatti verificati, 1-2 frasi.",
      "servizi": ["solo se trovati nelle fonti, altrimenti lista vuota"],
      "presenza_online": ["Fresha"],
      "stato_verifica": "nessun_sito_trovato",
      "livello_certezza": "alta",
      "verifiche": ["1 nome+città: solo Fresha", "2 sito web: nessun dominio", "3 telefono: solo Fresha", "4 social: nessuno", "5 domini: non eseguito (rete)"],
      "fonti": ["https://..."],
      "note": "eventuali dubbi"
    }
  ]
}
```
`settore` deve essere uno dei preset del generatore: `barbiere`, `parrucchiere`, `sartoria`, `calzolaio`, `calzature`, `panificio`, `ristorante`, `bar`, `artigiano`, `negozio` (altrimenti `generico`).

## Al termine
- Valida il file: `python3 -m json.tool leads/<zona>.json > /dev/null`.
- Riassumi all'utente: quanti candidati esaminati, quanti tenuti, quanti scartati e perché.
- Proponi di passare alla skill `crea-sito-attivita` (o all'agente `site-builder`).
