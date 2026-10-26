# Siti per attività senza sito web

Flusso in due fasi, eseguibile da Claude Code in questo repository.

| Fase | Skill | Agente | Output |
|---|---|---|---|
| 1. Trovare attività senza sito | `trova-attivita-senza-sito` | `lead-finder` | `leads/<zona>.json` |
| 2. Creare i siti | `crea-sito-attivita` | `site-builder` | `siti/<slug>/index.html` |

## Uso rapido
- In Claude Code: *"Usa l'agente lead-finder per trovare parrucchieri e sarti senza sito a Brescia"*, poi *"Usa site-builder sui lead di Brescia"*.
- A mano:
  ```bash
  # (facoltativo, richiede rete verso overpass-api.de)
  python3 .claude/skills/trova-attivita-senza-sito/scripts/osm_senza_sito.py "Brescia" --out leads/osm_brescia.json
  python3 .claude/skills/crea-sito-attivita/scripts/genera_sito.py leads/bergamo.json --out siti
  ```
  Apri `siti/index.html` nel browser.

## Stato attuale
`leads/bergamo.json`: 6 attività di Bergamo e provincia (3 barberie, 1 camiceria, 1 calzolaio, 1 negozio di calzature), con fonti e livello di verifica. I relativi siti sono in `siti/`.

## Importante
I siti sono **bozze di proposta**: hanno un banner "non ufficiale" e `noindex`. Prima di pubblicarli serve il consenso del titolare, la conferma dei dati (telefono, orari, servizi) e, dove possibile, foto e logo reali.
