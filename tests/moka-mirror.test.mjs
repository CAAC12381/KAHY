// Pruebas de "Lo que le dirías a alguien que quieres" (src/data/mokaMirror.ts).
//
// Las frases que se le dicen a Moka se le devuelven después a la persona, así que deben servir para
// cualquiera: sin género, sin emojis (la app usa sus íconos de línea) y sin que Moka se vea enferma.
import assert from "node:assert/strict";
import { test } from "node:test";

const { mirrorPhrase, mirrorSituations, practiceDay } = await import("../src/data/mokaMirror.ts");

// Adjetivos con género que se cuelan fácil al escribirle a Moka (que es "ella").
// "El ridículo" es sustantivo y "a solas" no tiene género: esos valen.
const GENDERED = /(?<!\p{L})(?:cansad|frustrad|tont|agotad|avergonzad|preocupad|enojad|desesperad|asustad|bonit|(?<!a )sol|(?<!el )ridícul)[ao]s?(?!\p{L})/iu;
const SICK = /\b(enferm|herid|lastim|sangr|hospital|veterinari|muri|muert)/i;

test("cada situación tiene historia, pensamiento, tres frases y respuesta, sin ids repetidos", () => {
  assert.ok(mirrorSituations.length >= 5);
  assert.equal(new Set(mirrorSituations.map((item) => item.id)).size, mirrorSituations.length);
  for (const situation of mirrorSituations) {
    for (const text of [situation.story, situation.thought, situation.thanks, ...situation.options]) {
      assert.ok(text.trim().length > 0, `${situation.id}: hay un texto vacío`);
      assert.doesNotMatch(text, /\p{Extended_Pictographic}/u, `${situation.id}: lleva emoji`);
    }
    assert.equal(situation.options.length, 3);
    assert.doesNotMatch(situation.thought, /[“”"]/, `${situation.id}: el pensamiento va sin comillas (la página las pone)`);
  }
});

test("lo que se le devuelve a la persona (pensamiento y frases) va en neutro, y Moka nunca está enferma", () => {
  for (const situation of mirrorSituations) {
    for (const text of [situation.thought, ...situation.options]) {
      assert.doesNotMatch(text, GENDERED, `${situation.id}: "${text}" tiene género`);
    }
    for (const text of [situation.story, situation.thanks]) assert.doesNotMatch(text, SICK, `${situation.id}: Moka no se enferma ni se lastima`);
  }
});

test("la frase devuelta quita el 'Moka,' del principio y empieza con mayúscula", () => {
  assert.equal(mirrorPhrase("Moka, no pasa nada."), "No pasa nada.");
  assert.equal(mirrorPhrase("  moka!   lo hiciste   con cariño "), "Lo hiciste con cariño");
  assert.equal(mirrorPhrase("¡Moka, tú puedes!"), "¡Moka, tú puedes!");
  assert.equal(mirrorPhrase("éste es tu ritmo"), "Éste es tu ritmo");
});

test("el día de práctica es la fecha local", () => {
  assert.equal(practiceDay(new Date(2026, 0, 5, 23, 30)), "2026-01-05");
});
