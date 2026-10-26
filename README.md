# Siti per attività senza sito web

Flusso in due fasi, eseguibile da Claude Code in questo repository.

| Fase | Skill | Agente | Output |
|---|---|---|---|
| 1. Trovare attività senza sito | `trova-attivita-senza-sito` | `lead-finder` | `leads/<zona>.json` |
| 2. Creare le bozze in serie | `crea-sito-attivita` | `site-builder` | `siti/<zona>/<slug>/index.html` |
| 3. Sito curato per un'attività | `sito-su-misura` | `web-designer` | stesso percorso, con marcatore `<!-- su-misura -->` (il generatore non lo sovrascrive) |

## Uso rapido
- In Claude Code: *"Usa l'agente lead-finder per trovare parrucchieri e sarti senza sito a Brescia"*, poi *"Usa site-builder sui lead di Brescia"*.
- A mano:
  ```bash
  # (facoltativo, richiede rete verso overpass-api.de)
  python3 .claude/skills/trova-attivita-senza-sito/scripts/osm_senza_sito.py "Brescia" --out leads/osm_brescia.json
  python3 .claude/skills/trova-attivita-senza-sito/scripts/verifica_sito.py leads/torino.json --scrivi   # controllo domini
  python3 .claude/skills/crea-sito-attivita/scripts/genera_sito.py leads/bergamo.json --out siti/bergamo
  ```
  Apri `siti/<zona>/index.html` nel browser.

## Stato attuale
`leads/bergamo.json`: 6 attività di Bergamo e provincia (3 barberie, 1 camiceria, 1 calzolaio, 1 negozio di calzature), con fonti e livello di verifica. Siti in `siti/bergamo/`.
`leads/torino.json`: 6 attività di Torino (1 barberia, 4 sartorie di riparazione, 1 calzolaio), ciascuna con il registro dei controlli in `verifiche` e un `livello_certezza`; 9 candidati scartati con il motivo. Siti in `siti/torino/`; `talluto-barberia` è il primo sito su misura.

## Importante
I siti sono **bozze di proposta**: hanno un banner "non ufficiale" e `noindex`. Prima di pubblicarli serve l'autorizzazione scritta del titolare: checklist e messaggio da inviare sono in [`docs/autorizzazione-titolare.md`](docs/autorizzazione-titolare.md).
