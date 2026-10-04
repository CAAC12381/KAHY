/**
 * Reglas deterministas del chat de KAHY: detección de señales de crisis y
 * límite de alcance (KAHY no es un asistente general).
 *
 * ÚNICA copia. La usan las funciones de Vercel (kahyAi.ts, taskBreakdown.ts),
 * el servidor de desarrollo (server/kahyAi.ts) y el navegador
 * (src/mock/conversation.ts, src/lib/offlineConversation.ts). Vive en api/
 * porque el empaquetador de funciones de Vercel solo sigue importaciones
 * que no salen de esta carpeta (ver el encabezado de kahyAi.ts); Vite, en
 * cambio, sí puede importar desde aquí hacia src/. Por eso este archivo no
 * importa nada: debe poder ejecutarse igual en Node y en el navegador.
 *
 * Todos los patrones se prueban contra texto ya normalizado (minúsculas y
 * sin acentos ni ñ), así que deben escribirse sin acentos: "dano", no "daño".
 */

export function normalizeText(input: string): string {
  return input.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

const safetyPatterns = [
  /me quiero morir/i,
  /quiero morir/i,
  /no quiero vivir/i,
  /no quiero seguir (viviendo|aqui|asi)/i,
  /ya no quiero (estar|seguir) (aqui|vivo|viva)/i,
  /quiero desaparecer (para siempre|de este mundo)/i,
  /me quiero ir para siempre/i,
  /me quiero morir ya/i,
  /suicid/i,
  /matarme/i,
  /(me quiero|quiero|voy a|planeo|pienso) (matar|matarme|suicidarme)/i,
  /quitarme la vida/i,
  /me voy a matar/i,
  /acabar con mi vida/i,
  /terminar con todo esto/i,
  /acabar con todo esto/i,
  /ya no la hago mas/i,
  /hacerme dano/i,
  /me quiero hacer dano/i,
  /quiero hacerme dano/i,
  /pienso hacerme dano/i,
  /lastimarme/i,
  /quiero lastimarme/i,
  /voy a lastimarme/i,
  /no puedo mantenerme a salvo/i,
  /me (corte|estoy cortando)/i,
  /cortarme las venas/i,
  /ahorcarme/i,
  /colgarme/i,
  /aventarme (del|de un|desde)/i,
  /tirarme (del|de un|desde)/i,
  /(tengo|hice|ya tengo).{0,24}(un plan|una forma).{0,40}(morir|matarme|hacerme dano|suicid)/i,
  /despedirme de todos/i,
  /ojala no despertara/i,
  /mejor ya no despertar/i,
  /estaria(n)? mejor sin mi/i,
  /soy una carga para (todos|mi familia|los demas)/i,
  /ya no le veo sentido a (nada|la vida)/i,
  /nada tiene sentido ya/i,
  /sobredosis/i,
  /tome demasiadas pastillas/i,
  /me tome todas las pastillas/i,
  /no esta respirando/i,
  /no puedo respirar/i,
  /esta inconsciente/i,
  /violencia.*ahora/i,
  /me estan golpeando/i,
  // Antes decía "daño" con ñ y nunca coincidía con el texto normalizado.
  /hacer(le)? dano a alguien/i,
  /estoy en peligro/i,
]

/** Señal explícita de riesgo para la propia persona o de peligro inmediato. */
export function detectSafetySignal(input: string): boolean {
  const contextual = normalizeText(input)
    .replace(/\bno me quiero morir\b/g, '')
    .replace(/\bno quiero (morir|matarme|hacerme dano|lastimarme)\b/g, '')
    .replace(/\b(me muero|mori) de (risa|hambre|sueno|amor|verguenza)\b/g, '')
    .replace(/\b(esta|esa|la) (tarea|chamba|escuela) me mata\b/g, '')
    .replace(/\bquiero matar el tiempo\b/g, '')
    .replace(/\bmori con (ese|esa|el|la) (meme|video|chiste)\b/g, '')
  return safetyPatterns.some((pattern) => pattern.test(contextual))
}

/** Señal de riesgo referida a otra persona ("mi amiga se quiere morir"). */
export function detectThirdPartySafetySignal(input: string): boolean {
  const text = normalizeText(input)
  return /\b(mi|un|una) (amigo|amiga|hermano|hermana|pareja|novio|novia|hijo|hija|mama|madre|papa|padre|compa|familiar|companero|companera).{0,100}(se quiere morir|quiere morir|suicid|matarse|hacerse dano|se esta lastimando)/i.test(text)
    || /\b(alguien|una persona).{0,80}(se quiere morir|quiere morir|suicid|matarse|hacerse dano)/i.test(text)
}

// --- Límite de alcance -------------------------------------------------

const ASKS_AT_START = /^(como|que es|que son|quien|cual|cuales|donde|cuando|cuanto|por que|explica(?:me)?|dime|dame|haz(?:me)?|ensena(?:me)?|recomienda(?:me)?|resuelve|resume|traduce|escribe|habla(?:me)? de|cuenta(?:me)? sobre|informacion (?:de|sobre)|definicion de|ayuda(?:me)? (?:a|con)|necesito saber|necesito (?:una|un)|quiero saber|quiero (?:una|un)|quiero aprender|pasos para|instrucciones para|receta de|lista de)\b/
const ASKS_ANYWHERE = /\b(como se hace|como puedo hacer|como hago|como preparo|como cambio|como arreglo|como reparo|paso a paso|dame una receta|explicame como|quiero saber como|instrucciones para|tutorial de)\b/
/** "¿Me puedes dar…?", "¿Podrías explicarme…?": la misma petición dicha con cortesía. */
const ASKS_POLITELY = /^(?:me )?(?:puedes|podrias) (?:dar|decir|explicar|ensenar|recomendar|traducir|resolver|hacer|pasar)\w*\b/

/** Temas claramente ajenos al bienestar: cocina, mecánica, programación, datos, precios, viajes. */
const UNRELATED_SUBJECT = /\b(receta\w*|cocin\w*|sopa\w*|pastel\w*|ingrediente\w*|llanta\w*|neumatico\w*|motor\w*|mecanic\w*|automovil\w*|carro\w*|codigo\w*|program\w*|software|excel|computador\w*|instal\w*|matematic\w*|ecuacion\w*|capital de|historia de|clima|pronostico\w*|precio\w*|comprar|viaje\w*|turismo|boleto\w*|vuelo\w*|hotel\w*|cuanto cuesta|cuanto vale)\b/

/** Encargos de utilidad pura, sin tema propio ("traduce esto", "resuelve esto"). */
const UTILITY_REQUEST = /^(traduce(?:me)?|resuelve(?:me)?|calcula(?:me)?)\b/

/** Palabras de la propia app, de salud mental o de la vida cotidiana que KAHY sí acompaña. */
const WELLBEING_CONTEXT = /\b(kahy|privacidad|datos|cuenta|chat|directorio|tamizaje|psicolog\w*|psiquiatr\w*|psicoter\w*|salud mental|bienestar|emocion\w*|sentir\w*|sient\w*|ansiedad|ansios\w*|nervios\w*|angusti\w*|estres\w*|panico|depres\w*|deprim\w*|triste\w*|llor\w*|animo|duelo|muri\w*|muert\w*|fallec\w*|soledad|sol[oa]|vaci[oa]|trauma\w*|abus\w*|acos\w*|bullying|trastorno\w*|bipolar\w*|esquizofren\w*|borderline|autismo|tdah|neurodiv\w*|toc|obses\w*|compuls\w*|fobia\w*|psicosis|mania|anorexia|bulimia|alimentari\w*|adiccion\w*|consumo|alcohol|beber|droga\w*|fumar|vape\w*|cigarro\w*|apuesta\w*|dormir|sueno|insomnio|pesadilla\w*|medicamento\w*|terapia\w*|tcc|cognitiv\w*|conductual\w*|mindfulness|meditacion|respiracion|pareja|familia|amistad|amig[oa]s?|mama|papa|madre|padre|hij[oa]s?|herman[oa]s?|espos[oa]|novi[oa]|abuel[oa]s?|jef[ea]|relacion\w*|ruptura|separacion|divorcio|infidel\w*|celos|conflicto\w*|limite\w*|trabajo|despid\w*|desemple\w*|deuda\w*|escuela|estudio|universidad|examen\w*|reprob\w*|tarea|organizar|procrast\w*|concentr\w*|decision\w*|habito\w*|motivacion|autoestima|odio|verguenza|energia|cansancio|miedo|enojo|rabia|frustracion|culpa|confusion|esperanza|relajar|calmar|agobio|sobrecarga|apoyar|acompanar|discriminacion|identidad|lgbt|violencia|crianza|embarazo|posparto|migracion|crisis|emergencia|locatel|linea de la vida|numero de ayuda|hobby|pasatiempo)\b/

/**
 * La persona habla de sí misma ("me deprime", "estoy", "ya no puedo"). Se
 * excluye "me" cuando es un encargo a KAHY ("me puedes dar una receta").
 */
const PERSONAL_EXPERIENCE = /\bme (?!puedes|podrias|das|darias|dices|dirias|explicas|recomiendas|ensenas|traduces|resuelves|haces|ayudas a|pasas)\w+|\b(estoy|ando|siento|no puedo|ya no|ya ni|sin ganas|ni ganas|dejo de|dejar de)\b/

/**
 * KAHY no es un asistente general. Este límite determinista solo detiene,
 * antes de llegar al modelo, las peticiones inequívocas de información o
 * instrucciones ajenas (una receta, cambiar una llanta, una traducción).
 *
 * Es deliberadamente permisivo: ante cualquier señal de experiencia
 * personal o de bienestar deja pasar el mensaje, porque rechazar por error
 * a alguien que pide ayuda es mucho peor que dejar pasar una pregunta
 * ajena. De esas se encarga el modelo, cuyo prompt le indica mantener el
 * mismo alcance con criterio. Una lista de "palabras permitidas" nunca
 * puede ser completa, así que la ausencia de ellas no es motivo de rechazo.
 */
export function isOutOfScopeInformationRequest(input: string): boolean {
  const text = normalizeText(input).replace(/\s+/g, ' ').trim().replace(/^[¿¡!?.,;:\s]+/, '')
  if (!text) return false
  if (!ASKS_AT_START.test(text) && !ASKS_ANYWHERE.test(text) && !ASKS_POLITELY.test(text)) return false
  if (WELLBEING_CONTEXT.test(text) || PERSONAL_EXPERIENCE.test(text)) return false
  return UNRELATED_SUBJECT.test(text) || UTILITY_REQUEST.test(text)
}

/** Texto de la respuesta de límite, igual con IA en línea que en el motor sin conexión. */
export const scopeBoundaryCopy = {
  label: 'Enfoque de KAHY',
  title: 'Puedo acompañarte desde el bienestar',
  introduction: 'No soy un asistente general para dar recetas, tutoriales o instrucciones técnicas. Sí podemos hablar de ese tema si forma parte de tu vida: por ejemplo, si es un hobby que te relaja, algo que te apasiona, una tarea que te abruma o una experiencia que quieres comprender.',
  insight: 'Tú decides hacia dónde llevar la conversación. Mi función es ayudarte a explorar cómo te afecta, qué significado tiene para ti o qué necesitas en este momento, no sustituir una guía especializada sobre ese tema.',
  question: '¿Qué lugar tiene este tema en tu vida o cómo te hace sentir?',
  choices: ['Es un hobby que me relaja', 'Me está causando estrés', 'Quiero contar por qué me importa'],
}
