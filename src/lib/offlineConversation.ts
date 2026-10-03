import { emotionLabels, inferLocalEmotion } from "./emotionLexicon";
import type { ChatTopic, ConversationReply } from "../mock/conversation";
import type { AdaptiveHighlights } from "./personalization";

export type LocalConversationContext = {
  recentUserMessages?: string[];
  turnCount?: number;
  personalization?: AdaptiveHighlights;
};

type LocalIntent = "listen" | "understand" | "decide" | "plan" | "write" | "regulate" | "question" | "open";

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function hasAny(text: string, phrases: string[]) {
  return phrases.some((phrase) => text.includes(phrase));
}

function detectIntent(input: string): LocalIntent {
  const text = normalize(input);
  if (hasAny(text, ["solo quiero contarlo", "quiero desahogarme", "escuchame", "necesito sacarlo", "solo escuchame"])) return "listen";
  if (hasAny(text, ["ayudame a entender", "por que me pasa", "que me pasa", "no entiendo", "quiero entender", "que significa lo que siento"])) return "understand";
  if (hasAny(text, ["ayudame a decidir", "que me conviene", "no se cual elegir", "tengo dos opciones", "pensemos opciones", "tomar una decision"])) return "decide";
  if (hasAny(text, ["hazme un plan", "armar un plan", "por donde empiezo", "que hago primero", "paso a paso", "organizar esto", "manana", "esta semana"])) return "plan";
  if (hasAny(text, ["ayudame a escribir", "que le digo", "como se lo digo", "redactar", "mandar un mensaje", "responderle"])) return "write";
  if (hasAny(text, ["calmarme", "bajar la intensidad", "estoy muy alterad", "necesito una pausa", "no puedo pensar", "me siento rebasad"])) return "regulate";
  if (/\?|^(como|que|cual|cuando|donde|por que|puedes|sabes)\b/.test(text.trim())) return "question";
  return "open";
}

function stableChoice(input: string, turnCount: number, options: string[]) {
  const score = [...input].reduce((total, character) => total + character.charCodeAt(0), turnCount * 17);
  return options[Math.abs(score) % options.length];
}

function shortReference(input: string) {
  const clean = input.trim().replace(/\s+/g, " ");
  return clean.length > 92 ? `${clean.slice(0, 89)}…` : clean;
}

function continuity(context: LocalConversationContext) {
  const previous = context.recentUserMessages?.filter(Boolean).at(-1);
  if (!previous) return "";
  return ` También tengo presente que antes mencionaste “${shortReference(previous)}”; podemos conectarlo sin empezar de cero.`;
}

function adaptiveNote(intent: LocalIntent, context: LocalConversationContext) {
  const saved = context.personalization;
  if (!saved) return "";
  if ((intent === "plan" || intent === "open") && saved.activeTask) {
    return ` Ya tienes “${shortReference(saved.activeTask)}” en curso (${saved.activeTaskProgress || "con avance guardado"}); podemos retomar eso o trabajar algo distinto.`;
  }
  if (intent === "regulate" && saved.lowStimuli) {
    return " Mantendré esto breve y con pocos estímulos, como prefieres.";
  }
  if ((intent === "understand" || intent === "listen") && saved.recentEmotion) {
    return ` También tendré presente que últimamente apareció ${saved.recentEmotion.toLowerCase()}, sin asumir que hoy te sientes igual.`;
  }
  if (intent === "open" && saved.completedHabits > 0) {
    return ` Hoy ya registraste ${saved.completedHabits} de ${saved.totalHabits} hábitos; no estás empezando desde cero.`;
  }
  return "";
}

function emotionalOpening(input: string, turnCount: number) {
  const emotion = inferLocalEmotion(input);
  if (emotion.primary === "no_clara") {
    return stableChoice(input, turnCount, [
      "Gracias por explicarlo con tus palabras. No necesito que lo cuentes de una forma perfecta para poder acompañarte.",
      "Te sigo. Hay suficiente en lo que cuentas para ordenar un siguiente paso sin apresurarnos a ponerle una etiqueta.",
      "Lo que planteas merece una respuesta concreta, pero también espacio para entender qué necesitas tú de esta conversación.",
    ]);
  }

  const label = emotionLabels[emotion.primary].toLowerCase();
  return stableChoice(input, turnCount, [
    `En lo que escribes aparece ${label}. No voy a reducir todo a esa emoción, pero sí tomarla en cuenta para responderte con más cuidado.`,
    `Parece haber ${label} detrás de esto. Tiene sentido detenernos a ordenar la situación antes de exigirte una solución completa.`,
    `Gracias por nombrarlo. La señal de ${label} importa, y podemos trabajar con ella sin convertirla en un diagnóstico ni en una conclusión sobre ti.`,
  ]);
}

