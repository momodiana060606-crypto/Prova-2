#!/usr/bin/env python3
"""Genera un sito vetrina (one-page, HTML statico) per ogni lead di un file leads/*.json.

Uso:
    python3 genera_sito.py leads/bergamo.json --out siti          # tutti i lead
    python3 genera_sito.py leads/bergamo.json --out siti --slug caruso-barbershop-bg

Per ogni lead crea <out>/<slug>/index.html e aggiorna <out>/index.html (elenco).
Nessuna dipendenza esterna. I contenuti di settore (servizi, testi) sono
indicativi e vanno confermati con il titolare prima della pubblicazione.
"""
import argparse
import html
import json
import os
import urllib.parse

# Preset per settore: palette, testi e servizi tipici.
PRESET = {
    "barbiere": {
        "colori": ("#1c1c1c", "#b8862b", "#f6f1e9"),
        "tipo_schema": "HairSalon",
        "tagline": "Taglio, barba e rasatura tradizionale",
        "intro": "Una barberia di quartiere dove il taglio è un rito: cura del dettaglio, prodotti di qualità e il tempo giusto per ogni cliente.",
        "servizi": ["Taglio uomo", "Regolazione barba", "Rasatura tradizionale con panno caldo", "Taglio bambino", "Trattamenti viso e barba"],
    },
    "parrucchiere": {
        "colori": ("#2b2129", "#c27c8e", "#faf5f6"),
        "tipo_schema": "HairSalon",
        "tagline": "Taglio, colore e piega su misura",
        "intro": "Un salone accogliente dove ogni trattamento parte dall'ascolto: consulenza, tecnica e prodotti professionali.",
        "servizi": ["Taglio donna e uomo", "Colore e riflessi", "Piega", "Trattamenti ristrutturanti", "Acconciature per cerimonie"],
    },
    "sartoria": {
        "colori": ("#1f2a44", "#9c7a3c", "#f7f4ee"),
        "tipo_schema": "ClothingStore",
        "tagline": "Capi su misura e lavorazione artigianale",
        "intro": "Tessuti scelti, misure prese a mano e cuciture curate: capi che vestono bene perché sono fatti per chi li indossa.",
        "servizi": ["Capi su misura", "Scelta dei tessuti", "Modifiche e riparazioni", "Personalizzazioni e iniziali ricamate"],
    },
    "calzolaio": {
        "colori": ("#3a2618", "#c0703a", "#f8f2ea"),
        "tipo_schema": "ShoeStore",
        "tagline": "Riparazione di scarpe e pelletteria",
        "intro": "Risuolature, tacchi, cuciture e cura della pelle: diamo una seconda vita alle scarpe e agli accessori a cui tieni.",
        "servizi": ["Risuolatura", "Sostituzione tacchi", "Riparazione borse e cinture", "Cuciture e incollaggi", "Duplicazione chiavi", "Pulizia e lucidatura"],
    },
    "calzature": {
        "colori": ("#2c2420", "#a35d3d", "#f9f5f1"),
        "tipo_schema": "ShoeStore",
        "tagline": "Calzature e pelletteria",
        "intro": "Una selezione di calzature e accessori in pelle, con il consiglio di chi conosce il mestiere.",
        "servizi": ["Calzature uomo e donna", "Pelletteria e accessori", "Consulenza sulla calzata", "Prodotti per la cura della pelle"],
    },
    "panificio": {
        "colori": ("#3b2a1a", "#d9a441", "#fbf6ec"),
        "tipo_schema": "Bakery",
        "tagline": "Pane fresco e prodotti da forno ogni giorno",
        "intro": "Impasti a lunga lievitazione, forno acceso dall'alba e la ricetta di sempre.",
        "servizi": ["Pane fresco", "Focacce e pizze", "Dolci e biscotti", "Ordini per eventi"],
    },
    "ristorante": {
        "colori": ("#2a1f1a", "#b5452c", "#fbf7f2"),
        "tipo_schema": "Restaurant",
        "tagline": "Cucina del territorio",
        "intro": "Piatti della tradizione preparati con ingredienti di stagione.",
        "servizi": ["Pranzo", "Cena", "Asporto", "Eventi privati"],
    },
    "bar": {
        "colori": ("#1e2a2a", "#c8913a", "#f6f4ef"),
        "tipo_schema": "CafeOrCoffeeShop",
        "tagline": "Caffè, colazioni e aperitivi",
        "intro": "Il punto di ritrovo del quartiere, dalla colazione all'aperitivo.",
        "servizi": ["Colazioni", "Caffetteria", "Pranzi veloci", "Aperitivi"],
    },
    "artigiano": {
        "colori": ("#23303a", "#d07a2d", "#f5f5f2"),
        "tipo_schema": "HomeAndConstructionBusiness",
        "tagline": "Lavori artigianali e interventi a domicilio",
        "intro": "Esperienza, puntualità e preventivi chiari.",
        "servizi": ["Sopralluoghi", "Preventivi gratuiti", "Interventi a domicilio", "Manutenzione"],
    },
    "negozio": {
        "colori": ("#222831", "#3f8f7f", "#f6f7f5"),
        "tipo_schema": "Store",
        "tagline": "Il negozio di fiducia del quartiere",
        "intro": "Prodotti selezionati e un servizio attento a ogni cliente.",
        "servizi": ["Vendita al dettaglio", "Consulenza", "Ordini su richiesta"],
    },
    "generico": {
        "colori": ("#1f2933", "#3e7cb1", "#f5f7fa"),
        "tipo_schema": "LocalBusiness",
        "tagline": "Attività locale",
        "intro": "Qualità e cortesia, da sempre al servizio del territorio.",
        "servizi": ["Servizi su richiesta"],
    },
}

