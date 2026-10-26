# Autorizzazione del titolare

Un sito con il nome, il telefono e i link di un'attività funziona come il suo sito ufficiale. Si pubblica solo dopo che il titolare l'ha chiesto e approvato per iscritto. Prima di quel momento il sito resta una bozza, con banner "non ufficiale" e `noindex`.

## Checklist per ogni attività

Copia questa lista nelle `note` del lead, oppure tienila a parte, e spunta le voci man mano.

- [ ] **Chi autorizza**: titolare o legale rappresentante (nome e cognome), non un dipendente.
- [ ] **Cosa autorizza**: realizzazione e pubblicazione del sito, uso di nome, logo, foto e contatti.
- [ ] **Bozza approvata**: il titolare ha visto la bozza e conferma indirizzo, telefono, servizi, orari ed eventuali prezzi.
- [ ] **Dominio scelto** (es. `nomeattivita.it`) e **intestato al titolare**, non a chi fa il sito.
- [ ] **Partita IVA** dell'attività, da mostrare sul sito (obbligatoria per le imprese, di solito nel footer).
- [ ] **Privacy e cookie**: informativa privacy; se resta la mappa Google incorporata, anche il banner di consenso dei cookie. In alternativa si toglie la mappa e si lascia solo il pulsante "Indicazioni stradali". Per casi particolari serve un consulente.
- [ ] **Forma scritta e data**: email o messaggio WhatsApp conservato. Se il lavoro è a pagamento, anche un preventivo accettato.
- [ ] **Materiali** (facoltativi ma consigliati): foto del locale e dei lavori, logo, profili social da collegare.

## Messaggio da far inviare al titolare

> Io, [nome e cognome], titolare di [nome attività] (P.IVA [numero]), autorizzo [nome di chi realizza il sito] a realizzare e pubblicare il sito della mia attività sul dominio [dominio], usando nome, logo, foto e contatti dell'attività. Ho visto la bozza e confermo che i dati sono corretti.
>
> [luogo], [data]

## Dopo l'autorizzazione

1. Nel file `leads/<zona>.json` imposta `"autorizzazione": {"data": "AAAA-MM-GG", "da": "nome cognome", "mezzo": "email|whatsapp|firma", "dominio": "..."}`.
2. Inserisci nel sito i dati confermati e la P.IVA nel footer, e aggiungi la pagina o il link dell'informativa privacy.
3. Togli il banner "bozza" e il `<meta name="robots" content="noindex">`.
4. Pubblica il sito sul dominio del titolare.
