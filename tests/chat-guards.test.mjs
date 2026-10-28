// Pruebas de las reglas deterministas del chat (api/_lib/chatGuards.ts).
// Se corren con `pnpm test` (o `npm test`); no necesitan dependencias ni red.
//
// Por qué existen: el 4 de octubre de 2026 una versión del límite de alcance
// rechazaba como "fuera de tema" 44 de 66 mensajes de personas pidiendo ayuda
// ("¿Por qué ya nada me importa?", "Necesito una razón para seguir"). Si
// cambias chatGuards.ts, agrega aquí el caso que motivó el cambio.
import assert from "node:assert/strict";
import { test } from "node:test";
import { detectSafetySignal, detectThirdPartySafetySignal, isOutOfScopeInformationRequest, mentionsMedication } from "../api/_lib/chatGuards.ts";

const crisis = [
  "me quiero morir", "Ya quiero morir", "no quiero vivir", "No quiero seguir así", "no quiero seguir aquí", "ya no quiero estar aquí",
  "quiero desaparecer para siempre", "me quiero ir para siempre", "he pensado en el suicidio", "pienso suicidarme", "quiero matarme",
  "voy a matarme hoy", "quiero quitarme la vida", "me voy a matar", "quiero acabar con mi vida", "quiero terminar con todo esto",
  "ya no la hago más", "quiero hacerme daño", "pienso hacerme daño", "tengo ganas de lastimarme", "no puedo mantenerme a salvo",
  "me corté otra vez", "me estoy cortando", "quiero cortarme las venas", "pienso ahorcarme", "voy a colgarme", "quiero aventarme del puente",
  "voy a tirarme desde el techo", "ya tengo un plan para morir", "hice un plan para matarme", "quiero despedirme de todos",
  "ojalá no despertara", "mejor ya no despertar", "estarían mejor sin mí", "soy una carga para todos", "ya no le veo sentido a la vida",
  "nada tiene sentido ya", "tomé una sobredosis", "tomé demasiadas pastillas", "me tomé todas las pastillas", "mi papá no está respirando",
  "no puedo respirar", "está inconsciente", "hay violencia en mi casa ahora", "me están golpeando", "estoy en peligro",
  "quiero hacerle daño a alguien", "ME QUIERO MORIR!!!", "la neta ya no quiero vivir, estoy harta",
  "ya nada tiene sentido", "mi vida no tiene sentido", "la vida ya no tiene ningún sentido", "no tiene sentido vivir así",
  // 28 oct 2026: tomar todas las pastillas dicho en futuro no se detectaba.
  "me voy a tomar todas mis pastillas", "quiero tomarme todas las pastillas", "pienso tomarme toda la caja de pastillas",
];

const everyday = [
  "no me quiero morir, solo estoy cansada", "no quiero morir pero tengo miedo", "me muero de risa con ese video", "me muero de hambre",
  "esta tarea me mata", "la escuela me mata", "quiero matar el tiempo", "morí con ese meme", "estoy triste por mi examen",
  "¿cómo le digo a mi mamá que reprobé?", "hoy me siento mejor", "quiero aprender a meditar", "mi perro murió y lo extraño",
  "tengo ansiedad antes de exponer", "no quiero hacerme daño, solo quiero dormir", "¿Cómo cambio una llanta?",
  "esta tarea no tiene sentido", "no tiene sentido seguir estudiando así",
];

const thirdParty = [
  "mi amiga se quiere morir", "mi hermano dijo que quiere morir", "un amigo habla de suicidarse", "mi novia quiere matarse",
  "alguien de mi salón dice que se quiere morir", "mi hija se está lastimando", "una persona cercana piensa en el suicidio",
  // 28 oct 2026: "ya no quiere vivir" y otros parientes no se detectaban.
  "mi amiga me dijo que ya no quiere vivir y no sé qué hacer", "mi primo se quiere matar", "mi mamá dice que no quiere vivir",
  "mi roomie se está cortando", "mi hermana se tomó todas las pastillas", "mi tía habla de quitarse la vida",
];

test("se reconocen los medicamentos por nombre, pero no cualquier palabra", () => {
  for (const text of ["¿puedo dejar la sertralina de golpe?", "me recetaron Clonazepam", "olvidé mis pastillas", "quiero dejar de tomar el antidepresivo"]) {
    assert.equal(mentionsMedication(text), true, text);
  }
  for (const text of ["me siento triste", "tengo examen de litografía", "vi un video de pastelitos"]) {
    assert.equal(mentionsMedication(text), false, text);
  }
});

