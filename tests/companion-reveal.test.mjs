import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  COMPANION_REVEALS_KEY,
  advanceCompanionBox,
  forgetCompanionReveal,
  hasRevealedCompanion,
  rememberCompanionReveal,
} from "../src/lib/companionReveal.ts";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test("la caja necesita dos toques antes de abrirse", () => {
  assert.equal(advanceCompanionBox("closed"), "primed");
  assert.equal(advanceCompanionBox("primed"), "opening");
  assert.equal(advanceCompanionBox("opening"), "opening");
  assert.equal(advanceCompanionBox("open"), "open");
});

test("movimiento reducido revela la mascota en el segundo toque", () => {
  assert.equal(advanceCompanionBox("closed", true), "primed");
  assert.equal(advanceCompanionBox("primed", true), "open");
});

test("la revelación se recuerda por cuenta y mascota", () => {
  const localStorage = memoryStorage();
  globalThis.window = { localStorage };

  assert.equal(hasRevealedCompanion("cuenta-a", "vaca"), false);
  rememberCompanionReveal("cuenta-a", "vaca");
  assert.equal(hasRevealedCompanion("cuenta-a", "vaca"), true);
  assert.equal(hasRevealedCompanion("cuenta-a", "pollito"), false);
  assert.equal(hasRevealedCompanion("cuenta-b", "vaca"), false);
  assert.ok(localStorage.getItem(COMPANION_REVEALS_KEY));

  forgetCompanionReveal("cuenta-a", "vaca");
  assert.equal(hasRevealedCompanion("cuenta-a", "vaca"), false);
});

test("el parpadeo se limita a cinco repeticiones", async () => {
  const css = await readFile(new URL("../src/index.css", import.meta.url), "utf8");
  assert.match(css, /animation:\s*mascot-blink\s+1\.15s\s+ease-in-out\s+\.45s\s+5\s+both/);
});
