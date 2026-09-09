import type { EmotionInsight, EmotionIntensity, EmotionName, EmotionalProgress } from "../types";

// Taxonomía compacta derivada del corpus sintético
// diccionario-ia-bienestar-es-mx v1.0.0. Conserva modismos mexicanos,
// pero nunca convierte una etiqueta lingüística en diagnóstico.
const signals: Array<{ emotion: EmotionName; words: string[] }> = [
  { emotion: "alegría", words: ["alegre", "feliz", "content", "emocionad", "qué padre", "que padre", "me fue muy bien", "me encanta", "de buenas"] },
  { emotion: "calma", words: ["calma", "tranquil", "en paz", "relajad", "seren", "ya bajó", "ya bajo"] },
  { emotion: "alivio", words: ["alivio", "me quité un peso", "me quite un peso", "por fin respir", "menos mal", "ya pasó", "ya paso"] },
  { emotion: "esperanza", words: ["esperanza", "tengo fe", "creo que puedo", "va a mejorar", "sí se puede", "si se puede", "ilusion"] },
  { emotion: "tristeza", words: ["triste", "agüitad", "aguitad", "aguitao", "bajón", "bajon", "depre", "desanim", "moral por los suelos", "se me cayó el mundo", "se me cayo el mundo", "quiero llorar", "vacío", "vacio"] },
  { emotion: "ansiedad", words: ["ansiedad", "ansios", "nervios", "inquiet", "no puedo dejar de pensar", "mente a mil", "me acelero", "traigo los nervios de punta"] },
  { emotion: "miedo", words: ["miedo", "temor", "asust", "pánico", "panico", "me da cosa", "me aterra", "tengo miedo"] },
  { emotion: "enojo", words: ["enoj", "coraje", "furios", "encabron", "hasta la madre", "me hierve", "me prende", "chingado"] },
  { emotion: "frustración", words: ["frustr", "impotencia", "no doy una", "ya valí", "ya vali", "no me sale", "haga lo que haga", "decepcion"] },
  { emotion: "culpa", words: ["culpa", "me arrepiento", "arrepent", "fue mi culpa", "me da vergüenza", "me da verguenza", "qué pena", "que pena"] },
  { emotion: "soledad", words: ["me siento solo", "me siento sola", "estoy solo", "estoy sola", "ando solo", "ando sola", "soledad", "nadie me pela", "nadie me entiende", "abandon", "rechaz", "me siento invisible"] },
  { emotion: "cansancio", words: ["cansad", "agotad", "hecho polvo", "hecha polvo", "sin energía", "sin energia", "fundid", "no me da la vida"] },
  { emotion: "confusión", words: ["confund", "hecho bolas", "hecha bolas", "no sé qué sentir", "no se que sentir", "ambival", "no entiendo qué me pasa", "no entiendo que me pasa"] },
  { emotion: "agobio", words: ["agobiad", "abrumad", "saturad", "todo me rebasa", "no puedo con todo", "me está llevando", "me esta llevando", "de la verga", "dlv", "del nabo", "para el perro", "valiendo madre"] },
  { emotion: "neutral", words: ["neutral", "ando equis", "me siento equis", "ni bien ni mal", "como cualquier día", "como cualquier dia"] },
];

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(normalize(word)));
}

function inferIntensity(text: string): EmotionIntensity {
  if (hasAny(text, ["muchísimo", "muchisimo", "demasiado", "insoportable", "muy fuerte", "no puedo más", "no puedo mas", "por completo", "totalmente"])) return "intensa";
  if (hasAny(text, ["un poco", "algo", "leve", "tantito", "más o menos", "mas o menos"])) return "suave";
  return "media";
}

function inferProgress(text: string): EmotionalProgress {
  const affirmative = text
    .replace(/\bno (necesito ayuda|quiero apoyo|pedi ayuda|hable con)\b/g, "")
    .replace(/\bno (logre|pude|hice|empece)\b/g, "")
    .replace(/\bno (voy a|quiero intentar|he decidido)\b/g, "");
  if (hasAny(affirmative, ["pedí ayuda", "pedi ayuda", "hablé con", "hable con", "necesito ayuda", "quiero apoyo", "acompañame", "acompáñame"])) return "pidió_apoyo";
  if (hasAny(affirmative, ["ya hice", "logré", "logre", "pude", "empecé", "empece", "hoy fui", "lo hablé", "lo hable"])) return "actuó";
  if (hasAny(affirmative, ["decidí", "decidi", "voy a", "quiero intentar", "mi siguiente paso", "he decidido"])) return "decidió";
  if (hasAny(text, ["me doy cuenta", "ahora entiendo", "creo que viene de", "pensándolo", "pensandolo", "quizá porque", "quiza porque"])) return "reflexionó";
  if (hasAny(text, ["me siento", "lo que siento", "esto es", "creo que es", "identifico", "reconozco"])) return "identificó";
  return "expresó";
}

export function inferLocalEmotion(input: string): EmotionInsight {
  const text = normalize(input);
  const found = signals.find((group) => hasAny(text, group.words));
  if (!found) return { primary: "no_clara", detail: "", intensity: "no_clara", progress: "sin_señal", confidence: "baja" };
  return {
    primary: found.emotion,
    detail: found.emotion === "neutral" ? "estado estable o sin una emoción dominante" : found.emotion,
    intensity: inferIntensity(text),
    progress: inferProgress(text),
    confidence: "media",
  };
}

export const emotionLabels: Record<EmotionName, string> = {
  alegría: "Alegría", calma: "Calma", alivio: "Alivio", esperanza: "Esperanza",
  tristeza: "Tristeza", ansiedad: "Ansiedad", miedo: "Miedo", enojo: "Enojo",
  frustración: "Frustración", culpa: "Culpa", soledad: "Soledad", cansancio: "Cansancio",
  confusión: "Confusión", agobio: "Agobio", neutral: "Neutral", no_clara: "Sin señal clara",
};

export function emotionTone(emotion: EmotionName): "sun" | "calm" | "heavy" | "alert" | "neutral" {
  if (["alegría", "alivio", "esperanza"].includes(emotion)) return "sun";
  if (["calma", "neutral"].includes(emotion)) return "calm";
  if (["enojo", "frustración", "agobio"].includes(emotion)) return "alert";
  if (["tristeza", "ansiedad", "miedo", "culpa", "soledad", "cansancio", "confusión"].includes(emotion)) return "heavy";
  return "neutral";
}
