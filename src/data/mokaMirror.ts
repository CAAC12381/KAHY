/**
 * "Lo que le dirías a alguien que quieres", con Moka (Compañeros en 3D).
 *
 * Ejercicio de autocompasión: Moka cuenta algo pequeño que le salió mal y
 * lo que se dijo a sí misma; la persona la consuela y luego esa misma frase
 * se le devuelve a ella. Se basa en el ejercicio "¿Cómo tratarías a un
 * amigo?" de la autocompasión (Kristin Neff). Tema de Moka: los errores y
 * sentir que no eres suficiente.
 *
 * Cada situación tiene un tema (escuela, trabajo, familia…). Cuando en el
 * chat alguien cuenta algo parecido ("saqué malas calificaciones"),
 * detectMirrorTheme reconoce el tema y Moka puede vivir su versión de
 * granja ("saqué el puntaje más bajo en el concurso"). Solo se guarda el
 * tema, nunca el texto.
 *
 * Reglas para escribir situaciones nuevas:
 * - Algo pequeño y cotidiano: Moka nunca está enferma, herida ni descuidada.
 * - `thought` y `options` en neutro de género (sin "cansada", "tonta"…),
 *   porque después se le dicen a la persona, sea quien sea.
 * - Las opciones son todas buenas (no es un examen): validan, recuerdan que
 *   a todos nos pasa o cambian la mirada, sin minimizar lo que sintió.
 */

export type MirrorTheme = "escuela" | "trabajo" | "familia" | "amistad" | "verguenza" | "comparacion" | "intento";

export const mirrorThemes: Record<MirrorTheme, { label: string; /** Completa "A Moka…": lo que le pasó, parecido a lo tuyo. */ teaser: string }> = {
  escuela: { label: "Escuela", teaser: "también le fue mal en un examen" },
  trabajo: { label: "Trabajo", teaser: "también se equivocó en su trabajo" },
  familia: { label: "Familia", teaser: "también sintió que decepcionó a su familia" },
  amistad: { label: "Amistades", teaser: "también le quedó mal a un amigo" },
  verguenza: { label: "Pena frente a otros", teaser: "también pasó una pena frente a todos" },
  comparacion: { label: "Compararme", teaser: "también se comparó con los demás" },
  intento: { label: "Algo que salió mal", teaser: "también le salió algo mal" },
};

export type MirrorSituation = {
  id: string;
  theme: MirrorTheme;
  /** Lo que le pasó, contado por Moka. */
  story: string;
  /** Lo que se dijo a sí misma (la voz crítica), sin comillas. */
  thought: string;
  /** Frases para elegir, en segunda persona: sirven para Moka y para quien las lee. */
  options: [string, string, string];
  /** Lo que contesta Moka cuando la consuelan. */
  thanks: string;
};

