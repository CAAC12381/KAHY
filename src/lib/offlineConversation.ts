import { emotionLabels, inferLocalEmotion } from "./emotionLexicon";
import type { ChatTopic, ConversationReply } from "../mock/conversation";
import type { AdaptiveHighlights } from "./personalization";
import { isOutOfScopeInformationRequest, scopeBoundaryCopy } from "../../api/_lib/chatGuards";

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

export function detectIntent(input: string): LocalIntent {
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
  const felt = acknowledgeFeeling(input, turnCount);
  if (felt) return felt;
  const emotion = inferLocalEmotion(input);
  if (emotion.primary === "no_clara" || emotion.primary === "neutral") {
    return stableChoice(input, turnCount, [
      "Te leo. Puedes contarlo como te salga, sin ordenarlo antes.",
      "Aquí estoy. No hace falta que lo expliques perfecto para que te entienda.",
      "Te sigo. Cuéntame un poco más, a tu ritmo.",
    ]);
  }
  const label = emotionLabels[emotion.primary].toLowerCase();
  return stableChoice(input, turnCount, [
    `Se nota ${label} en lo que cuentas, y tiene sentido que pese.`,
    `Hay ${label} en lo que escribes. No hace falta resolverlo todo ahorita para hablarlo.`,
  ]);
}

// "me siento / estoy / ando …": lo que sigue suele ser cómo se siente la persona, con sus palabras.
const FEELING_LEAD = /(?:^|[\s,.;¡¿])(?:me\s+siento|me\s+he\s+sentido|me\s+sent[ií]|me\s+estoy\s+sintiendo|estoy|ando|sigo|me\s+encuentro)\s+([^.,;:!?¿¡\n]{2,80})/iu;
// Se corta antes de causas, tiempos y personas ("triste desde hace días", "mal conmigo"): solo queda el sentir.
const FEELING_END = /\s+(?:desde|porque|pero|cuando|ya\s+que|por|con|conmigo|de|del|en|para|al?|hoy|hace|que|sin|y\s+(?:no|ya|me|nadie|todo|eso))\b/iu;
// Sentires frecuentes que el léxico emocional no nombra como emoción (raíces, sin acentos).
const EXTRA_FEELING_STEMS = ["fatal", "horrible", "pesim", "estresad", "preocupad", "hart", "desesperad", "deprimid", "desmotivad", "sin ganas", "de la fregada", "hecho pedazos", "hecha pedazos"];

// Desgano: "ya nada me importa", "todo me da igual"… suele llegar como pregunta y no nombra una emoción.
export const APATHY = /\b(?:(?:ya\s+)?nada\s+me\s+(?:importa|interesa|emociona|motiva|llena)|ya\s+no\s+me\s+importa\s+nada|todo\s+me\s+da\s+igual|me\s+da\s+igual\s+todo|no\s+tengo\s+ganas\s+de\s+nada)\b/;

/** "Siento mucho lo de tu abuela": la primera frase ante una pérdida, con la persona que nombró. */
export function acknowledgeLoss(input: string): string {
  const match = input.match(/(?:muri[oó]|falleci[oó]|se\s+nos\s+fue|perd[ií]\s+a)\s+(mis?)\s+(\p{L}+)/iu);
  if (!match) return "Siento mucho tu pérdida.";
  return `Siento mucho lo de ${match[1].toLowerCase() === "mis" ? "tus" : "tu"} ${match[2].toLowerCase()}.`;
}

function capturedFeeling(input: string): string | null {
  const raw = input.match(FEELING_LEAD)?.[1];
  if (!raw) return null;
  const feeling = raw.split(FEELING_END)[0].trim().replace(/\s+/g, " ");
  if (!feeling || feeling.length > 40) return null;
  const plain = normalize(feeling);
  const words = plain.split(" ");
  const known = inferLocalEmotion(feeling).primary !== "no_clara" || ["mal", "solo", "sola"].some((word) => words.includes(word)) || EXTRA_FEELING_STEMS.some((stem) => plain.includes(stem));
  return known && !/^(?:bien|mejor|tranquil[oa]|feliz)$/i.test(feeling) ? feeling.toLowerCase() : null;
}

