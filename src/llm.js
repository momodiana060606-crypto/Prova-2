import Anthropic from "@anthropic-ai/sdk";
import { AGENTI_PER_ID, SCHEMI } from "./agents.js";
import { rispostaDemo } from "./demo.js";

const MODELLO = process.env.MODELLO || "claude-opus-5-5";
const EFFORT = process.env.EFFORT || "medium";

export const MODALITA_DEMO =
  process.env.MODALITA_DEMO === "1" || process.argv.includes("--demo") || !(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

const client = MODALITA_DEMO ? null : new Anthropic();

export class ErroreAgente extends Error {}

/**
 * Fa parlare un agente: gli passa il contesto e riceve una risposta JSON conforme allo schema richiesto.
 */
export async function chiediAgente(idAgente, nomeSchema, contenuto) {
  const agente = AGENTI_PER_ID[idAgente];
  if (MODALITA_DEMO) return rispostaDemo(idAgente, nomeSchema, contenuto);

  let ultimoErrore;
  for (let tentativo = 0; tentativo < 2; tentativo++) {
    try {
      const risposta = await client.beta.messages
        .stream({
          model: MODELLO,
          max_tokens: 32000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          thinking: { type: "adaptive" },
          output_config: { effort: EFFORT, format: { type: "json_schema", schema: SCHEMI[nomeSchema] } },
          system: agente.system,
          messages: [{ role: "user", content: contenuto }],
        })
        .finalMessage();

      if (risposta.stop_reason === "refusal") {
        throw new ErroreAgente(`${agente.nome} si è rifiutato di rispondere (${risposta.stop_details?.category ?? "motivo non specificato"}).`);
      }
      if (risposta.stop_reason === "max_tokens") {
        throw new ErroreAgente(`La risposta di ${agente.nome} è stata troncata.`);
      }
      const testo = risposta.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");
      return JSON.parse(testo);
    } catch (err) {
      ultimoErrore = err;
      // Errori di rete/429/5xx sono già ritentati dall'SDK; qui ritentiamo una volta i JSON non validi.
      if (!(err instanceof SyntaxError)) break;
    }
  }
  throw ultimoErrore;
}

export const infoModello = () => (MODALITA_DEMO ? "demo (risposte simulate)" : `${MODELLO} · effort ${EFFORT}`);