export const mirrorSituations: MirrorSituation[] = [
  {
    id: "corona",
    theme: "intento",
    story: "Llevaba toda la mañana haciéndote una corona de flores y, cuando ya casi estaba, se me deshizo.",
    thought: "Nunca me sale nada bien",
    options: [
      "Llevabas toda la mañana en eso. Que se deshiciera no borra lo que intentaste.",
      "Que una cosa salga mal no quiere decir que todo te salga mal.",
      "Es normal que te frustre. Puedes descansar tantito y volver a intentarlo cuando quieras.",
    ],
    thanks: "Gracias… sí la hice con mucho cariño. Otro día juntamos más flores.",
  },
  {
    id: "carrera",
    theme: "verguenza",
    story: "En la carrera del prado me tropecé enfrente de todos y se rieron.",
    thought: "Qué vergüenza, siempre hago el ridículo",
    options: [
      "A todos nos ha pasado tropezar enfrente de otros. No te hace menos.",
      "Una caída no dice quién eres. Dice que te animaste a correr.",
      "Seguro te dolió más la vergüenza que el golpe. Aquí estoy contigo.",
    ],
    thanks: "Es cierto, corrí con todas mis ganas. Ya me siento mejor.",
  },
  {
    id: "cumpleanos",
    theme: "amistad",
    story: "Se me olvidó el cumpleaños de Pío. Me acordé hasta en la noche.",
    thought: "Siempre lo arruino todo",
    options: [
      "Olvidar algo no quiere decir que no te importe. Que te sientas así muestra que sí te importa.",
      "Equivocarte en algo no te hace mala persona.",
      "Todavía puedes decirle que lo sientes y celebrarlo mañana.",
    ],
    thanks: "¡Tienes razón! Mañana le llevo una flor a Pío y le digo cuánto lo quiero.",
  },
  {
    id: "dibujo",
    theme: "comparacion",
    story: "Practiqué mucho para dibujar el prado y me quedó chueco. Los demás dibujan mucho mejor que yo.",
    thought: "Nunca voy a ser suficiente",
    options: [
      "Tu dibujo no tiene que ser perfecto para valer la pena.",
      "Compararte con los demás es injusto contigo: cada quien va a su ritmo.",
      "Practicaste mucho. Ese esfuerzo cuenta, aunque no haya quedado como esperabas.",
    ],
    thanks: "Gracias. Lo voy a colgar en el establo: chueco y todo, es mío.",
  },
  {
    id: "cubeta",
    theme: "intento",
    story: "Quise ayudar a regar el huerto y tiré la cubeta. Se mojó todo menos las plantas.",
    thought: "Mejor ya no intento ayudar, siempre la riego",
    options: [
      "Querías ayudar, y eso dice mucho de ti.",
      "Equivocarse es parte de aprender. Nadie aprende sin regarla tantito.",
      "Puedes reírte un poquito de esto y volver a intentarlo con calma.",
    ],
    thanks: "¡Je! Sí la regué, pero de verdad. Mañana lo intento con una cubeta más chiquita.",
  },
  {
    id: "concurso",
    theme: "escuela",
    story: "En el concurso de preguntas de la granja saqué el puntaje más bajo de todos.",
    thought: "Soy un fracaso",
    options: [
      "Un puntaje bajo habla de un examen, no de lo que vales.",
      "Un mal resultado es un mal día, no un fracaso para siempre.",
      "Puedes revisar qué se te complicó y prepararte con calma para la próxima.",
    ],
    thanks: "Tienes razón: fue un concurso, no todo lo que soy. La próxima estudio con Pío.",
  },
  {
    id: "examen",
    theme: "escuela",
    story: "Estudié toda la semana para el examen de la escuelita del prado y aun así reprobé.",
    thought: "Por más que me esfuerzo, no me alcanza",
    options: [
      "Que hayas estudiado toda la semana dice mucho de ti, aunque el resultado no se notara.",
      "Reprobar un examen no borra lo que sí aprendiste.",
      "Está bien que te duela. Puedes pedir ayuda con lo que se te complicó.",
    ],
    thanks: "Gracias… mañana le pregunto a la maestra Gallina lo que no entendí.",
  },
  {
    id: "corral",
    theme: "trabajo",
    story: "Hoy me tocaba repartir el pasto y me equivoqué de corral. El granjero tuvo que arreglarlo todo.",
    thought: "No sirvo para esto",
    options: [
      "Equivocarte en una tarea no quiere decir que no sirvas.",
      "Todos se equivocan en su trabajo a veces. Lo importante es que te diste cuenta.",
      "Puedes contar qué pasó y aprender cómo hacerlo distinto la próxima vez.",
    ],
    thanks: "Es cierto. Mañana pregunto bien cuál corral es cuál.",
  },
  {
    id: "liston",
    theme: "familia",
    story: "Mi mamá tenía muchas ganas de que ganara el listón de la feria y quedé en último lugar.",
    thought: "Siempre decepciono a todos",
    options: [
      "No ganar un listón no es lo mismo que decepcionar a quien te quiere.",
      "Que te importe lo que siente muestra cuánto la quieres.",
      "Lo que vales no depende de ganar. Puedes contarle cómo te sentiste.",
    ],
    thanks: "Gracias. Voy a contarle cómo me sentí; quizás me entiende más de lo que creo.",
  },
];

/** Lo más largo que se puede escribir con tus palabras. */
export const MIRROR_TEXT_LIMIT = 280;

/**
 * La frase que se le dijo a Moka, lista para devolvérsela a la persona:
 * sin el "Moka," del principio y empezando con mayúscula.
 */
