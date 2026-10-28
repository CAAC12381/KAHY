// Pruebas del motor conversacional local (el que responde sin internet o cuando la IA en línea no puede).
//
// Por qué existen: el 20 de octubre de 2026, sin conexión, "Me siento muy triste y sola desde hace
// días" recibía "Cuando la energía es baja, una lista grande puede convertirse en más evidencia de
// fracaso…", y "¿Por qué ya nada me importa?" recibía una respuesta sobre "información actual".
// La regla es la misma que sigue la IA en línea: primero acompañar, con las palabras de la persona.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createReply } from "../src/mock/conversation.ts";
import { polishReply, trimAutomaticOpener } from "../api/_lib/kahyAi.ts";

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

// 28 oct 2026: sin IA, todas estas recibían la misma respuesta genérica o una tarjeta que no venía al caso.
test("responde a la situación concreta, no con el mismo molde para todo", () => {
  const cases = [
    ["hoy fue un día horrible, mi jefe me gritó enfrente de todos en la junta", /Que tu jefe te gritara enfrente de los demás/],
    ["y lo peor es que no le dije nada, me quedé callada", /Quedarte sin palabras/],
    ["es que siempre me pasa, nunca sé defenderme", /poner límites es algo que se practica/],
    ["mi novia me terminó hace una semana y no dejo de pensar en ella", /ruptura duele/],
    ["me encanta dibujar, me relaja mucho cuando estoy estresada", /Dibujar suena a un lugar donde bajas el ritmo/],
    ["esta tarea me mata jaja pero ya casi acabo", /¡Ya casi!/],
    ["siento que soy un fracaso, todos mis amigos ya tienen trabajo y yo sigo buscando", /Buscar trabajo mientras ves que a otros ya les salió/],
    ["hoy me fue mejor, gracias por lo de ayer", /Qué gusto|Me alegra/],
    ["Mi mamá está enferma, yo la cuido, trabajo medio tiempo y estoy en la uni. No tengo tiempo ni para mí", /muchísimo para una sola persona/],
    ["no sé", /Está bien no saber/],
  ];
  const intros = new Set();
  for (const [text, expected] of cases) {
    const result = reply(text);
    assert.match(result.introduction, expected, text);
    assert.doesNotMatch(result.introduction, /Vamos a ordenar esto|antes mencionaste|Leo lo que acabas/, text);
    intros.add(result.introduction);
  }
  assert.equal(intros.size, cases.length, "cada situación tiene su propia respuesta");
});

test("una ruptura se acompaña como pérdida, no como un pleito por negociar", () => {
  const result = reply("mi novia me terminó hace una semana");
  assert.equal(result.topic, "relaciones");
  assert.doesNotMatch(`${result.introduction} ${result.question}`, /conflicto puntual|Separemos lo que sientes/);
});

test("un hobby que relaja no recibe ejercicios de respiración", () => {
  const result = reply("me encanta dibujar, me relaja mucho cuando estoy estresada");
  assert.equal(result.steps.length, 0);
  assert.doesNotMatch(`${result.introduction} ${result.question}`, /respira|exhala|presión viene/i);
});

test("si ya lo intentó, no se le repite lo mismo; si es el celular, se habla del celular", () => {
  const result = createReply("eso ya lo intenté y no me sirve, me distraigo con el celular", "organización", { recentUserMessages: ["tengo 3 exámenes y no he estudiado"], turnCount: 2 });
  assert.match(result.introduction, /no tiene caso repetirte lo mismo/);
  assert.ok(result.steps.some((step) => /celular/.test(step.text)));
});

test("un medicamento por su nombre llega a la tarjeta de medicamentos, sin abrir la ayuda de crisis", () => {
  const result = reply("¿puedo dejar la sertralina de golpe? ya me siento mejor");
  assert.equal(result.topic, "medicación");
  assert.notEqual(result.mode, "safety");
  assert.match(result.introduction, /Qué bueno que te sientas mejor/);
  assert.match(result.insight, /Suspender de golpe/);
});

test("el riesgo de una amiga activa la ayuda para otra persona", () => {
  const result = reply("mi amiga me dijo que ya no quiere vivir y no sé qué hacer");
  assert.equal(result.mode, "safety");
  assert.equal(result.openHelp, true);
  assert.match(result.title, /esa persona/);
});

test("un saludo se contesta como saludo, sin pasos", () => {
  const result = reply("hola");
  assert.equal(result.presentation, "conversation");
  assert.equal(result.steps.length, 0);
  assert.doesNotMatch(result.introduction, /motor de orientación/);
});

test("lo que no encaja en nada se acompaña con una pregunta, sin un plan genérico", () => {
  const result = reply("pues nada, aquí pensando en muchas cosas");
  assert.equal(result.presentation, "conversation");
  assert.equal(result.steps.length, 0);
  assert.ok(result.question);
});

test("repaso de la IA: una pregunta de medicamentos no abre la ayuda de crisis, pero el riesgo sí", () => {
  const medication = polishReply({ mode: "safety", topic: "seguridad", presentation: "guided", introduction: "No la dejes de golpe.", steps: [], choices: [], question: "" }, "¿puedo dejar la sertralina de golpe?");
  assert.equal(medication.mode, "support");
  assert.equal(medication.topic, "medicación");
  assert.equal(medication.openHelp, false);
  const risk = polishReply({ mode: "safety", topic: "seguridad", presentation: "guided", introduction: "…", steps: [], choices: [], question: "" }, "me voy a tomar todas mis pastillas de sertralina");
  assert.equal(risk.mode, "safety");
  assert.equal(risk.openHelp, true);
});

test("repaso de la IA: opciones en la voz de la persona, pasos con etiquetas distintas y sin conversaciones sin salida", () => {
  const result = polishReply({
    mode: "standard", presentation: "guided", introduction: "…", question: "",
    choices: ["Quiero intentarlo", "¿Qué te impide decir algo?"],
    steps: [{ horizon: "corto plazo", text: "a" }, { horizon: "corto plazo", text: "b" }, { horizon: "corto plazo", text: "c" }],
  }, "ayúdame a organizarme");
  assert.deepEqual(result.choices, ["Quiero intentarlo"]);
  assert.deepEqual(result.steps.map((step) => step.horizon), ["Primero", "Luego", "Después"]);
  const stuck = polishReply({ mode: "standard", presentation: "conversation", introduction: "Eso pesa.", question: "", choices: [], steps: [] }, "ando bien agüitado");
  assert.ok(stuck.choices.length > 0, "se agregan opciones para seguir");
  const bye = polishReply({ mode: "standard", presentation: "conversation", introduction: "Cuídate.", question: "", choices: [], steps: [] }, "gracias, me voy a dormir");
  assert.equal(bye.choices.length, 0, "en una despedida no se insiste");
});

test("se quita 'Veo que' / 'Entiendo que' al inicio de la respuesta de la IA en línea", () => {
  assert.equal(trimAutomaticOpener("Veo que el cansancio se ha instalado y no sabes la causa."), "El cansancio se ha instalado y no sabes la causa.");
  assert.equal(trimAutomaticOpener("Entiendo que te sientes muy sola."), "Te sientes muy sola.");
  assert.equal(trimAutomaticOpener("Ese cansancio pesa."), "Ese cansancio pesa.");
});
