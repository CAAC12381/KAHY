import type { ChatTopic, ConversationReply } from "../mock/conversation";
import type { EmotionInsight } from "../types";
import { inferLocalEmotion } from "./emotionLexicon";

/**
 * Situaciones concretas que el motor local reconoce antes de caer en las
 * tarjetas por tema (sin internet o cuando la IA en línea está saturada).
 *
 * Por qué existe: el 28 de octubre de 2026, sin IA, "mi jefe me gritó
 * enfrente de todos", "ando bien agüitado", "soy un fracaso" y "cuido a mi
 * mamá, trabajo y estudio" recibían la misma respuesta ("Vamos a ordenar esto
 * sin apresurarnos" con los mismos tres pasos); "me encanta dibujar, me relaja
 * cuando estoy estresada" recibía ejercicios de respiración; "mi novia me
 * terminó" se trataba como un pleito ("¿es un conflicto puntual?"); y "esta
 * tarea me mata jaja pero ya casi acabo" recibía un plan contra el bloqueo.
 *
 * Reglas (las mismas del prompt de la IA en línea): responder a lo que la
 * persona dijo, acompañar antes de aconsejar, una sola pregunta, opciones
 * escritas como las diría la persona, sin "Entiendo que" ni "es normal", sin
 * adivinar su género y sin citar textual sus mensajes.
 */

export type SituationContext = { recentUserMessages?: string[]; turnCount?: number };

type Situation = {
  id: string;
  matches: (text: string, context: SituationContext) => boolean;
  reply: (input: string, text: string, previousTopic: ChatTopic, context: SituationContext) => ConversationReply;
};

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function pick(input: string, turnCount: number, options: string[]) {
  const score = [...input].reduce((total, character) => total + character.charCodeAt(0), turnCount * 17);
  return options[Math.abs(score) % options.length];
}

function emotionOf(input: string, fallback?: Partial<EmotionInsight>): EmotionInsight {
  const read = inferLocalEmotion(input);
  if (read.primary !== "no_clara" || !fallback) return read;
  return { primary: "no_clara", detail: "", intensity: "media", progress: "expresó", confidence: "media", ...fallback } as EmotionInsight;
}

function talk(base: Omit<ConversationReply, "mode" | "presentation" | "sourceIds" | "steps" | "label"> & Partial<ConversationReply>): ConversationReply {
  return { mode: "support", presentation: "conversation", label: "Te escucho", sourceIds: [], steps: [], openHelp: false, ...base };
}

/** Lo que la persona escribió antes en esta conversación (para entender un "no sé" o un "ya lo intenté"). */
function earlier(context: SituationContext) {
  return normalize((context.recentUserMessages ?? []).join(" \n "));
}

const PHONE = /\b(celular|cel|telefono|redes|tiktok|instagram|insta|facebook|youtube|reels)\b/;
const HOBBY_ACTIVITY = /\b(dibuj\w*|pint\w*|leer|lectura|libros?|escrib\w*|tej\w*|cocin\w*|hornear|reposteria|bail\w*|cant\w*|toc\w* (la|el) \w+|musica|guitarra|piano|correr|caminar|nadar|futbol|basquet|ejercicio|gym|yoga|jardin\w*|plantas|videojuegos|jugar|fotograf\w*|manualidades|armar|series|anime|peliculas)\b/;