export function mirrorPhrase(text: string) {
  const clean = text.trim().replace(/\s+/g, " ").replace(/^moka\s*[,:;.!¡]*\s*/i, "");
  return clean.charAt(0).toLocaleUpperCase("es-MX") + clean.slice(1);
}

/** Fecha local (AAAA-MM-DD): el compañero crece por practicar una vez al día. */
export function practiceDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// --- Del chat a Moka -----------------------------------------------------------
// Se lee en el navegador, sin IA: si un mensaje cuenta algo que salió mal o una crítica a uno mismo,
// se reconoce el tema. Las frases de riesgo no llegan aquí (el chat las atiende antes con su ayuda).

function normalize(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

// Algo que salió mal. ("Perdí" no cuenta: también se dice de un duelo, y eso no es un error.)
const SETBACK = /\b(saque (una? )?(mala|malas|baja|bajas|bajo|[0-6])\b|reprob\w*|me fue (muy )?mal|me salio (todo )?mal|no me salio|me equivoque|la regue|la cague|meti la pata|se me olvido|me olvide|fracase|me rechazaron|no me (eligieron|aceptaron|quedo bien)|me corrieron|me despidieron|me rega(n|ñ)aron|quede mal|les? falle|decepcione|hice el ridiculo|se rieron|se burlaron)/;
// La voz crítica: lo que uno se dice a sí mismo cuando algo sale mal.
const SELF_CRITICAL = /\b(soy (un|una) (fracaso|fracasad[oa]|desastre|inutil|idiota|perdedor|perdedora)|soy (muy |bien )?(tont[oa]|torpe|burr[oa]|estupid[oa])|soy lo peor|no sirvo|no valgo|no soy (lo )?(suficiente|suficientemente)|nunca (hago|me sale) nada bien|nada me sale bien|todo me sale mal|siempre (lo )?arruino|siempre la (riego|cago)|me siento (un|una) (fracaso|fracasad[oa]|inutil)|que verguenza|me da (mucha )?verguenza)/;

const THEME_WORDS: Array<[MirrorTheme, RegExp]> = [
  ["verguenza", /\b(enfrente de todos|frente a todos|delante de todos|se rieron|se burlaron|hice el ridiculo|que oso|verguenza|todos me vieron)/],
  ["comparacion", /\b(mejor que yo|mejores que yo|los demas (si|pueden|lo hacen)|todos (pueden|lo hacen|son mejores)|me comparo|compararme)/],
  ["familia", /\b(decepcione|les falle|se decepciono|se decepcionaron)\b.*\b(mama|papa|papas|padres|familia|herman[oa]s?|abuel[oa]s?)\b|\b(mama|papa|papas|padres|familia)\b.*\b(decepcion\w*|les falle)/],
  ["escuela", /\b(examen(es)?|calificacion(es)?|reprob\w*|materias?|escuela|prepa|secundaria|universidad|facultad|maestr[oa]s?|profes?|profesor[a]?|promedio|parcial(es)?|exposicion|semestre|puntaje|saque (un )?[0-6]\b)/],
  ["trabajo", /\b(trabajo|chamba|jef[ea]|oficina|clientes?|turno|empresa|negocio|me corrieron|me despidieron|entrevista)\b/],
  ["amistad", /\b(amig[oa]s?|cumpleanos|novi[oa]|pareja|le falle|quede mal con)\b/],
  ["familia", /\b(mama|papa|papas|padres|familia|herman[oa]s?|hij[oa]s?|abuel[oa]s?)\b/],
];

/**
 * Si el mensaje cuenta algo que salió mal o una crítica a uno mismo, devuelve
 * su tema (para que Moka viva algo parecido); si no, null.
 */
export function detectMirrorTheme(message: string): MirrorTheme | null {
  const text = normalize(message);
  if (!SETBACK.test(text) && !SELF_CRITICAL.test(text)) return null;
  return THEME_WORDS.find(([, words]) => words.test(text))?.[0] ?? "intento";
}

/** Las situaciones de un tema (si no hay, las de "algo que salió mal"). */
export function situationsFor(theme: MirrorTheme) {
  const matching = mirrorSituations.filter((item) => item.theme === theme);
  return matching.length ? matching : mirrorSituations.filter((item) => item.theme === "intento");
}
