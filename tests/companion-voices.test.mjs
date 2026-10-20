// Pruebas de las personalidades de los acompañantes (src/lib/companionVoices.ts).
//
// Por qué existen: hasta el 20 de octubre de 2026 todos los animalitos y plantas decían las mismas
// diez frases, y en el teléfono tocar varias veces repetía la misma. Si agregas un acompañante o
// frases nuevas, estas pruebas revisan que tenga su voz completa y propia.
import assert from "node:assert/strict";
import { test } from "node:test";
import { companionVoices, nextLine, talkTone } from "../src/lib/companionVoices.ts";

const animalCare = ["food", "play", "love"];
const plantCare = ["water", "sun", "prune"];
const tones = ["pesada", "inquieta", "intensa", "luminosa", "sinSeñal"];
const entries = Object.entries(companionVoices);

test("hay voz para los 4 animales y las 4 plantas", () => {
  assert.deepEqual(entries.map(([key]) => key).sort(), [
    "mascota:camaleon", "mascota:pollito", "mascota:tortuga", "mascota:vaca",
    "planta:Clavel", "planta:Gerbera", "planta:Orquidea", "planta:Tulipan",
  ]);
});

test("cada acompañante tiene todas sus frases: al tocarlo, al extrañarte, al cuidarlo y al hablar", () => {
  for (const [key, voice] of entries) {
    assert.ok(voice.personality.length > 10, key);
    assert.ok(voice.tap.length >= 6, `${key}: pocas frases al tocarlo`);
    assert.ok(voice.missed.length >= 2, `${key}: missed`);
    for (const action of key.startsWith("mascota") ? animalCare : plantCare) assert.ok(voice.care[action]?.length >= 2, `${key}: care.${action}`);
    for (const tone of tones) assert.ok(voice.talk[tone]?.length >= 2, `${key}: talk.${tone}`);
  }
});

test("ningún acompañante repite una frase de otro: cada uno suena distinto", () => {
  const owner = new Map();
  for (const [key, voice] of entries) {
    const lines = [...voice.tap, ...voice.missed, ...Object.values(voice.care).flat(), ...Object.values(voice.talk).flat()];
    for (const line of lines) {
      assert.ok(!owner.has(line) || owner.get(line) === key, `"${line}" está en ${owner.get(line)} y en ${key}`);
      owner.set(line, key);
    }
  }
});

test("las frases caben en el globo del teléfono y no le ponen género a la persona", () => {
  for (const [key, voice] of entries) {
    const lines = [...voice.tap, ...voice.missed, ...Object.values(voice.care).flat(), ...Object.values(voice.talk).flat()];
    for (const line of lines) {
      assert.ok(line.length <= 100, `${key}: demasiado larga: "${line}"`);
      assert.doesNotMatch(line, /\b(acompañad[oa]|bienvenid[oa]|list[oa] para ti|cansad[oa] tú)\b/i, `${key}: "${line}"`);
    }
  }
});

test("al tocar varias veces no sale la misma frase seguida y se recorren todas antes de repetir", () => {
  const lines = companionVoices["planta:Gerbera"].tap;
  const seen = [];
  for (let index = 0; index < lines.length * 3; index++) seen.push(nextLine("prueba:gerbera", lines));
  for (let index = 1; index < seen.length; index++) assert.notEqual(seen[index], seen[index - 1], `repetida en la posición ${index}`);
  assert.equal(new Set(seen.slice(0, lines.length)).size, lines.length, "la primera vuelta debe usar todas las frases");
});

test("'Hablar' responde según la última emoción registrada", () => {
  assert.equal(talkTone("tristeza"), "pesada");
  assert.equal(talkTone("ansiedad"), "inquieta");
  assert.equal(talkTone("enojo"), "intensa");
  assert.equal(talkTone("alegría"), "luminosa");
  assert.equal(talkTone(undefined), "sinSeñal");
  assert.equal(talkTone("no_clara"), "sinSeñal");
});
