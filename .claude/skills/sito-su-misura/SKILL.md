---
name: sito-su-misura
description: Progetta e scrive a mano un sito vetrina curato (design, testi, SEO locale) per UNA attività scelta tra i lead in leads/<zona>.json, partendo dalla bozza del generatore. Usala quando l'utente chiede "fai il sito per <attività>", "sito definitivo/curato/su misura", "prendi un'attività e fai il sito".
---

# Sito su misura per un'attività

La skill `crea-sito-attivita` produce bozze in serie da un template. Questa skill serve per il passo successivo: **un sito unico, pensato per quell'attività**, da mostrare al titolare come proposta concreta.

## 1. Scegli e studia il lead
- Preferisci lead con `livello_certezza: "alta"` e con più dati verificati (telefono, servizi, orari, link di prenotazione).
- Rileggi `fonti` e `verifiche`. Puoi usare **solo** fatti presenti lì.

## 2. Brief (scrivilo prima del codice, 5 righe)
Chi è il cliente tipo · tono di voce · concetto visivo (palette di 4-5 colori, 2 font Google) · azione principale (chiamare, prenotare, passare in negozio) · cosa rende unica l'attività secondo le fonti (quartiere, specialità, storia).

## 3. Struttura consigliata
Banner bozza → header con logo testuale e pulsante principale → hero con titolo forte e 2 pulsanti → servizi (con breve descrizione) → "come funziona" / perché sceglierci (solo affermazioni generiche e vere per il settore) → galleria con **spazi per le foto** del titolare → dove siamo (indirizzo, mappa, orari) → contatti → footer. Su mobile: barra fissa in basso con "Chiama".

## 4. Regole sui testi
- **Vietato inventare**: prezzi, recensioni, anni di attività, premi, nomi di persone, orari, numeri WhatsApp, superlativi ("i migliori di Torino").
- **Permesso**: descrivere in modo generico cosa comprende un servizio del settore (es. "rasatura con panno caldo: panno caldo, schiuma, rasoio e lozione finale").
- Dati mancanti → invito all'azione ("Chiama per gli orari"), mai un valore inventato.
- Italiano naturale, frasi brevi, seconda persona ("prenota", "passa a trovarci").

## 5. Regole tecniche
- Un solo file `siti/<zona>/<slug>/index.html`, CSS inline, nessun JavaScript esterno; icone e illustrazioni in SVG inline (niente immagini prese dal web).
- Font solo da Google Fonts, con fallback di sistema.
- Responsive a 390, 768 e 1280px senza scroll orizzontale; contrasto AA; `:focus-visible`; `prefers-reduced-motion`.
- SEO: `<title>`, meta description, Open Graph, JSON-LD con il sottotipo schema.org corretto, `sameAs` con i profili verificati. Lascia `noindex` finché il titolare non approva.
- Metti `<!-- su-misura -->` dopo `<!doctype html>`: il generatore `genera_sito.py` non sovrascrive i file con questo marcatore (salvo `--forza`).

## 6. Controllo finale
- Screenshot a pagina intera a 1280 e a 390px con Playwright (vedi `crea-sito-attivita`), controlla tu stesso le immagini.
- Verifica che ogni `tel:` e link esterno corrisponda ai dati del lead.
- Rileggi ogni frase cercando affermazioni non supportate dalle fonti.
- **Fermati e chiedi all'utente di controllare** prima di fare altri siti o di pubblicare.
