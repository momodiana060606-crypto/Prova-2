---
name: crea-sito-attivita
description: Crea un sito vetrina (one-page HTML statico, responsive, con SEO locale e schema.org) per attività locali senza sito, partendo dai lead in leads/<zona>.json. Usala quando l'utente chiede di "creare i siti", "fare il sito per <attività>", "generare siti demo/proposta per i lead".
---

# Crea sito per un'attività

Input: un file `leads/<zona>.json` prodotto dalla skill `trova-attivita-senza-sito` (stesso schema) e, opzionalmente, lo `slug` di un singolo lead.

## Passi
1. **Controlla i lead**: apri il JSON; salta i lead con `stato_verifica: "scartato"`. Se un lead è `"dubbio"`, generalo ma segnalalo all'utente.
2. **Genera i siti** con lo script (nessuna dipendenza):
   ```bash
   python3 .claude/skills/crea-sito-attivita/scripts/genera_sito.py leads/<zona>.json --out siti/<zona>
   # solo uno:  ... --slug <slug>
   ```
   Output: `siti/<zona>/<slug>/index.html` per ogni lead + `siti/<zona>/index.html` con l'elenco.
3. **Personalizza** (facoltativo, se hai più informazioni): modifica direttamente `siti/<zona>/<slug>/index.html` oppure aggiungi `descrizione`, `servizi`, `orari` nel JSON e rigenera. Preferisci il JSON: resta la fonte dei dati.
4. **Verifica visiva**: fai uno screenshot desktop (1280px) e mobile (390px) con Playwright, controlla che non ci sia scroll orizzontale e che testo/pulsanti siano leggibili:
   ```bash
   node -e "const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();for(const [w,n] of [[1280,'desk'],[390,'mob']]){const p=await b.newPage({viewport:{width:w,height:900}});await p.goto('file://'+process.cwd()+'/siti/<zona>/<slug>/index.html');await p.screenshot({path:'<scratchpad>/<slug>-'+n+'.png',fullPage:true});}await b.close();})()"
   ```

## Struttura del sito generato
Banner "bozza dimostrativa" · header con navigazione · hero con nome, settore, pulsanti **Chiama** e **Come arrivare** · Chi siamo · Servizi · Contatti (indirizzo, telefono, orari, mappa Google incorporata) · footer. Include meta description, `noindex` e JSON-LD `LocalBusiness` (sottotipo per settore).

Preset di settore disponibili (palette, testi, servizi tipici): `barbiere`, `parrucchiere`, `sartoria`, `calzolaio`, `calzature`, `panificio`, `ristorante`, `bar`, `artigiano`, `negozio`, `generico`. Per aggiungerne uno, estendi `PRESET` in `scripts/genera_sito.py`.

## Regole
- **Mai inventare fatti** (telefono, orari, prezzi, recensioni, anni di attività). Se mancano, il template mostra un testo neutro ("Su richiesta").
- I servizi di settore generici sono marcati come "indicativi, da confermare".
- I siti sono **proposte**: restano con il banner "bozza non ufficiale" e `noindex` finché il titolare non li approva. Non pubblicarli online a nome dell'attività senza il suo consenso; per mostrarli al titolare usa i file locali o un link privato.
- Dopo l'approvazione: rimuovi il banner e il `noindex`, aggiungi logo/foto forniti dal titolare, poi pubblica (es. GitHub Pages, Netlify) sul dominio scelto dal titolare.
