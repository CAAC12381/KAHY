import type { MascotId } from "../types";

/**
 * "Lo que le dirías a alguien que quieres", con los compañeros (Compañeros en 3D).
 *
 * Ejercicio de autocompasión: un compañero cuenta algo pequeño que le pasó y
 * lo que se dijo a sí mismo; la persona lo consuela y luego esa misma frase
 * se le devuelve a ella. Se basa en el ejercicio "¿Cómo tratarías a un
 * amigo?" de la autocompasión (Kristin Neff).
 *
 * Cada compañero acompaña un tema distinto:
 * - Moka: los errores y sentir que no eres suficiente (escuela, trabajo, familia…).
 * - Pío: el miedo a pedir ayuda.
 * - Lima: cambiar (como su color) para caer bien y esconder lo que sientes.
 * - Tita: sentir que vas más lento que los demás.
 *
 * Cuando en el chat alguien cuenta algo parecido ("saqué malas
 * calificaciones", "no me atrevo a pedir ayuda"), detectMirrorTheme reconoce
 * el tema y el compañero de ese tema vive su versión de granja. Solo se
 * guarda el tema, nunca el texto.
 *
 * Reglas para escribir situaciones nuevas:
 * - Algo pequeño y cotidiano: nunca están enfermos, heridos ni descuidados.
 * - `thought` y `options` en neutro de género (sin "cansada", "tonto",
 *   "solo"…), porque después se le dicen a la persona, sea quien sea.
 * - Las opciones son todas buenas (no es un examen): validan, recuerdan que
 *   a todos nos pasa o cambian la mirada, sin minimizar lo que sintió.
 */

/** Quién acompaña el ejercicio y cómo se nombra ("escúchala" / "escúchalo"). */
export const mirrorCompanions: Record<MascotId, { name: string; object: "la" | "lo"; about: string }> = {
  vaca: { name: "Moka", object: "la", about: "A Moka le salió algo mal y se está tratando con dureza." },
  pollito: { name: "Pío", object: "lo", about: "A Pío le da pena pedir ayuda y prefiere batallar sin decir nada." },
  camaleon: { name: "Lima", object: "lo", about: "Lima cambia de color para caerle bien a todos y esconde cómo se siente." },
  tortuga: { name: "Tita", object: "la", about: "Tita siente que va más lento que los demás y se está tratando con dureza." },
};

export type MirrorTheme = "escuela" | "trabajo" | "familia" | "amistad" | "verguenza" | "comparacion" | "intento" | "ayuda" | "agradar" | "ritmo";

export const mirrorThemes: Record<MirrorTheme, { label: string; companion: MascotId; /** Completa "A {nombre}…": lo que le pasó, parecido a lo tuyo. */ teaser: string }> = {
  escuela: { label: "Escuela", companion: "vaca", teaser: "también le fue mal en un examen" },
  trabajo: { label: "Trabajo", companion: "vaca", teaser: "también se equivocó en su trabajo" },
  familia: { label: "Familia", companion: "vaca", teaser: "también sintió que decepcionó a su familia" },
  amistad: { label: "Amistades", companion: "vaca", teaser: "también le quedó mal a un amigo" },
  verguenza: { label: "Pena frente a otros", companion: "vaca", teaser: "también pasó una pena frente a todos" },
  comparacion: { label: "Compararme", companion: "vaca", teaser: "también se comparó con los demás" },
  intento: { label: "Algo que salió mal", companion: "vaca", teaser: "también le salió algo mal" },
  ayuda: { label: "Pedir ayuda", companion: "pollito", teaser: "también le da pena pedir ayuda" },
  agradar: { label: "Ser yo con los demás", companion: "camaleon", teaser: "también le pasa que cambia de color para caerle bien a todos" },
  ritmo: { label: "Mi propio ritmo", companion: "tortuga", teaser: "también siente que va más lento que los demás" },
};

export type MirrorSituation = {
  id: string;
  theme: MirrorTheme;
  /** Lo que le pasó, contado por el compañero. */
  story: string;
  /** Lo que se dijo a sí mismo (la voz crítica), sin comillas. */
  thought: string;
  /** Frases para elegir, en segunda persona: sirven para el compañero y para quien las lee. */
  options: [string, string, string];
  /** Lo que contesta el compañero cuando lo consuelan. */
  thanks: string;
};

