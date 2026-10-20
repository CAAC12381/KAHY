// Pruebas del motor conversacional local (el que responde sin internet o cuando la IA en línea no puede).
//
// Por qué existen: el 20 de octubre de 2026, sin conexión, "Me siento muy triste y sola desde hace
// días" recibía "Cuando la energía es baja, una lista grande puede convertirse en más evidencia de
// fracaso…", y "¿Por qué ya nada me importa?" recibía una respuesta sobre "información actual".
// La regla es la misma que sigue la IA en línea: primero acompañar, con las palabras de la persona.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createReply } from "../src/mock/conversation.ts";
import { trimAutomaticOpener } from "../api/_lib/kahyAi.ts";

const reply = (text, previous = "inicio") => createReply(text, previous, { turnCount: 1 });

test("reconoce cómo se siente la persona con sus propias palabras y cuánto tiempo lleva así", () => {
  const result = reply("Me siento muy triste y sola desde hace días");
  assert.equal(result.presentation, "conversation");
  assert.match(result.introduction, /muy triste y sola/);
  assert.match(result.introduction, /días/);
  assert.doesNotMatch(result.introduction, /lista grande|evidencia de fracaso/);
  assert.ok(result.steps.length > 0, "las acciones siguen disponibles en Plan de ahora");
});

test("no adivina el género: repite el que la persona usó", () => {
  assert.match(reply("Estoy agotado desde hace semanas").introduction, /agotado/);
  assert.match(reply("Me siento sola").introduction, /sola/);
  assert.doesNotMatch(reply("Me siento muy triste").question, /acompañado|acompañada/);
});

test("ante una pérdida, nombra a quien perdió", () => {
  assert.match(reply("Se murió mi abuela y no dejo de llorar").introduction, /^Siento mucho lo de tu abuela\./);
  assert.match(reply("Perdí a mis perros en el incendio").introduction, /^Siento mucho lo de tus perros\./);
});

test("el desgano no se trata como una pregunta de información", () => {
  const result = reply("¿Por qué ya nada me importa?");
  assert.equal(result.topic, "ánimo");
  assert.doesNotMatch(`${result.title} ${result.introduction} ${result.question}`, /información actual|inventar información/);
});

test("si pide un plan, recibe el plan", () => {
  const result = reply("Hazme un plan, estoy triste y no hago nada");
  assert.notEqual(result.presentation, "conversation");
  assert.ok(result.steps.length >= 2);
});

test("lo que no es un sentir no se repite como si lo fuera", () => {
  assert.doesNotMatch(reply("Estoy en la escuela y me aburro").introduction, /sintiéndote en la escuela|te sientes en la escuela/);
});

test("las frases de crisis siguen yendo directo a la ayuda, sin acompañamiento previo", () => {
  for (const text of ["Quiero matarme", "Ya nada tiene sentido", "Me siento sola y ya no quiero vivir"]) {
    const result = reply(text);
    assert.equal(result.mode, "safety", text);
    assert.equal(result.openHelp, true, text);
  }
});

test("se quita 'Veo que' / 'Entiendo que' al inicio de la respuesta de la IA en línea", () => {
  assert.equal(trimAutomaticOpener("Veo que el cansancio se ha instalado y no sabes la causa."), "El cansancio se ha instalado y no sabes la causa.");
  assert.equal(trimAutomaticOpener("Entiendo que te sientes muy sola."), "Te sientes muy sola.");
  assert.equal(trimAutomaticOpener("Ese cansancio pesa."), "Ese cansancio pesa.");
});