const wellbeing = [
  "¿Por qué ya nada me importa?", "¿Por qué lloro tanto últimamente?", "¿Cómo le digo a mi mamá que reprobé el semestre?",
  "¿Cómo dejo de pensar en él?", "¿Qué hago si no puedo levantarme de la cama?", "¿Cómo le hago para no sentirme tan sola?",
  "¿Por qué me odio tanto?", "Dime qué hago, ya no puedo más", "Ayúdame a calmarme por favor", "Ayúdame con mis ataques de pánico",
  "Necesito un consejo, mi papá me grita todos los días", "Quiero un abrazo, me siento fatal",
  "¿Cómo supero la historia de abuso que viví de niña?", "¿Cómo dejo de comprar cosas compulsivamente?",
  "¿Cómo manejo la ansiedad antes de un viaje?", "¿Cuál es el precio de una consulta con psicólogo?",
  "¿Cómo programo una cita en el hospital psiquiátrico?", "¿Por qué el clima nublado me deprime tanto?",
  "¿Cómo le hago para cocinar si no tengo energía por la depresión?", "¿Qué hago? Choqué el carro y ahora me da pánico manejar",
  "¿Cómo dejo de sentirme tonto en matemáticas?", "¿Cómo dejo de estar todo el día en la computadora? Me siento vacío",
  "¿Dónde puedo encontrar ayuda en Uruapan?", "¿Dónde hay un psicólogo gratis?", "¿Cuándo debería buscar ayuda profesional?",
  "¿Qué es un ataque de pánico?", "¿Qué es el TDAH?", "¿Cómo sé si tengo depresión?", "¿Cómo ayudo a mi amiga que se corta?",
  "¿Qué le digo a mi hermano que perdió a su hijo?", "¿Por qué no puedo dormir?", "¿Cómo dejo de beber?", "¿Cómo dejo el vapeo?",
  "Explícame qué me pasa, tiemblo y sudo sin razón", "¿Quién me puede ayudar? No tengo a nadie", "¿Cómo borro mi cuenta de KAHY?",
  "¿Cómo le pongo límites a mi jefe?", "Dame ánimos, hoy presenté mi examen y me fue mal",
  "¿Cómo hago para que me dejen de molestar en la escuela?", "¿Cómo le hago para perdonarme?",
  "¿Por qué me cuesta tanto empezar las cosas?", "¿Cómo salgo de aquí? Mi pareja me pega", "¿Qué hago si escucho voces?",
  "¿Cómo le explico a mi hijo que su abuelo murió?", "Necesito una razón para seguir", "¿Cuánto tiempo dura el duelo?",
  "¿Cómo puedo hacer para dejar de comer por nervios?", "Hazme compañía un rato",
  "Escribe conmigo una carta para despedirme de mi perro que murió", "¿Qué son los pensamientos intrusivos?",
  // Llevan una palabra "ajena" (carro, viaje, cocinar, comprar…) pero son de bienestar.
  "¿Por qué ya ni cocinar puedo?", "¿Cómo dejo de comprar tanto?",
  "¿Cómo le explico a mi jefe que choqué el carro de la empresa? Estoy aterrada",
  "Dime cómo pagar el viaje, mi esposo me dejó sin dinero", "¿Por qué me estresa tanto programar?",
  "¿Cómo le hago? La computadora es lo único que me distrae de llorar", "Me gusta cocinar, dame una receta",
  "¿Por qué odio las matemáticas? me hacen sentir inútil", "¿Cuánto cuesta una terapia?", "¿Cómo instalo límites con mi familia?",
  "Dame una historia de alguien que superó la depresión", "¿Cómo se hace para dejar de sentir culpa?",
  "¿Me puedes explicar qué es la ansiedad?", "¿Podrías darme un consejo? Me siento mal", "¿Me puedes decir dónde pedir ayuda?",
  "Ayúdame con el precio que pagué por callar tanto tiempo, me siento usada",
];

const unrelated = [
  "¿Cómo cambio una llanta?", "Dame una receta de sopa de tortilla", "¿Cuál es la capital de Francia?",
  "Escribe un programa en Python que ordene una lista", "Resuelve esta ecuación: 2x + 3 = 7", "¿Cómo instalo Excel?",
  "¿Cuánto cuesta un boleto de avión a Cancún?", "Traduce este texto al inglés", "¿Cómo cambio la llanta de mi carro?",
  "¿Me puedes dar la receta del pozole?", "Explícame cómo instalar Windows", "Dime el pronóstico del clima para mañana",
  "¿Me dices cómo cambio una llanta?", "Pasos para hacer un pastel de chocolate",
];

test("cada frase de crisis se detecta", () => {
  assert.deepEqual(crisis.filter((text) => !detectSafetySignal(text)), []);
});

test("las expresiones cotidianas y las negaciones no disparan la alerta", () => {
  assert.deepEqual(everyday.filter((text) => detectSafetySignal(text)), []);
});

test("el riesgo de otra persona se detecta", () => {
  assert.deepEqual(thirdParty.filter((text) => !detectThirdPartySafetySignal(text)), []);
});

test("ningún mensaje de bienestar se rechaza como fuera de tema", () => {
  assert.deepEqual(wellbeing.filter((text) => isOutOfScopeInformationRequest(text)), []);
});

test("las peticiones claramente ajenas sí se detienen", () => {
  assert.deepEqual(unrelated.filter((text) => !isOutOfScopeInformationRequest(text)), []);
});

test("una frase de crisis nunca se trata como fuera de tema", () => {
  assert.deepEqual([...crisis, ...thirdParty].filter((text) => isOutOfScopeInformationRequest(text)), []);
});

test("un mensaje vacío no es fuera de tema ni señal de crisis", () => {
  for (const text of ["", "   ", "¿?"]) {
    assert.equal(isOutOfScopeInformationRequest(text), false);
    assert.equal(detectSafetySignal(text), false);
  }
});