export const mirrorSituations: MirrorSituation[] = [
  // --- Moka: los errores y sentir que no eres suficiente ---
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

  // --- Pío: el miedo a pedir ayuda ---
  {
    id: "nido",
    theme: "ayuda",
    story: "Quería subir al nido grande y no alcanzaba. Gallina estaba ahí, pero no le pedí ayuda y me quedé abajo toda la tarde.",
    thought: "Si pido ayuda, van a pensar que no puedo",
    options: [
      "Pedir ayuda no quiere decir que no puedas. Quiere decir que te importa lograrlo.",
      "A quien te quiere le gusta echarte la mano. No molestas por pedirla.",
      "Puedes empezar con algo pequeño, como decir: ¿me echas la mano tantito?",
    ],
    thanks: "¡Pío! Mañana le digo a Gallina: ¿me ayudas a subir? A lo mejor hasta me enseña a brincar más alto.",
  },
  {
    id: "semillas",
    theme: "ayuda",
    story: "En la escuelita no entendí cómo contar las semillas, pero me dio pena preguntar y lo hice todo mal.",
    thought: "Si pregunto, todos van a pensar que no entiendo nada",
    options: [
      "Preguntar es la forma más rápida de aprender. Para eso están los maestros.",
      "Seguro alguien más tenía la misma duda y no se animó a decirla.",
      "No entender algo a la primera es normal. Preguntar también es de valientes.",
    ],
    thanks: "Tienes razón… mañana levanto el ala y pregunto. ¡Pío!",
  },
  {
    id: "canasta",
    theme: "ayuda",
    story: "Quise cargar yo solito la canasta de maíz para no molestar a nadie, y se me cayó todo.",
    thought: "Prefiero no molestar a nadie",
    options: [
      "Pedir ayuda no es molestar. Entre varios, todo pesa menos.",
      "Tú también ayudas a otros. Dejar que te ayuden es parte de lo mismo.",
      "No tienes que poder con todo. Está bien repartir lo pesado.",
    ],
    thanks: "Je… la próxima le digo a Moka que me ayude. ¡Es fuertísima!",
  },

  // --- Lima: cambiar para caer bien y esconder lo que siente ---
  {
    id: "colores",
    theme: "agradar",
    story: "En la fiesta del estanque me cambié de color cinco veces para parecerme a cada quien. Al final ya no sabía de qué color era yo.",
    thought: "Si me ven como soy, no les voy a caer bien",
    options: [
      "Tu color de verdad también merece estar en la fiesta.",
      "Quien te quiere, te quiere en tu color.",
      "Está bien querer caer bien, pero no tienes que dejar de ser tú para lograrlo.",
    ],
    thanks: "Gracias… a la próxima fiesta voy de verde lima, que es mi color favorito.",
  },
  {
    id: "cerca",
    theme: "agradar",
    story: "Me pidieron que ayudara a pintar toda la cerca. Ya no podía más, pero dije que sí para que no se enojaran.",
    thought: "Si digo que no, se van a enojar conmigo",
    options: [
      "Decir que no a veces también es cuidarte.",
      "Puedes decir que no con cariño: hoy no puedo, otro día sí.",
      "Quien te quiere entiende que no siempre puedes.",
    ],
    thanks: "Tienes razón. La próxima digo: hoy no puedo, pero mañana les ayudo un ratito.",
  },
  {
    id: "amarillo",
    theme: "agradar",
    story: "Hoy me sentía azulito por dentro, pero me puse amarillo feliz para que nadie se diera cuenta.",
    thought: "Mejor finjo que estoy bien, nadie quiere ver mis colores tristes",
    options: [
      "Tus colores tristes también se valen. No tienes que esconderlos.",
      "Contarle a alguien cómo te sientes de verdad puede hacer todo más ligero.",
      "Puedes elegir a alguien de confianza y mostrarle tu color de hoy.",
    ],
    thanks: "Gracias… hoy estoy azulito, y está bien. A lo mejor mañana amanezco verde.",
  },

  // --- Tita: ir a su propio ritmo ---
  {
    id: "meta",
    theme: "ritmo",
    story: "En la carrera del huerto todos llegaron a la meta y yo apenas iba a la mitad.",
    thought: "Siempre voy atrás de todos",
    options: [
      "Llegar después no te quita el mérito de llegar.",
      "Cada quien tiene su paso. El tuyo también te lleva lejos.",
      "No es una carrera contra los demás. Es tu camino.",
    ],
    thanks: "Despacito y sin prisa… pero llegué. Y en el camino vi unas flores preciosas.",
  },
  {
    id: "casita",
    theme: "ritmo",
    story: "Todos terminaron su casita de hojas y yo todavía voy a la mitad de la mía.",
    thought: "Ya debería llevar más avance",
    options: [
      "Tu casita va a valer la pena aunque tardes más.",
      "Ir a tu ritmo también es avanzar.",
      "Puedes reconocer lo que ya hiciste, aunque todavía falte.",
    ],
    thanks: "Es cierto. Ya tengo las paredes; mañana pongo el techo, hojita por hojita.",
  },
  {
    id: "estanque",
    theme: "ritmo",
    story: "Mis amigas ya nadan en el estanque grande y yo todavía me quedo en la orilla.",
    thought: "Todos ya pudieron y yo no",
    options: [
      "Que otros ya puedan no quiere decir que tú no vayas a poder.",
      "Aprender a tu tiempo no te hace menos.",
      "Mira todo lo que ya aprendiste para llegar hasta la orilla.",
    ],
    thanks: "Gracias. Mañana me meto un poquito más, solo hasta donde me sienta tranquila.",
  },
];