PAGINA = """<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{nome} · {citta}</title>
<meta name="description" content="{meta_desc}">
<meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<script type="application/ld+json">{json_ld}</script>
<style>
:root {{ --scuro: {c1}; --accento: {c2}; --chiaro: {c3}; --testo: #1d1d1f; --muted: #5f6368; }}
* {{ box-sizing: border-box; }}
html {{ scroll-behavior: smooth; }}
body {{ margin: 0; font-family: Inter, system-ui, sans-serif; color: var(--testo); background: var(--chiaro); line-height: 1.6; }}
a {{ color: inherit; }}
.demo {{ background: #fff3cd; color: #664d03; font-size: .85rem; text-align: center; padding: .5rem 1rem; }}
header {{ position: sticky; top: 0; z-index: 10; background: var(--scuro); color: #fff; }}
.wrap {{ max-width: 1080px; margin: 0 auto; padding: 0 16px; }}
nav {{ display: flex; align-items: center; justify-content: space-between; gap: 1rem; min-height: 64px; }}
.logo {{ font-family: Fraunces, Georgia, serif; font-size: 1.25rem; text-decoration: none; }}
nav ul {{ display: flex; gap: 1.25rem; list-style: none; margin: 0; padding: 0; font-size: .95rem; }}
nav ul a {{ text-decoration: none; opacity: .85; }}
nav ul a:hover {{ opacity: 1; color: var(--accento); }}
.hero {{ background: linear-gradient(160deg, var(--scuro) 0%, color-mix(in srgb, var(--scuro) 75%, var(--accento)) 100%); color: #fff; padding: 96px 0 88px; }}
.eyebrow {{ color: var(--accento); text-transform: uppercase; letter-spacing: .14em; font-size: .8rem; font-weight: 600; margin: 0 0 .75rem; }}
h1, h2 {{ font-family: Fraunces, Georgia, serif; line-height: 1.15; margin: 0 0 1rem; }}
h1 {{ font-size: clamp(2.2rem, 6vw, 3.8rem); }}
h2 {{ font-size: clamp(1.6rem, 4vw, 2.3rem); color: var(--scuro); }}
.hero p.lead {{ font-size: 1.15rem; max-width: 40ch; opacity: .9; margin: 0 0 2rem; }}
.cta {{ display: flex; flex-wrap: wrap; gap: .75rem; }}
.btn {{ display: inline-block; padding: .85rem 1.4rem; border-radius: 999px; font-weight: 600; text-decoration: none; border: 2px solid var(--accento); }}
.btn.pieno {{ background: var(--accento); color: #fff; }}
.btn.vuoto {{ color: #fff; }}
section {{ padding: 80px 0; }}
.alt {{ background: #fff; }}
.griglia {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-top: 2rem; }}
.card {{ background: var(--chiaro); border-radius: 14px; padding: 1.4rem; border-top: 4px solid var(--accento); font-weight: 500; }}
.alt .card {{ background: var(--chiaro); }}
.nota {{ color: var(--muted); font-size: .85rem; margin-top: 1rem; }}
.contatti {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; align-items: start; }}
.contatti dl {{ margin: 0; }}
.contatti dt {{ font-weight: 600; color: var(--scuro); margin-top: 1rem; }}
.contatti dd {{ margin: .2rem 0 0; }}
.mappa {{ width: 100%; aspect-ratio: 4 / 3; border: 0; border-radius: 14px; background: #ddd; }}
footer {{ background: var(--scuro); color: #ffffffb3; font-size: .85rem; padding: 2rem 0; }}
@media (max-width: 640px) {{ nav ul {{ display: none; }} .hero {{ padding: 64px 0; }} section {{ padding: 56px 0; }} }}
</style>
</head>
<body>
<div class="demo">Bozza dimostrativa non ufficiale, preparata come proposta per {nome}. I contenuti sono da confermare con il titolare.</div>
<header><div class="wrap"><nav>
  <a class="logo" href="#">{nome}</a>
  <ul><li><a href="#chi-siamo">Chi siamo</a></li><li><a href="#servizi">Servizi</a></li><li><a href="#contatti">Contatti</a></li></ul>
</nav></div></header>

<section class="hero"><div class="wrap">
  <p class="eyebrow">{eyebrow}</p>
  <h1>{nome}</h1>
  <p class="lead">{tagline}</p>
  <div class="cta">{cta_tel}<a class="btn vuoto" href="{maps_link}" target="_blank" rel="noopener">Come arrivare</a></div>
</div></section>

<section id="chi-siamo"><div class="wrap">
  <h2>Chi siamo</h2>
  <p>{descrizione}</p>
  <p>{intro}</p>
</div></section>

<section id="servizi" class="alt"><div class="wrap">
  <h2>Servizi</h2>
  <div class="griglia">{servizi}</div>
  {nota_servizi}
</div></section>

<section id="contatti"><div class="wrap contatti">
  <div>
    <h2>Contatti</h2>
    <dl>
      <dt>Indirizzo</dt><dd>{indirizzo_completo}</dd>
      {blocco_tel}{blocco_email}
      <dt>Orari</dt><dd>{orari}</dd>
    </dl>
  </div>
  <iframe class="mappa" title="Mappa" loading="lazy" src="{maps_embed}"></iframe>
</div></section>

<footer><div class="wrap">© {nome} · {indirizzo_completo}</div></footer>
</body>
</html>
"""