function baseReply(input: string, previousTopic: ChatTopic, context: LocalConversationContext, intent: LocalIntent) {
  const turnCount = context.turnCount ?? 0;
  const emotion = inferLocalEmotion(input);
  const topic = previousTopic !== "inicio" && previousTopic !== "seguridad" ? previousTopic : "conversación";
  return {
    mode: "standard" as const,
    presentation: "conversation" as const,
    topic,
    label: "Orientación local",
    introduction: `${emotionalOpening(input, turnCount)}${continuity(context)}${adaptiveNote(intent, context)}`,
    sourceIds: [] as string[],
    openHelp: false,
    emotion,
  };
}

/**
 * Motor conversacional que vive por completo en el navegador. No intenta
 * fingir conocimiento en tiempo real: estructura, contiene y acompaña con
 * rutas redactadas de antemano cuando la IA remota no está disponible.
 */
export function createAdaptiveOfflineReply(input: string, previousTopic: ChatTopic, context: LocalConversationContext = {}): ConversationReply {
  const directIntent = detectIntent(input);
  const previousIntent = context.recentUserMessages?.length ? detectIntent(context.recentUserMessages.at(-1) ?? "") : "open";
  const continuedIntent = directIntent === "open" && !["open", "question", "listen"].includes(previousIntent);
  const intent = continuedIntent ? previousIntent : directIntent;
  const base = baseReply(input, previousTopic, context, intent);

  if (intent === "listen") return {
    ...base,
    title: "Puedes contarlo sin tener que resolverlo todavía",
    insight: "Voy a acompañar el hilo de lo que digas y evitar convertir cada mensaje en una lista de tareas. Si después quieres ordenar opciones, me lo dices.",
    steps: [],
    question: "¿Qué parte de todo esto has tenido que guardar o minimizar frente a otras personas?",
    choices: ["Lo que más me dolió", "Lo que no he podido decir", "Cómo me está afectando"],
  };

  if (intent === "understand") return {
    ...base,
    title: "Separemos lo que ocurrió de lo que tu mente concluyó",
    insight: "Entender no significa justificar lo ocurrido. Significa distinguir hechos, emociones, necesidades y patrones para que no todo se sienta como una sola bola.",
    steps: [
      { horizon: "Hecho", text: "Describe qué ocurrió como si una cámara lo hubiera grabado, sin interpretar todavía las intenciones de nadie." },
      { horizon: "Impacto", text: "Nombra qué cambió en ti: qué sentiste, qué pensaste y qué impulso apareció." },
      { horizon: "Necesidad", text: "Pregunta qué habría ayudado en ese momento: claridad, respeto, descanso, seguridad, compañía o un límite." },
    ],
    question: "¿Quieres empezar por lo que pasó, por lo que sentiste o por la conclusión que no puedes dejar de pensar?",
    choices: ["Lo que pasó", "Lo que sentí", "Lo que estoy pensando"],
  };

  if (intent === "decide" && continuedIntent) return {
    ...base,
    title: "Ya apareció información nueva para la decisión",
    insight: "Lo que acabas de agregar funciona como un criterio, no como un detalle menor. Ahora conviene medir el beneficio real, el costo para ti y qué condición tendría que cumplirse para que la opción fuera sostenible.",
    steps: [
      { horizon: "Beneficio real", text: "Anota qué ganarías de forma concreta y durante cuánto tiempo ese beneficio tendría valor." },
      { horizon: "Costo y límite", text: "Nombra el costo que no quieres repetir y conviértelo en un límite observable: horas, disponibilidad, carga o fecha de salida." },
      { horizon: "Negociación", text: "Antes de elegir entre sí o no, revisa si existe una tercera opción: aceptar con alcance menor, otra fecha o condiciones claras." },
    ],
    question: "¿Qué condición tendría que respetarse para que aceptar no signifique descuidarte otra vez?",
    choices: ["Definir un límite", "Negociar condiciones", "Decir que no"],
  };

  if (intent === "decide") return {
    ...base,
    title: "Tomemos una decisión suficientemente buena, no una decisión perfecta",
    insight: "La claridad suele aparecer cuando hacemos visibles los criterios y el costo de no decidir, no cuando pensamos la misma pregunta muchas veces.",
    steps: [
      { horizon: "Opciones", text: "Escribe las dos o tres opciones reales. Incluye 'no decidir todavía' solo si de verdad es posible." },
      { horizon: "Criterios", text: "Elige tres criterios: seguridad, tiempo, dinero, bienestar, aprendizaje o impacto en otras personas." },
      { horizon: "Prueba pequeña", text: "Si la decisión es reversible, prueba la opción más prometedora en una versión pequeña y define cuándo la revisarás." },
    ],
    question: "¿Cuáles son las opciones que estás comparando y qué criterio no quieres sacrificar?",
    choices: ["Comparar dos opciones", "Definir mis criterios", "Pensar en riesgos"],
  };

  if (intent === "plan") return {
    ...base,
    title: "Convirtamos esto en un plan que sí puedas empezar",
    insight: "Un plan útil tiene una meta observable, un primer paso pequeño y una salida para el obstáculo más probable. No necesita abarcar todo desde hoy.",
    steps: [
      { horizon: "Resultado", text: "Completa esta frase: 'Sabré que avancé cuando exista…'. Usa algo visible, no palabras como mejorar o terminar." },
      { horizon: "Primer paso", text: "Elige una acción de cinco a diez minutos que puedas hacer con lo que tienes ahora." },
      { horizon: "Plan alterno", text: "Anticipa el bloqueo más probable y decide una versión mínima: pedir ayuda, reducir la tarea o moverla a una hora concreta." },
    ],
    question: "¿Qué resultado necesitas conseguir y para cuándo? Con eso puedo ayudarte a hacerlo más específico.",
    choices: ["Definir el resultado", "Elegir el primer paso", "Preparar un plan alterno"],
  };

  if (intent === "write") return {
    ...base,
    title: "Preparemos un mensaje claro y respetuoso",
    insight: "Un buen mensaje puede ser breve: contexto, necesidad y petición concreta. No tienes que explicar toda la historia para que tu necesidad sea válida.",
    steps: [
      { horizon: "Contexto", text: "Empieza con un hecho breve: 'Quiero hablar de…' o 'Cuando ocurrió…'." },
      { horizon: "Necesidad", text: "Añade una frase en primera persona: 'Me sentí…' o 'Necesito…', sin adivinar la intención de la otra persona." },
      { horizon: "Petición", text: "Cierra con algo que la otra persona pueda aceptar, rechazar o negociar: hablar a cierta hora, darte espacio o confirmar información." },
    ],
    question: "¿A quién va dirigido, qué quieres que entienda y qué respuesta necesitas de esa persona?",
    choices: ["Que suene amable", "Que sea directo", "Poner un límite"],
  };

  if (intent === "regulate") return {
    ...base,
    mode: "support",
    title: "Primero bajemos un poco la intensidad; después decidimos",
    insight: "No hace falta quedar completamente en calma. Buscamos recuperar suficiente espacio para pensar y elegir el siguiente movimiento.",
    steps: [
      { horizon: "Entorno", text: "Apoya ambos pies o la espalda y ubica tres objetos de colores distintos a tu alrededor." },
      { horizon: "Cuerpo", text: "Suelta mandíbula y hombros. Exhala un poco más largo de lo que inhalas solo si se siente cómodo." },
      { horizon: "Siguiente minuto", text: "Elige una sola necesidad inmediata: agua, menos ruido, sentarte, salir del lugar o avisar a alguien." },
    ],
    question: "¿La intensidad está más en tu cuerpo, en tus pensamientos o en lo que está ocurriendo alrededor?",
    choices: ["En mi cuerpo", "En mis pensamientos", "En el entorno"],
  };

  if (intent === "question") return {
    ...base,
    title: "Puedo ayudarte a responderlo sin inventar información",
    insight: "En modo sin conexión puedo razonar con lo que compartes y con la biblioteca local. Si la respuesta depende de noticias, precios, leyes, horarios o datos actuales, te lo diré con claridad en vez de adivinar.",
    steps: [
      { horizon: "Qué necesitas", text: "Aclara si buscas una explicación, comparar opciones o decidir una acción." },
      { horizon: "Qué sabemos", text: "Separa la información que ya tienes de lo que todavía habría que verificar." },
      { horizon: "Respuesta útil", text: "Trabajemos con una conclusión provisional y dejemos marcado qué dato falta confirmar cuando recuperes conexión." },
    ],
    question: "¿Tu pregunta depende de información actual o podemos resolverla con el contexto que ya tienes?",
    choices: ["Con lo que ya sé", "Necesita datos actuales", "Ayúdame a aclararla"],
  };

  return {
    ...base,
    title: "Vamos a ordenar esto sin apresurarnos",
    insight: "Puedo acompañarte de tres maneras: darte espacio para contarlo, ayudarte a entender qué está pasando o convertirlo en un siguiente paso concreto.",
    steps: [
      { horizon: "Situación", text: "Ubica qué parte está ocurriendo ahora y qué parte pertenece a algo que temes que ocurra." },
      { horizon: "Prioridad", text: "Elige qué necesita atención primero: tu bienestar, una decisión, una conversación o una tarea concreta." },
      { horizon: "Siguiente paso", text: "Haz una acción suficientemente pequeña para poder revisarla después, en lugar de intentar resolver todo de una vez." },
    ],
    question: "¿Qué te ayudaría más ahora: sentirte escuchado, entenderlo mejor o salir con un plan?",
    choices: ["Solo quiero contarlo", "Ayúdame a entender", "Armemos un plan"],
  };
}
