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

test("del chat a Moka: reconoce el tema de algo que salió mal o de una crítica a uno mismo", async () => {
  const { detectMirrorTheme } = await import("../src/data/mokaMirror.ts");
  const cases = [
    ["Saqué malas calificaciones y siento que soy un fracaso", "escuela"],
    ["Reprobé cálculo otra vez", "escuela"],
    ["Hoy me equivoqué en el trabajo y mi jefe se enojó", "trabajo"],
    ["Se me olvidó el cumpleaños de mi amiga", "amistad"],
    ["Me tropecé enfrente de todos y se rieron", "verguenza"],
    ["Todos son mejores que yo, no sirvo para nada", "comparacion"],
    ["Siento que decepcioné a mis papás", "familia"],
    ["Me fue mal, la regué otra vez", "intento"],
  ];
  for (const [message, theme] of cases) assert.equal(detectMirrorTheme(message), theme, message);
  // Sin algo que salió mal ni crítica a uno mismo, no sugiere nada (tampoco en un duelo: perder a alguien no es un error).
  for (const message of ["Estoy feliz porque aprobé", "Perdí a mi abuela y estoy muy triste", "Estoy cansado y no puedo dormir", "Mañana tengo examen"]) {
    assert.equal(detectMirrorTheme(message), null, message);
  }
});

test("cada tema tiene al menos una situación de Moka, y situationsFor solo da las de ese tema", async () => {
  const { mirrorThemes, situationsFor } = await import("../src/data/mokaMirror.ts");
  for (const theme of Object.keys(mirrorThemes)) {
    const pool = situationsFor(theme);
    assert.ok(pool.length > 0, theme);
    assert.ok(pool.every((item) => item.theme === theme), theme);
  }
});