def e(testo):
    return html.escape(str(testo), quote=True)


def genera(lead, out):
    p = PRESET.get(lead.get("settore"), PRESET["generico"])
    nome, citta = lead["nome"], lead.get("citta") or ""
    parti = [lead.get("indirizzo"), " ".join(filter(None, [lead.get("cap"), citta])),
             f"({lead['provincia']})" if lead.get("provincia") else None]
    indirizzo = ", ".join(filter(None, parti[:2])) + (f" {parti[2]}" if parti[2] else "")
    q = urllib.parse.quote(f"{nome}, {indirizzo}")
    tel = lead.get("telefono")
    tel_href = "tel:" + "".join(c for c in tel if c.isdigit() or c == "+") if tel else ""
    servizi = lead.get("servizi") or p["servizi"]

    json_ld = {
        "@context": "https://schema.org", "@type": p["tipo_schema"], "name": nome,
        "address": {"@type": "PostalAddress", "streetAddress": lead.get("indirizzo"),
                    "postalCode": lead.get("cap"), "addressLocality": citta,
                    "addressRegion": lead.get("provincia"), "addressCountry": "IT"},
    }
    if tel:
        json_ld["telephone"] = tel

    pagina = PAGINA.format(
        nome=e(nome), citta=e(citta),
        meta_desc=e(f"{nome}: {p['tagline'].lower()} a {citta}. {indirizzo}."),
        json_ld=json.dumps(json_ld, ensure_ascii=False).replace("</", "<\\/"),
        c1=p["colori"][0], c2=p["colori"][1], c3=p["colori"][2],
        eyebrow=e(f"{lead.get('settore', '').capitalize()} · {citta}"),
        tagline=e(p["tagline"]),
        cta_tel=f'<a class="btn pieno" href="{tel_href}">Chiama {e(tel)}</a>' if tel else "",
        maps_link=f"https://www.google.com/maps/search/?api=1&query={q}",
        maps_embed=f"https://www.google.com/maps?q={q}&output=embed",
        descrizione=e(lead.get("descrizione") or f"{nome} si trova in {indirizzo}."),
        intro=e(p["intro"]),
        servizi="".join(f'<div class="card">{e(s)}</div>' for s in servizi),
        nota_servizi="" if lead.get("servizi") else
            '<p class="nota">Elenco indicativo dei servizi tipici del settore, da confermare con il titolare.</p>',
        indirizzo_completo=e(indirizzo),
        blocco_tel=f'<dt>Telefono</dt><dd><a href="{tel_href}">{e(tel)}</a></dd>' if tel else "",
        blocco_email=(f'<dt>Email</dt><dd><a href="mailto:{e(lead["email"])}">{e(lead["email"])}</a></dd>'
                      if lead.get("email") else ""),
        orari=e(lead.get("orari") or "Su richiesta: contattaci per informazioni."),
    )
    cartella = os.path.join(out, lead["slug"])
    os.makedirs(cartella, exist_ok=True)
    with open(os.path.join(cartella, "index.html"), "w", encoding="utf-8") as f:
        f.write(pagina)
    return cartella