/** Lo más largo que se puede escribir con tus palabras. */
export const MIRROR_TEXT_LIMIT = 280;

/** De qué compañero es una situación. */
export function companionOf(situation: MirrorSituation): MascotId {
  return mirrorThemes[situation.theme].companion;
}

/** Todas las situaciones de un compañero. */
export function situationsOf(companion: MascotId) {
  return mirrorSituations.filter((item) => companionOf(item) === companion);
}

/**
 * La frase que se le dijo al compañero, lista para devolvérsela a la
 * persona: sin el nombre del principio ("Moka, …") y con mayúscula.
 */
export function mirrorPhrase(text: string) {
  const clean = text.trim().replace(/\s+/g, " ").replace(/^(moka|p[ií]o|lima|tita)\s*[,:;.!¡]*\s*/i, "");
  return clean.charAt(0).toLocaleUpperCase("es-MX") + clean.slice(1);
}

/** Fecha local (AAAA-MM-DD): el compañero crece por practicar una vez al día. */
export function practiceDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// --- Del chat al compañero ------------------------------------------------------
// Se lee en el navegador, sin IA. Las frases de riesgo no llegan aquí (el chat las atiende antes con su
// ayuda), y "ser una carga" no se usa como señal: es una frase de riesgo, no de este ejercicio.

