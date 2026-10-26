import assert from "node:assert/strict";
import test from "node:test";
import {
  bandFor,
  buildScreeningResult,
  getScreening,
  needsCrisisSupport,
  optionsFor,
  resultDisclaimer,
  screenings,
  subscaleScores,
  triggersCrisis,
} from "../src/mock/screenings.ts";
import { REMIND_LATER_MS, computeScreeningFlow, emptyFlowPrefs, visibleRecommendations } from "../src/lib/screeningFlow.ts";

/** Resultado de prueba: respuestas dadas, el resto en 0 (o en el mínimo de la escala). */
function result(id, at, answers = []) {
  const definition = getScreening(id);
  const full = definition.items.map((_, index) => answers[index] ?? Math.min(...optionsFor(definition, index).map((option) => option.value)));
  return { ...buildScreeningResult(definition, full), completedAt: at };
}

const ids = (flow) => flow.recommendations.map((item) => item.id);

test("sin módulo 1 no se recomienda nada", () => {
  const flow = computeScreeningFlow([]);
  assert.deepEqual(ids(flow), []);
  assert.equal(flow.wellbeing, false);
});

test("PHQ-4 < 3 no satura: solo mensaje de bienestar", () => {
  const flow = computeScreeningFlow([result("phq4", 1, [1, 1])]);
  assert.equal(flow.entryPositive, false);
  assert.equal(flow.wellbeing, true);
  assert.deepEqual(ids(flow), []);
});

test("PHQ-4 ≥ 3 o K10 ≥ 22 recomiendan el módulo 2", () => {
  assert.deepEqual(ids(computeScreeningFlow([result("phq4", 1, [1, 1, 1])])), ["phq9", "gad7"]);
  // K10 va de 10 a 50: 21 es negativo y 22 positivo.
  const k10at21 = result("k10", 1, [3, 3, 3, 3, 3, 2, 1, 1, 1, 1]);
  const k10at22 = result("k10", 1, [3, 3, 3, 3, 3, 2, 2, 1, 1, 1]);
  assert.equal(k10at21.score, 21);
  assert.equal(k10at22.score, 22);
  assert.equal(computeScreeningFlow([k10at21]).entryPositive, false);
  assert.deepEqual(ids(computeScreeningFlow([k10at22])), ["phq9", "gad7"]);
});

test("se usa el módulo 1 más reciente, y solo cuentan los cuestionarios posteriores", () => {
  const old = [result("phq4", 1, [3, 3]), result("phq9", 2), result("gad7", 3)];
  assert.deepEqual(ids(computeScreeningFlow(old)), []);
  assert.deepEqual(ids(computeScreeningFlow([...old, result("k10", 10, [5, 5, 5])])), ["phq9", "gad7"]);
  assert.equal(computeScreeningFlow([...old, result("phq4", 10)]).wellbeing, true);
});

test("PHQ-9 ítem 9 > 0 activa el protocolo de crisis y pone Paykel primero", () => {
  const flow = computeScreeningFlow([result("phq4", 1, [2, 2]), result("phq9", 2, [0, 0, 0, 0, 0, 0, 0, 0, 1])]);
  assert.equal(flow.crisis, true);
  assert.equal(flow.recommendations[0].id, "paykel");
  assert.equal(flow.recommendations[0].urgent, true);
  const done = computeScreeningFlow([result("phq4", 1, [2, 2]), result("phq9", 2, [0, 0, 0, 0, 0, 0, 0, 0, 1]), result("paykel", 3)]);
  assert.equal(ids(done).includes("paykel"), false);
  assert.equal(done.crisis, true, "el PHQ-9 con ítem 9 sigue mostrando apoyo");
});

test("el protocolo de crisis también se activa con un sí en Paykel, sin depender del módulo 1", () => {
  assert.equal(computeScreeningFlow([result("paykel", 1, [1])]).crisis, true);
  assert.equal(triggersCrisis(getScreening("paykel"), [0, 0, 0, 0, 1]), true);
  assert.equal(triggersCrisis(getScreening("paykel"), [0, 0, 0, 0, 0]), false);
  assert.equal(needsCrisisSupport({ id: "phq9", completedAt: 1, answers: [], score: 0, band: "", item9Positive: true }), true);
});

test("PHQ-9 o GAD-7 moderado lleva al AUDIT-C, y un AUDIT-C positivo al AUDIT completo", () => {
  const base = [result("phq4", 1, [3, 3]), result("phq9", 2, [2, 2, 2, 2, 2]), result("gad7", 3)];
  assert.ok(ids(computeScreeningFlow(base)).includes("auditc"));
  const lowAudit = computeScreeningFlow([...base, result("auditc", 4, [1, 0, 1])]);
  assert.deepEqual(ids(lowAudit).filter((id) => id.startsWith("audit")), []);
  const highAudit = computeScreeningFlow([...base, result("auditc", 4, [2, 1, 0])]);
  assert.ok(ids(highAudit).includes("audit"));
  assert.equal(ids(computeScreeningFlow([...base, result("auditc", 4, [2, 1, 0]), result("audit", 5)])).includes("audit"), false);
});

test("síntomas leves no llevan al módulo 3", () => {
  const flow = computeScreeningFlow([result("phq4", 1, [3]), result("phq9", 2, [1, 1, 1, 1, 1]), result("gad7", 3, [1, 1, 1])]);
  assert.deepEqual(ids(flow), []);
});

