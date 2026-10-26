import { test } from "node:test";
import assert from "node:assert/strict";

process.env.MODALITA_DEMO = "1";
const { eseguiSessione, rispondiAlCapo } = await import("../src/pipeline.js");

function chatFinta() {
  const sessione = { profilo: { ore: "3", budget: "100" }, idee: {}, messaggi: [] };
  return {
    sessione,
    invia: (da, testo, dettagli) => sessione.messaggi.push({ da, testo, dettagli }),
    sistema: (testo) => sessione.messaggi.push({ da: "sistema", testo }),
    scrive: () => {},
    salva: () => {},
  };
}

test("la pipeline completa passa da tutti i ruoli e produce piani per le idee GO", async () => {
  const chat = chatFinta();
  await eseguiSessione(chat);
  const { idee, messaggi } = chat.sessione;
  const autori = new Set(messaggi.map((m) => m.da));
  for (const id of ["ideatore_1", "ideatore_2", "analista_1", "analista_2", "revisore", "ceo", "ctrl_qualita", "ctrl_rischi", "ctrl_tempo"]) {
    assert.ok(autori.has(id), `manca ${id}`);
  }
  const go = Object.values(idee).filter((i) => i.stato === "go");
  assert.ok(go.length > 0 && go.length <= 3);
  for (const i of go) assert.ok(i.piano, `piano mancante per ${i.id}`);
  assert.ok(Object.values(idee).every((i) => i.stato !== "scartata_temp"));
  assert.equal(messaggi.at(-1).da, "ceo");
});

test("una @menzione fa rispondere l'agente giusto", async () => {
  const chat = chatFinta();
  await rispondiAlCapo(chat, "@Francesca serve la partita IVA?");
  assert.equal(chat.sessione.messaggi.at(-1).da, "ctrl_rischi");
});
