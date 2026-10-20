// Pruebas del respaldo entre modelos de Groq (api/_lib/groq.ts). Sin red: se reemplaza fetch.
//
// Por qué existen: el 20 de octubre de 2026 se midió que el plan gratuito de
// Groq rechaza (429) el tercer mensaje del minuto con un solo modelo, y el
// chat caía al motor local sin decir por qué. Con el respaldo pasan ~5.
// Cada prueba usa nombres de modelo distintos porque la pausa tras un 429 se
// recuerda por modelo durante toda la ejecución.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { AiBusyError, groqStructuredCompletion } from "../api/_lib/groq.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.GROQ_FALLBACK_MODEL;
});

function respond(status, body = {}, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
}
const ok = (data) => respond(200, { choices: [{ message: { content: JSON.stringify(data) } }] });

function fakeGroq(byModel) {
  const calls = [];
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body);
    const next = byModel[body.model].shift();
    if (!next) throw new Error(`llamada inesperada a ${body.model}`);
    return next();
  };
  return calls;
}

const request = (model) => ({ apiKey: "k", model, messages: [{ role: "user", content: "hola" }], schemaName: "s", schema: {}, maxTokens: 100, signal: new AbortController().signal });

test("si el modelo principal está saturado responde el de respaldo", async () => {
  process.env.GROQ_FALLBACK_MODEL = "respaldo-a";
  const calls = fakeGroq({ "principal-a": [() => respond(429, {}, { "retry-after": "30" })], "respaldo-a": [() => ok({ texto: "hola" })] });
  const result = await groqStructuredCompletion(request("principal-a"));
  assert.deepEqual(result, { data: { texto: "hola" }, model: "respaldo-a" });
  assert.equal(calls.length, 2);
});

test("con los dos saturados avisa cuántos segundos esperar, y después no vuelve a llamar antes de tiempo", async () => {
  process.env.GROQ_FALLBACK_MODEL = "respaldo-b";
  const calls = fakeGroq({
    "principal-b": [() => respond(429, {}, { "retry-after": "30" })],
    "respaldo-b": [() => respond(429, {}, { "retry-after": "12" })],
  });
  await assert.rejects(groqStructuredCompletion(request("principal-b")), (error) => error instanceof AiBusyError && error.retryAfterSeconds === 12);
  assert.equal(calls.length, 2);
  await assert.rejects(groqStructuredCompletion(request("principal-b")), AiBusyError);
  assert.equal(calls.length, 2, "durante la pausa no debe tocar Groq");
});

test("si la espera es corta, espera y reintenta una vez", async () => {
  process.env.GROQ_FALLBACK_MODEL = "respaldo-c";
  const calls = fakeGroq({
    "principal-c": [() => respond(429, {}, { "retry-after": "1" }), () => ok({ texto: "ya" })],
    "respaldo-c": [() => respond(429, {}, { "retry-after": "2" })],
  });
  const result = await groqStructuredCompletion(request("principal-c"));
  assert.equal(result.model, "principal-c");
  assert.equal(calls.length, 3);
});

test("una salida que no cumplió el esquema (400) pasa al respaldo; una clave inválida (401) no", async () => {
  process.env.GROQ_FALLBACK_MODEL = "respaldo-d";
  fakeGroq({ "principal-d": [() => respond(400)], "respaldo-d": [() => ok({ texto: "bien" })] });
  assert.equal((await groqStructuredCompletion(request("principal-d"))).model, "respaldo-d");

  process.env.GROQ_FALLBACK_MODEL = "respaldo-e";
  const calls = fakeGroq({ "principal-e": [() => respond(401)], "respaldo-e": [] });
  await assert.rejects(groqStructuredCompletion(request("principal-e")), (error) => !(error instanceof AiBusyError));
  assert.equal(calls.length, 1);
});

test("los modelos gpt-oss se piden con razonamiento bajo y esquema estricto", async () => {
  const calls = fakeGroq({ "openai/gpt-oss-120b": [() => ok({ texto: "hola" })] });
  await groqStructuredCompletion(request("openai/gpt-oss-120b"));
  assert.equal(calls[0].reasoning_effort, "low");
  assert.equal(calls[0].response_format.json_schema.strict, true);
});
