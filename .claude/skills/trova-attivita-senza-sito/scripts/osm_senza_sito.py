#!/usr/bin/env python3
"""Pre-selezione da OpenStreetMap: attività con nome ma senza sito web.

Uso:
    python3 osm_senza_sito.py "Bergamo" --categorie shop,craft,amenity --out leads/osm_bergamo.json

Richiede accesso di rete a overpass-api.de. I risultati vanno sempre verificati
con una ricerca per nome (vedi SKILL.md): OSM spesso non riporta il sito anche
quando esiste.
"""
import argparse
import datetime
import json
import re
import sys
import unicodedata
import urllib.parse
import urllib.request

OVERPASS = "https://overpass-api.de/api/interpreter"

# Valori amenity utili (le altre amenity sono per lo più servizi pubblici).
AMENITY_UTILI = "restaurant|cafe|bar|pub|fast_food|ice_cream|pharmacy|dentist|veterinary"

# Mappa tag OSM -> preset del generatore di siti.
SETTORI = {
    ("shop", "hairdresser"): "parrucchiere",
    ("shop", "barber"): "barbiere",
    ("shop", "tailor"): "sartoria",
    ("craft", "tailor"): "sartoria",
    ("shop", "shoe_repair"): "calzolaio",
    ("craft", "shoemaker"): "calzolaio",
    ("shop", "shoes"): "calzature",
    ("shop", "bakery"): "panificio",
    ("amenity", "restaurant"): "ristorante",
    ("amenity", "cafe"): "bar",
    ("amenity", "bar"): "bar",
}


def slugify(testo):
    testo = unicodedata.normalize("NFKD", testo).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", testo.lower()).strip("-")


def query(citta, categorie):
    filtri = []
    for cat in categorie:
        valore = f'~"^({AMENITY_UTILI})$"' if cat == "amenity" else ""
        for tipo in ("node", "way"):
            filtri.append(
                f'{tipo}["{cat}"{valore}]["name"][!"website"][!"contact:website"][!"brand"](area.a);'
            )
    return (
        f'[out:json][timeout:90];area["name"="{citta}"]["boundary"="administrative"]->.a;'
        f'({"".join(filtri)});out center tags;'
    )


def main():
    p = argparse.ArgumentParser()
    p.add_argument("citta")
    p.add_argument("--categorie", default="shop,craft,amenity")
    p.add_argument("--out", required=True)
    p.add_argument("--limite", type=int, default=200)
    a = p.parse_args()

    dati = urllib.parse.urlencode({"data": query(a.citta, a.categorie.split(","))}).encode()
    try:
        with urllib.request.urlopen(OVERPASS, dati, timeout=120) as r:
            elementi = json.load(r)["elements"]
    except Exception as e:  # rete bloccata, timeout, ecc.
        sys.exit(f"Overpass non raggiungibile ({e}). Usa WebSearch come da SKILL.md.")

    leads = []
    for el in elementi[: a.limite]:
        t = el.get("tags", {})
        settore = next(
            (v for (k, val), v in SETTORI.items() if t.get(k) == val), "generico"
        )
        via = " ".join(filter(None, [t.get("addr:street"), t.get("addr:housenumber")]))
        leads.append({
            "slug": slugify(t["name"]),
            "nome": t["name"],
            "settore": settore,
            "indirizzo": via or None,
            "cap": t.get("addr:postcode"),
            "citta": t.get("addr:city", a.citta),
            "provincia": None,
            "telefono": t.get("phone") or t.get("contact:phone"),
            "email": t.get("email") or t.get("contact:email"),
            "orari": t.get("opening_hours"),
            "descrizione": None,
            "servizi": [],
            "presenza_online": ["OpenStreetMap"],
            "stato_verifica": "da_verificare",
            "fonti": [f"https://www.openstreetmap.org/{el['type']}/{el['id']}"],
            "note": None,
        })

    with open(a.out, "w", encoding="utf-8") as f:
        json.dump({
            "zona": a.citta,
            "data_ricerca": datetime.date.today().isoformat(),
            "metodo": "OpenStreetMap Overpass: nome presente, nessun tag website",
            "leads": leads,
        }, f, ensure_ascii=False, indent=2)
    print(f"{len(leads)} candidati salvati in {a.out} (da verificare)")


if __name__ == "__main__":
    main()