function feelingDuration(input: string): { kind: "unit"; unit: string } | { kind: "phrase"; phrase: string } | null {
  const text = normalize(input);
  const unit = text.match(/(?:desde\s+)?hace\s+(?:unos\s+|varios\s+|muchos\s+|un\s+par\s+de\s+)?(dias|semanas|meses|anos)\b/)?.[1];
  if (unit) return { kind: "unit", unit: { dias: "días", semanas: "semanas", meses: "meses", anos: "años" }[unit] ?? unit };
  const whole = text.match(/\b(toda la semana|todo el mes|todo el dia|todo el ano)\b/)?.[1];
  if (whole) return { kind: "phrase", phrase: whole.replace("dia", "día").replace("ano", "año") };
  if (/\b(ultimamente|estos dias|cada vez mas)\b/.test(text)) return { kind: "phrase", phrase: "últimamente" };
  return null;
}

/**
 * Primera frase de una respuesta local a alguien que cuenta cómo se siente.
 * Repite SUS palabras ("muy triste y sola") en vez de etiquetarlas o
 * adivinar su género, y reconoce cuánto tiempo lleva así si lo dijo.
 * Devuelve null si el mensaje no dice cómo se siente.
 */
export function acknowledgeFeeling(input: string, turnCount = 0): string | null {
  const text = normalize(input);
  if (/\bno\s+(?:me\s+siento|estoy|ando)\s+(?:nada\s+)?bien\b/.test(text)) {
    return "Que no te sientas bien ya es razón suficiente para hablarlo, aunque todavía no sepas bien qué es.";
  }
  if (APATHY.test(text)) {
    return "Cuando nada parece importar, hasta preguntarse por qué cuesta trabajo. Esa sensación de vacío o desgano merece atención, no un regaño.";
  }
  const feeling = capturedFeeling(input);
  const duration = feelingDuration(input);
  if (feeling && duration?.kind === "unit") {
    return stableChoice(input, turnCount, [
      `Llevar ${duration.unit} sintiéndote ${feeling} es mucho que cargar.`,
      `${duration.unit.charAt(0).toUpperCase()}${duration.unit.slice(1)} sintiéndote ${feeling}… eso desgasta, y tiene sentido que quieras hablarlo.`,
    ]);
  }
  if (feeling && duration?.kind === "phrase") {
    return duration.phrase === "últimamente"
      ? `Sentirte ${feeling} últimamente es mucho que cargar.`
      : `Pasar ${duration.phrase} sintiéndote ${feeling} desgasta.`;
  }
  if (feeling) {
    return stableChoice(input, turnCount, [
      `Sentirte ${feeling} pesa, y qué bueno que lo dijiste aquí.`,
      `Gracias por contarme que te sientes ${feeling}; no siempre es fácil decirlo.`,
    ]);
  }
  const emotion = inferLocalEmotion(input);
  if (emotion.primary === "no_clara" || emotion.primary === "neutral") return null;
  const label = emotionLabels[emotion.primary].toLowerCase();
  return duration
    ? `Se nota ${label} en lo que cuentas, y no de ahora: eso merece atención sin prisa.`
    : `Se nota ${label} en lo que cuentas, y merece atención sin prisa.`;
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
    introduction: `${emotionalOpening(input, turnCount)}${adaptiveNote(intent, context)}`,
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

  if (isOutOfScopeInformationRequest(input)) return { ...base, ...scopeBoundaryCopy, steps: [] };

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
    title: "",
    insight: "",
    steps: [],
    question: "¿Qué te ayudaría más ahorita: contarlo con calma, entenderlo mejor o pensar en un siguiente paso?",
    choices: ["Solo quiero contarlo", "Ayúdame a entender", "Armemos un plan"],
  };
}