test("dificultad para concentrarse o inquietud recomiendan el ASRS", () => {
  const concentration = computeScreeningFlow([result("phq4", 1, [3]), result("phq9", 2, [0, 0, 0, 0, 0, 0, 2]), result("gad7", 3)]);
  assert.ok(ids(concentration).includes("asrs"));
  const restless = computeScreeningFlow([result("phq4", 1, [3]), result("phq9", 2), result("gad7", 3, [0, 0, 0, 0, 3])]);
  assert.ok(ids(restless).includes("asrs"));
  const once = computeScreeningFlow([result("phq4", 1, [3]), result("phq9", 2), result("gad7", 3, [0, 0, 0, 0, 1])]);
  assert.equal(ids(once).includes("asrs"), false, "'varios días' no basta");
});

test("al terminar el módulo 2 se pregunta por trauma; un sí recomienda la PCL-5", () => {
  const moduleTwo = [result("phq4", 1, [3]), result("phq9", 2), result("gad7", 3)];
  assert.equal(computeScreeningFlow(moduleTwo).askTrauma, true);
  assert.equal(computeScreeningFlow(moduleTwo.slice(0, 2)).askTrauma, false, "falta el GAD-7");
  const yes = computeScreeningFlow(moduleTwo, { answer: "si", at: 4 });
  assert.equal(yes.askTrauma, false);
  assert.ok(ids(yes).includes("pcl5"));
  assert.equal(ids(computeScreeningFlow(moduleTwo, { answer: "no", at: 4 })).includes("pcl5"), false);
  assert.equal(ids(computeScreeningFlow([...moduleTwo, result("pcl5", 5)], { answer: "si", at: 4 })).includes("pcl5"), false);
  assert.equal(computeScreeningFlow(moduleTwo, { answer: "si", at: 2 }).askTrauma, true, "una respuesta anterior al módulo 2 no cuenta");
});

test("saltar oculta la recomendación hasta un nuevo disparador; recordar más tarde la pospone un día", () => {
  const flow = computeScreeningFlow([result("phq4", 100, [3])]);
  const now = 1_000;
  assert.deepEqual(visibleRecommendations(flow.recommendations, { ...emptyFlowPrefs, skipped: { phq9: 500 } }, now).map((item) => item.id), ["gad7"]);
  assert.deepEqual(visibleRecommendations(flow.recommendations, { ...emptyFlowPrefs, skipped: { phq9: 50 } }, now).map((item) => item.id), ["phq9", "gad7"], "se saltó antes de este resultado");
  const later = { ...emptyFlowPrefs, remindAt: { gad7: now + REMIND_LATER_MS } };
  assert.deepEqual(visibleRecommendations(flow.recommendations, later, now).map((item) => item.id), ["phq9"]);
  assert.deepEqual(visibleRecommendations(flow.recommendations, later, now + REMIND_LATER_MS).map((item) => item.id), ["phq9", "gad7"]);
});

test("cada instrumento tiene bandas sin huecos, sello de validación y referencias APA", () => {
  for (const definition of screenings) {
    assert.ok(definition.mexicoValidation.length > 20, `${definition.id}: falta validación`);
    assert.ok(definition.references.length > 0, `${definition.id}: faltan referencias`);
    definition.references.forEach((reference) => assert.match(reference.apa, /\(\d{4}\)\./, `${definition.id}: referencia sin año`));
    definition.items.forEach((_, index) => assert.ok(optionsFor(definition, index).length >= 2, `${definition.id}: pregunta ${index + 1} sin opciones`));
    if (definition.scoring.type !== "sum") continue;
    const { bands, maxScore } = definition.scoring;
    const minScore = definition.items.reduce((sum, _, index) => sum + Math.min(...optionsFor(definition, index).map((option) => option.value)), 0);
    assert.equal(bands[0].min, minScore, `${definition.id}: la primera banda no empieza en el mínimo`);
    assert.equal(bands.at(-1).max, maxScore, `${definition.id}: la última banda no llega al máximo`);
    bands.slice(1).forEach((band, index) => assert.equal(band.min, bands[index].max + 1, `${definition.id}: hueco entre bandas`));
    bands.forEach((band) => assert.doesNotMatch(band.message, /\btienes (depresión|ansiedad|un trastorno)/i));
  }
});

test("puntajes y semáforo de los instrumentos nuevos", () => {
  const audit = getScreening("audit");
  assert.deepEqual(optionsFor(audit, 9).map((option) => option.value), [0, 2, 4]);
  assert.equal(bandFor(audit, 8).level, "amarillo");
  assert.equal(bandFor(audit, 20).level, "rojo");
  assert.equal(bandFor(getScreening("k10"), 22).level, "naranja");
  assert.equal(bandFor(getScreening("asrs"), 4).level, "naranja");
  assert.equal(bandFor(getScreening("asrs"), 3).level, "verde");
  const [anxiety, mood] = subscaleScores(getScreening("phq4"), [2, 1, 0, 1]);
  assert.equal(anxiety.positive, true);
  assert.equal(mood.positive, false);
  assert.equal(resultDisclaimer, "Esta es una orientación inicial, no un diagnóstico. La interpretación final corresponde a un profesional de la salud mental.");
});
