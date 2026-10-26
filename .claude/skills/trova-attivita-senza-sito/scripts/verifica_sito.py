#!/usr/bin/env python3
"""Controllo tecnico dei domini per i lead: prova i domini più probabili.

Uso:
    python3 verifica_sito.py leads/torino.json            # stampa il report
    python3 verifica_sito.py leads/torino.json --scrivi   # salva l'esito in ogni lead (campo verifica_domini)

Per ogni lead genera i domini plausibili (nome, nome+città, senza parole generiche,
su .it/.com/.net/.eu), poi per ognuno:
  1. risoluzione DNS (il dominio esiste?)
  2. richiesta HTTPS/HTTP (risponde un sito? titolo della pagina)
  3. registro .it via RDAP (registrato anche se senza sito?)
Un dominio che risolve e mostra una pagina con il nome dell'attività = sito trovato.
Serve accesso di rete libero: in ambienti con rete limitata lo script lo segnala ed esce.
Non sostituisce le ricerche per nome/telefono descritte in SKILL.md: le completa.
"""
import argparse
import json
import re
import socket
import sys
import unicodedata
import urllib.request

ESTENSIONI = ("it", "com", "net", "eu")
GENERICHE = {"di", "il", "la", "lo", "le", "i", "e", "del", "della", "snc", "sas", "srl", "s", "r", "l"}


def pulisci(testo):
    testo = unicodedata.normalize("NFKD", testo).encode("ascii", "ignore").decode().lower()
    return [p for p in re.split(r"[^a-z0-9]+", testo) if p]


def domini_candidati(lead):
    parole = pulisci(lead["nome"])
    utili = [p for p in parole if p not in GENERICHE]
    citta = "".join(pulisci(lead.get("citta") or ""))
    basi = {"".join(parole), "".join(utili), "-".join(utili)}
    if citta:
        basi |= {"".join(utili) + citta, "-".join(utili + [citta])}
    return sorted(f"{b}.{est}" for b in basi if len(b) > 3 for est in ESTENSIONI)


def risolve(dominio):
    try:
        socket.getaddrinfo(dominio, 443)
        return True
    except socket.gaierror:
        return False


def titolo_pagina(dominio):
    for schema in ("https", "http"):
        try:
            req = urllib.request.Request(f"{schema}://{dominio}", headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as r:
                testo = r.read(200_000).decode("utf-8", "ignore")
            m = re.search(r"<title[^>]*>(.*?)</title>", testo, re.I | re.S)
            return (m.group(1).strip() if m else "(senza titolo)")[:120]
        except Exception:
            continue
    return None


def registrato_it(dominio):
    if not dominio.endswith(".it"):
        return None
    try:
        with urllib.request.urlopen(f"https://rdap.nic.it/domain/{dominio}", timeout=10) as r:
            return r.status == 200
    except urllib.error.HTTPError as e:
        return False if e.code == 404 else None
    except Exception:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("leads")
    ap.add_argument("--scrivi", action="store_true")
    a = ap.parse_args()

    if not risolve("example.com"):
        sys.exit("DNS non disponibile in questo ambiente: esegui lo script dal tuo computer "
                 "o abilita l'accesso di rete, poi rilancialo.")

    with open(a.leads, encoding="utf-8") as f:
        dati = json.load(f)

    for lead in dati["leads"]:
        trovati = []
        for d in domini_candidati(lead):
            esiste = risolve(d)
            reg = registrato_it(d)
            if esiste or reg:
                trovati.append({"dominio": d, "dns": esiste, "registrato_it": reg,
                                "titolo": titolo_pagina(d) if esiste else None})
        print(f"\n{lead['nome']}: {len(trovati)} domini esistenti")
        for t in trovati:
            print(f"  {t['dominio']:40} dns={t['dns']} reg.it={t['registrato_it']} titolo={t['titolo']!r}")
        if a.scrivi:
            lead["verifica_domini"] = trovati

    if a.scrivi:
        with open(a.leads, "w", encoding="utf-8") as f:
            json.dump(dati, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"\nRisultati salvati in {a.leads}. Controlla a mano i domini con un titolo "
              "che somiglia al nome dell'attività: se è il suo sito, il lead va scartato.")


if __name__ == "__main__":
    main()
