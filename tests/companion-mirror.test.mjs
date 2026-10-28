// Pruebas de "Lo que le dirías a alguien que quieres" (src/data/companionMirror.ts).
//
// Las frases que se le dicen a un compañero se le devuelven después a la persona, así que deben servir
// para cualquiera: sin género, sin emojis (la app usa sus íconos de línea) y sin que los compañeros se
// vean enfermos.
import assert from "node:assert/strict";
import { test } from "node:test";

const { companionOf, detectMirrorTheme, mirrorCompanions, mirrorPhrase, mirrorSituations, mirrorThemes, practiceDay, situationsFor, situationsOf } = await import("../src/data/companionMirror.ts");

// Adjetivos con género que se cuelan fácil al escribirles (Moka y Tita son "ella"; Pío y Lima, "él").
// "El ridículo" es sustantivo y "a solas" no tiene género: esos valen.
const GENDERED = /(?<!\p{L})(?:cansad|frustrad|tont|agotad|avergonzad|preocupad|enojad|desesperad|asustad|bonit|atrasad|adelantad|(?<!a )sol|(?<!el )ridícul)[ao]s?(?!\p{L})/iu;
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

test("lo que se le devuelve a la persona (pensamiento y frases) va en neutro, y nadie está enfermo", () => {
  for (const situation of mirrorSituations) {
    for (const text of [situation.thought, ...situation.options]) {
      assert.doesNotMatch(text, GENDERED, `${situation.id}: "${text}" tiene género`);
    }
    for (const text of [situation.story, situation.thanks]) assert.doesNotMatch(text, SICK, `${situation.id}: los compañeros no se enferman ni se lastiman`);
  }
});

test("la frase devuelta quita el nombre del compañero del principio y empieza con mayúscula", () => {
  assert.equal(mirrorPhrase("Moka, no pasa nada."), "No pasa nada.");
  assert.equal(mirrorPhrase("  moka!   lo hiciste   con cariño "), "Lo hiciste con cariño");
  assert.equal(mirrorPhrase("Pío: pedir ayuda está bien"), "Pedir ayuda está bien");
  assert.equal(mirrorPhrase("Tita, ve a tu ritmo"), "Ve a tu ritmo");
  assert.equal(mirrorPhrase("¡Moka, tú puedes!"), "¡Moka, tú puedes!");
  assert.equal(mirrorPhrase("éste es tu ritmo"), "Éste es tu ritmo");
});

test("el día de práctica es la fecha local", () => {
  assert.equal(practiceDay(new Date(2026, 0, 5, 23, 30)), "2026-01-05");
});

test("del chat al compañero: reconoce el tema de lo que se contó", () => {
  const cases = [
    // Moka: algo salió mal y la crítica a uno mismo.
    ["Saqué malas calificaciones y siento que soy un fracaso", "escuela"],
    ["Reprobé cálculo otra vez", "escuela"],
    ["Hoy me equivoqué en el trabajo y mi jefe se enojó", "trabajo"],
    ["Se me olvidó el cumpleaños de mi amiga", "amistad"],
    ["Me tropecé enfrente de todos y se rieron", "verguenza"],
    ["Todos son mejores que yo, no sirvo para nada", "comparacion"],
    ["Siento que decepcioné a mis papás", "familia"],
    ["Me fue mal, la regué otra vez", "intento"],
    // Pío: pedir ayuda. Lima: cambiar para agradar o esconder lo que siente. Tita: ir más lento.
    ["Me da pena pedir ayuda en la escuela", "ayuda"],
    ["No quiero molestar a nadie con mis problemas", "ayuda"],
    ["No supe decir que no y ahora tengo mucho trabajo", "agradar"],
    ["Finjo que estoy bien para que no se preocupen", "agradar"],
    ["Siento que voy muy atrasada, todos ya se graduaron", "ritmo"],
    ["Soy muy lento para todo", "ritmo"],
  ];
  for (const [message, theme] of cases) assert.equal(detectMirrorTheme(message), theme, message);
  // Sin nada de eso no sugiere nada: tampoco en un duelo (perder a alguien no es un error) ni con
  // "soy una carga", que es una frase de riesgo y la atiende la ayuda de crisis del chat.
  for (const message of ["Estoy feliz porque aprobé", "Perdí a mi abuela y estoy muy triste", "Estoy cansado y no puedo dormir", "Mañana tengo examen", "Siento que soy una carga"]) {
    assert.equal(detectMirrorTheme(message), null, message);
  }
});

test("cada tema tiene situaciones de su compañero, y situationsFor solo da las de ese tema", () => {
  for (const theme of Object.keys(mirrorThemes)) {
    const pool = situationsFor(theme);
    assert.ok(pool.length > 0, theme);
    assert.ok(pool.every((item) => item.theme === theme && companionOf(item) === mirrorThemes[theme].companion), theme);
  }
});

test("los cuatro compañeros tienen al menos tres situaciones", () => {
  for (const companion of Object.keys(mirrorCompanions)) {
    assert.ok(situationsOf(companion).length >= 3, companion);
  }
});