def indice(leads, zona, out):
    righe = "".join(
        f'<li><a href="{e(l["slug"])}/index.html">{e(l["nome"])}</a>'
        f' <span>· {e(l.get("settore", ""))} · {e(l.get("indirizzo") or "")}</span></li>'
        for l in leads)
    with open(os.path.join(out, "index.html"), "w", encoding="utf-8") as f:
        f.write(f"""<!doctype html><html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Siti proposta · {e(zona)}</title>
<style>body{{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 16px;line-height:1.7;background:#fafafa;color:#1d1d1f}}span{{color:#666;font-size:.9em}}</style>
</head><body><h1>Siti proposta · {e(zona)}</h1><p>Bozze per attività senza sito web. Da validare con i titolari prima di pubblicarle.</p><ul>{righe}</ul></body></html>""")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("leads")
    ap.add_argument("--out", default="siti")
    ap.add_argument("--slug", help="genera solo questo lead")
    a = ap.parse_args()
    with open(a.leads, encoding="utf-8") as f:
        dati = json.load(f)
    leads = [l for l in dati["leads"] if l.get("stato_verifica") != "scartato"]
    for l in leads:
        if not a.slug or l["slug"] == a.slug:
            print("creato", genera(l, a.out))
    indice(leads, dati.get("zona", ""), a.out)


if __name__ == "__main__":
    main()