const situations: Situation[] = [
  {
    // "Hoy me fue mejor", "ya me siento mejor": se celebra y se pregunta qué ayudó.
    id: "mejoria",
    matches: (text) => /\b(hoy (me fue|estuve|amaneci|me siento|me senti) (mucho |un poco |algo )?mejor|ya (me siento|estoy|ando) (mucho |un poco |algo )?mejor|me fue (mucho |un poco )?mejor|hoy fue un (buen|mejor) dia)\b/.test(text) && !/\bno (me fue|me siento|estoy|ando) mejor\b/.test(text),
    reply: (input, text, previousTopic, context) => talk({
      label: "Un mejor día",
      topic: previousTopic === "inicio" || previousTopic === "seguridad" ? "conversación" : previousTopic,
      title: "",
      introduction: `${pick(input, context.turnCount ?? 0, ["¡Qué gusto leer eso! Que hoy te fuera mejor también cuenta, aunque no todo esté resuelto.", "Me alegra mucho que hoy haya sido un mejor día. Esos días también vale la pena notarlos."])}${/\bgracias\b/.test(text) ? " Y gracias a ti por volver a contarme." : ""}`,
      insight: "",
      question: "¿Qué crees que hizo la diferencia?",
      choices: ["Hice algo distinto", "Hablé con alguien", "Solo fue un mejor día"],
      emotion: { primary: "alivio", detail: "un día mejor que los anteriores", intensity: "media", progress: "expresó", confidence: "media" },
    }),
  },
  {
    // Un hobby que hace bien: curiosidad por la actividad, no ejercicios de calma.
    id: "hobby",
    matches: (text) => /\b(me encanta|me gusta mucho|me fascina|disfruto (mucho )?|amo)\b/.test(text) && HOBBY_ACTIVITY.test(text) && !/\b(ya no|no me) (me )?(gusta|encanta|disfruto)\b/.test(text),
    reply: (input, text, _previousTopic, context) => {
      const activity = input.match(/(?:me encanta|me gusta mucho|me fascina|disfruto(?: mucho)?|amo)\s+([^,.;!?]{2,40}?)(?=\s*(?:,|\.|;|!|\?|$|\s+y\s|\s+porque|\s+me\s|\s+cuando))/iu)?.[1]?.trim();
      const helps = /\b(me relaja|me calma|me ayuda|me despeja|me distrae|me hace sentir bien|me desestresa|me quita el estres)\b/.test(text);
      const named = activity ? `${activity.charAt(0).toUpperCase()}${activity.slice(1)}` : "Eso";
      return talk({
        mode: "standard",
        label: "Lo que te hace bien",
        topic: "conversación",
        title: "",
        introduction: helps
          ? `¡Qué bueno tener algo así! ${named} suena a un lugar donde bajas el ritmo, y usarlo cuando las cosas aprietan es una forma de cuidarte que encontraste tú.`
          : pick(input, context.turnCount ?? 0, [`¡Qué padre! ${named} dice mucho de lo que disfrutas.`, `Me encanta que tengas algo así. ${named} suena a algo que te llena.`]),
        insight: "",
        question: activity ? `¿Qué es lo que más disfrutas de ${activity.toLowerCase()}?` : "¿Qué es lo que más disfrutas de eso?",
        choices: ["Me ayuda a desconectarme", "Quiero hacerlo más seguido", "Te cuento qué hago"],
        emotion: { primary: helps ? "calma" : "alegría", detail: "una actividad que disfruta", intensity: "media", progress: "identificó", confidence: "media" },
      });
    },
  },
  {
    // "Esta tarea me mata jaja pero ya casi acabo": broma y recta final, no un plan contra el bloqueo.
    id: "recta-final",
    matches: (text) => /\b(ya casi (acabo|termino|lo acabo|lo termino|la acabo|la termino)|ya me falta poco|ya mero (acabo|termino))\b/.test(text),
    reply: () => talk({
      mode: "standard",
      label: "Recta final",
      topic: "organización",
      title: "",
      introduction: "¡Ya casi! La recta final a veces es la más pesada, justo porque ya vienes con el cansancio de todo lo anterior.",
      insight: "",
      question: "¿Te late una pausa cortita o prefieres terminar de un jalón?",
      choices: ["De un jalón", "Una pausa cortita", "Solo quería quejarme tantito"],
      emotion: { primary: "cansancio", detail: "cansancio de la recta final de una tarea", intensity: "suave", progress: "actuó", confidence: "media" },
    }),
  },
  {
    // Una ruptura es una pérdida, no un conflicto que haya que negociar.
    id: "ruptura",
    matches: (text) => /\b(me termino|me terminaron|me corto|me dejo (mi |el |la )?(novi[oa]|pareja|esposo|esposa|chava|chavo)|terminamos|rompimos|tronamos|cortamos|ya no estamos juntos|nos separamos|me separe)\b/.test(text),
    reply: (input) => {
      const recent = /\b(hace (unos |un par de )?(dias|una semana|poco|dos semanas)|ayer|esta semana|apenas)\b/.test(normalize(input));
      return talk({
        label: "Una ruptura",
        topic: "relaciones",
        title: "",
        introduction: `${recent ? "Una ruptura duele mucho, y más cuando está tan reciente." : "Una ruptura duele, aunque pase el tiempo."} Pensar en esa persona una y otra vez es parte de cómo se procesa una pérdida; no quiere decir que estés haciendo algo mal.`,
        insight: "",
        question: "¿Qué es lo que más te pega ahorita?",
        choices: ["Extraño a esa persona", "Me duele cómo terminó", "No sé qué sigue"],
        steps: [
          { horizon: "Hoy", text: "Date permiso de extrañar. Si revisar sus redes te deja peor, silencia sus publicaciones por un tiempo; no tienes que bloquear a nadie para cuidarte." },
          { horizon: "Esta semana", text: "Busca a una persona con quien puedas hablarlo sin que te diga que ya lo superes." },
          { horizon: "Si se alarga", text: "Si después de varias semanas sigues sin poder dormir, comer o hacer tus cosas, vale la pena hablarlo con un profesional." },
        ],
        emotion: emotionOf(input, { primary: "tristeza", detail: "tristeza por una ruptura reciente" }),
      });
    },
  },
  {
    // Quedarse sin palabras ante un grito o una humillación.
    id: "sin-palabras",
    matches: (text) => /\b(me quede callad[oa]|no (le )?(dije|conteste|respondi) nada|me congele|me quede en blanco|me quede (helad[oa]|paralizad[oa])|no supe (que|como) (decir|responder|contestar|reaccionar))\b/.test(text),
    reply: (input, _text, previousTopic) => talk({
      label: "Quedarse sin palabras",
      topic: previousTopic === "inicio" || previousTopic === "seguridad" ? "conversación" : previousTopic,
      title: "",
      introduction: "Quedarte sin palabras en ese momento no te hace débil. Cuando algo así te toma por sorpresa, el cuerpo a veces se congela para protegerte, y después la mente se llena de todo lo que \"debiste\" decir.",
      insight: "",
      question: "Si pudieras volver a ese momento, ¿qué te hubiera gustado decir?",
      choices: ["Te digo lo que quería decir", "Me da coraje conmigo", "Qué hago si vuelve a pasar"],
      emotion: emotionOf(input, { primary: "frustración", detail: "frustración por no haber respondido" }),
    }),
  },
  {
    // Que te griten, te humillen o te regañen enfrente de otros.
    id: "humillacion",
    matches: (text) => /\b(me (grito|gritaron|humillo|humillaron|exhibio|exhibieron|insulto|insultaron|hablo feo|hablaron feo|regano|reganaron))\b/.test(text),
    reply: (input, text) => {
      const plural = /\bme (gritaron|humillaron|exhibieron|insultaron|hablaron feo|reganaron)\b/.test(text);
      const who = text.match(/\bmi (jefe|jefa|maestro|maestra|profe|profesor|profesora|supervisor|supervisora|mama|papa|pareja|novio|novia|esposo|esposa|hermano|hermana|suegra|suegro|coordinador|coordinadora)\b/)?.[1];
      const verb = text.match(/\bme (grit|humill|exhib|insult|hablo feo|hablaron feo|reg)/)?.[1] ?? "grit";
      const forms: Record<string, [string, string]> = { grit: ["gritara", "gritaran"], humill: ["humillara", "humillaran"], exhib: ["exhibiera", "exhibieran"], insult: ["insultara", "insultaran"], "hablo feo": ["hablara feo", "hablaran feo"], "hablaron feo": ["hablara feo", "hablaran feo"], reg: ["regañara", "regañaran"] };
      const [singular, many] = forms[verb] ?? forms.grit;
      const accents: Record<string, string> = { mama: "mamá", papa: "papá" };
      const subject = who && !plural ? `que tu ${accents[who] ?? who} te ${singular}` : `que te ${many}`;
      const inFront = /\b(enfrente de|frente a|delante de) (todos|todo el mundo|mis companeros|la gente|los demas|la clase|el equipo)\b|\ben (la junta|la reunion|clase|publico)\b/.test(text);
      const close = who && ["pareja", "novio", "novia", "esposo", "esposa"].includes(who);
      const said = who && !plural ? "te dijo" : "te dijeron";
      return talk({
        label: "Lo que pasó",
        topic: close ? "relaciones" : "estrés",
        title: "",
        introduction: `${subject.charAt(0).toUpperCase()}${subject.slice(1)}${inFront ? " enfrente de los demás" : ""} no es poca cosa${inFront ? `: además de lo que ${said}, pesa que otros lo vieran.` : ". Duele, y además deja la sensación de no haber podido hacer nada."}`,
        insight: close ? "Si esto pasa seguido o te da miedo, ya no es solo un mal día: hablarlo con alguien de confianza o con un servicio de apoyo puede ayudarte a ver opciones." : "",
        question: "¿Qué es lo que más te está pesando ahorita?",
        choices: [who && !plural ? "Lo que me dijo" : "Lo que me dijeron", inFront ? "Que lo vieran los demás" : "Cómo me lo dijeron", "Que no supe qué hacer"],
        emotion: emotionOf(input, { primary: "frustración", detail: "malestar por un trato humillante" }),
      });
    },
  },
  {
    // La voz crítica ("siempre me pasa", "nunca sé defenderme", "soy un fracaso").
    id: "autocritica",
    matches: (text) => /\b(siempre me pasa|nunca se (defenderme|decir que no|poner limites)|nunca puedo|nunca hago nada bien|nada me sale bien|todo me sale mal|siempre la riego|siempre lo arruino|soy un fracaso|me siento (un|una) fracas\w*|no sirvo|soy un desastre|no soy (lo )?(suficiente|suficientemente)|no valgo)\b/.test(text),
    reply: (input, text) => {
      const limits = /\b(defender(me)?|decir que no|poner limites)\b/.test(text);
      const comparing = /\b(todos (mis amigos|mis companeros|los demas)? ?ya|los demas ya|mis amigos ya)\b/.test(text);
      const job = /\b(trabajo|chamba|empleo|buscando)\b/.test(text);
      const opening = limits
        ? "Que te haya pasado varias veces no quiere decir que no puedas aprenderlo: defenderte y poner límites es algo que se practica, no algo con lo que se nace."
        : comparing && job
          ? "Buscar trabajo mientras ves que a otros ya les salió es muy pesado: cada día sin respuesta se siente personal, aunque no lo sea."
          : comparing
            ? "Compararte con quienes parecen ir más adelante es de las cosas que más duelen, sobre todo porque solo ves su resultado y no su camino."
            : "Cuando algo sale mal, es fácil llegar a una conclusión muy dura sobre ti.";
      return talk({
        label: "Esa voz tan dura",
        topic: job ? "estrés" : "ánimo",
        title: "",
        introduction: `${opening} Esa voz suena muy convincente, pero casi nunca cuenta la historia completa de quién eres.`,
        insight: "",
        question: "Si esto le estuviera pasando a alguien que quieres, ¿qué le dirías?",
        choices: ["No sé qué le diría", "Que no es su culpa", "Me cuesta ser así conmigo"],
        emotion: emotionOf(input, { primary: "frustración", detail: "autocrítica tras algo que salió mal" }),
      });
    },
  },
  {
    // Cuidar a alguien y cargar con todo ("si paro, todo se cae").
    id: "sobrecarga",
    matches: (text) => /\b(cuido a mi|la cuido|lo cuido|cuidando a mi|cuidar a mi (mama|papa|abuel\w+|herman\w+|hij\w+))\b/.test(text) || (/\b(no tengo tiempo (ni )?para mi|si paro (todo )?se cae|no me da la vida|no me alcanza el dia)\b/.test(text) && /\b(trabaj\w*|escuela|uni|universidad|estudio|casa|cuid\w*)\b/.test(text)),
    reply: (input, text) => {
      const caring = /\b(cuido|cuidando|cuidar)\b/.test(text);
      return talk({
        label: "Mucho para una sola persona",
        topic: "estrés",
        title: "",
        introduction: `${caring ? "Cuidar a alguien que quieres mientras sostienes todo lo demás es muchísimo para una sola persona." : "Lo que estás sosteniendo es muchísimo para una sola persona."} Que sientas que no haces nada bien habla de cuánto estás cargando, no de que lo estés haciendo mal.`,
        insight: "",
        question: caring ? "¿Hay alguien que pueda compartir contigo algo del cuidado, aunque sea un poco?" : "¿Hay algo de todo esto que alguien más podría tomar, aunque sea un poco?",
        choices: ["No tengo a nadie", "Sí, pero me cuesta pedirlo", "Quiero ordenar mi semana"],
        steps: [
          { horizon: "Esta semana", text: "Elige una sola cosa que puedas soltar o hacer \"suficientemente bien\" en lugar de perfecto." },
          { horizon: "Apoyo", text: "Piensa en una persona o servicio que pueda cubrirte unas horas, aunque sea una vez. Pedirlo no es abandonar a nadie." },
          { horizon: "Para ti", text: "Diez minutos que sean solo tuyos también cuentan; no tienes que ganártelos." },
        ],
        emotion: emotionOf(input, { primary: "agobio", detail: "sobrecarga de responsabilidades" }),
      });
    },
  },
  {
    // Exámenes: un plan de estudio concreto, no el de "la tarea es ambigua".
    id: "examenes",
    matches: (text) => /\bexamen(es)?\b/.test(text) && /\b(no he estudiado|organizar(me)?|ayudame|estudiar|no se por donde|que hago)\b/.test(text),
    reply: (input, text) => {
      const count = text.match(/\b(\d+|dos|tres|cuatro|cinco) examenes\b/)?.[1];
      return {
        mode: "standard",
        presentation: "guided",
        label: "Plan de estudio",
        topic: "organización",
        title: "Saquemos el máximo del tiempo que queda",
        introduction: `Tener ${count ? `${count} exámenes` : "varios exámenes"} encima${/\bno he estudiado\b/.test(text) ? " sin haber empezado a estudiar" : ""} asusta, pero todavía da tiempo de hacer algo útil si eliges bien dónde poner la energía.`,
        insight: "No hace falta estudiar todo de todo: lo que más ayuda es priorizar lo que más pesa y repasar poquito cada día.",
        steps: [
          { horizon: "Hoy (10 min)", text: "Anota los exámenes por fecha y, en cada uno, los dos o tres temas que más pesan." },
          { horizon: "Prioriza", text: "Empieza por el más cercano o el que más te preocupa. Uno a la vez." },
          { horizon: "Bloques", text: "Estudia 25 minutos y descansa 5, con el celular en otro cuarto. Tres bloques bien hechos rinden más que una tarde distraída." },
          { horizon: "Antes de dormir", text: "Repasa 10 minutos lo de ese día y duerme: el sueño ayuda a fijar lo que estudiaste." },
        ],
        question: "¿Cuál es el primer examen y qué día es?",
        choices: ["El primero es mañana", "Tengo un par de días", "No sé por dónde empezar"],
        sourceIds: [],
        emotion: emotionOf(input, { primary: "agobio", detail: "presión por exámenes" }),
      };
    },
  },
  {
    // "Eso ya lo intenté y no me sirve": no repetir lo mismo con otras palabras.
    id: "ya-lo-intente",
    matches: (text, context) => /\b(ya lo intente|ya lo hice|ya probe( eso)?|no me (sirve|sirvio|funciona|funciono)|eso no (sirve|funciona))\b/.test(text) && (context.recentUserMessages?.length ?? 0) > 0,
    reply: (input, text, previousTopic, context) => {
      const phone = PHONE.test(text) || PHONE.test(earlier(context));
      if (phone) {
        return {
          mode: "standard",
          presentation: "guided",
          label: "Otra forma",
          topic: previousTopic === "inicio" ? "organización" : previousTopic,
          title: "Si el celular te jala, ponle distancia",
          introduction: "Entonces no tiene caso repetirte lo mismo. Con el celular, la fuerza de voluntad sola casi nunca alcanza: está hecho para jalarte, así que ayuda más ponerle distancia que pelearte con él.",
          insight: "",
          steps: [
            { horizon: "Distancia", text: "Mientras estudias, deja el celular en otro cuarto o en modo avión. Al lado \"por si acaso\" no funciona." },
            { horizon: "Pausas sin pantalla", text: "Ten a la mano algo para el descanso que no sea el celular: agua, estirarte o asomarte a la ventana." },
            { horizon: "Compañía", text: "Estudia en llamada o junto a alguien, aunque cada quien haga lo suyo; ayuda a sostener la atención." },
          ],
          question: "¿Qué te jala más del celular: las notificaciones, las redes o el puro hábito de agarrarlo?",
          choices: ["Las notificaciones", "Las redes", "El hábito de agarrarlo"],
          sourceIds: [],
          emotion: emotionOf(input, { primary: "frustración", detail: "frustración porque lo intentado no funcionó" }),
        };
      }
      return talk({
        mode: "standard",
        label: "Otra forma",
        topic: previousTopic === "inicio" ? "conversación" : previousTopic,
        title: "",
        introduction: "Entonces no tiene caso repetirte lo mismo con otras palabras. Lo que no funcionó también da pistas de qué necesitas.",
        insight: "",
        question: "¿Qué pasó cuando lo intentaste?",
        choices: ["No me dio tiempo", "Lo dejé a medias", "No era para mí"],
        emotion: emotionOf(input, { primary: "frustración", detail: "frustración porque lo intentado no funcionó" }),
      });
    },
  },
  {
    // Un "no sé" corto: sin presión y con salidas fáciles.
    id: "no-se",
    matches: (text) => /^\s*(no se|nose|ni idea|no lo se|no se la verdad|la verdad no se|no se que decir|no se ni que decir)\s*[.!?…]*\s*$/.test(text),
    reply: (_input, _text, previousTopic) => talk({
      label: "Sin prisa",
      topic: previousTopic === "inicio" || previousTopic === "seguridad" ? "conversación" : previousTopic,
      title: "",
      introduction: "Está bien no saber. A veces lo que se siente todavía no tiene palabras, y no hay prisa por encontrarlas.",
      insight: "",
      question: "",
      choices: ["Prefiero seguir contando", "Necesito una pausa", "Ahorita no quiero hablar de eso"],
      emotion: { primary: "confusión", detail: "no sabe cómo ponerlo en palabras", intensity: "suave", progress: "expresó", confidence: "baja" },
    }),
  },
];

/** Si el mensaje cuenta una situación que el motor local sabe acompañar, su respuesta; si no, null. */
export function situationReply(input: string, previousTopic: ChatTopic, context: SituationContext = {}): ConversationReply | null {
  const text = normalize(input);
  const found = situations.find((situation) => situation.matches(text, context));
  return found ? found.reply(input, text, previousTopic, context) : null;
}

/** Para las pruebas: qué situación reconoce un mensaje. */
export function situationOf(input: string, context: SituationContext = {}): string | null {
  const text = normalize(input);
  return situations.find((situation) => situation.matches(text, context))?.id ?? null;
}