function normalize(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

// Temas de Pío, Lima y Tita: estas frases bastan por sí solas.
const OWN_THEMES: Array<[MirrorTheme, RegExp]> = [
  ["ayuda", /\b(me da (mucha )?(pena|miedo|verguenza) (pedir|preguntar)|no me atrevo a (pedir|preguntar)|no (quiero|quise) molestar|para no molestar|nunca pido ayuda|no pido ayuda|me cuesta (mucho )?pedir ayuda|no se pedir ayuda|prefiero hacerlo (yo )?sol[oa]|que pena preguntar)/],
  ["agradar", /\b(no (supe|pude|se) decir que no|dije que si aunque no|para que no se enoj(en|aran)|para caerles? bien|para encajar|finjo que estoy bien|hago como que estoy bien|me trago lo que siento|no digo lo que (siento|pienso)|escondo lo que siento|me cambio para (agradar|que me quieran|caer bien)|no me atrevo a decir(les?)? (lo que|que no))/],
  ["ritmo", /\b(voy (muy )?atrasad[oa]|me quede atras|todos van mas rapido|soy (muy )?lent[oa]|me tardo (mucho|demasiado)|todos ya (terminaron|acabaron|se graduaron|pudieron)|ya deberia (haber|tener|llevar)|a mi edad ya deberia|voy tarde en la vida|avanzo muy lento)/],
];

// Algo que salió mal. ("Perdí" no cuenta: también se dice de un duelo, y eso no es un error.)
const SETBACK = /\b(saque (una? )?(mala|malas|baja|bajas|bajo|[0-6])\b|reprob\w*|me fue (muy )?mal|me salio (todo )?mal|no me salio|me equivoque|la regue|la cague|meti la pata|se me olvido|me olvide|fracase|me rechazaron|no me (eligieron|aceptaron|quedo bien)|me corrieron|me despidieron|me rega(n|ñ)aron|quede mal|les? falle|decepcione|hice el ridiculo|se rieron|se burlaron)/;
// La voz crítica: lo que uno se dice a sí mismo cuando algo sale mal.
const SELF_CRITICAL = /\b(soy (un|una) (fracaso|fracasad[oa]|desastre|inutil|idiota|perdedor|perdedora)|soy (muy |bien )?(tont[oa]|torpe|burr[oa]|estupid[oa])|soy lo peor|no sirvo|no valgo|no soy (lo )?(suficiente|suficientemente)|nunca (hago|me sale) nada bien|nada me sale bien|todo me sale mal|siempre (lo )?arruino|siempre la (riego|cago)|me siento (un|una) (fracaso|fracasad[oa]|inutil)|que verguenza|me da (mucha )?verguenza)/;

// Temas de Moka: de qué se trata lo que salió mal.
const MOKA_THEMES: Array<[MirrorTheme, RegExp]> = [
  ["verguenza", /\b(enfrente de todos|frente a todos|delante de todos|se rieron|se burlaron|hice el ridiculo|que oso|verguenza|todos me vieron)/],
  ["comparacion", /\b(mejor que yo|mejores que yo|los demas (si|pueden|lo hacen)|todos (pueden|lo hacen|son mejores)|me comparo|compararme)/],
  ["familia", /\b(decepcione|les falle|se decepciono|se decepcionaron)\b.*\b(mama|papa|papas|padres|familia|herman[oa]s?|abuel[oa]s?)\b|\b(mama|papa|papas|padres|familia)\b.*\b(decepcion\w*|les falle)/],
  ["escuela", /\b(examen(es)?|calificacion(es)?|reprob\w*|materias?|escuela|prepa|secundaria|universidad|facultad|maestr[oa]s?|profes?|profesor[a]?|promedio|parcial(es)?|exposicion|semestre|puntaje|saque (un )?[0-6]\b)/],
  ["trabajo", /\b(trabajo|chamba|jef[ea]|oficina|clientes?|turno|empresa|negocio|me corrieron|me despidieron|entrevista)\b/],
  ["amistad", /\b(amig[oa]s?|cumpleanos|novi[oa]|pareja|le falle|quede mal con)\b/],
  ["familia", /\b(mama|papa|papas|padres|familia|herman[oa]s?|hij[oa]s?|abuel[oa]s?)\b/],
];

/**
 * Si el mensaje cuenta algo que este ejercicio puede acompañar (pedir ayuda,
 * cambiar para agradar, ir más lento, o algo que salió mal y la crítica a
 * uno mismo), devuelve su tema; si no, null.
 */
export function detectMirrorTheme(message: string): MirrorTheme | null {
  const text = normalize(message);
  const own = OWN_THEMES.find(([, words]) => words.test(text));
  if (own) return own[0];
  if (!SETBACK.test(text) && !SELF_CRITICAL.test(text)) return null;
  return MOKA_THEMES.find(([, words]) => words.test(text))?.[0] ?? "intento";
}

/** Las situaciones de un tema (si no hay, las de su compañero). */
export function situationsFor(theme: MirrorTheme) {
  const matching = mirrorSituations.filter((item) => item.theme === theme);
  return matching.length ? matching : situationsOf(mirrorThemes[theme].companion);
}
