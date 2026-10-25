/**
 * "Lo que le dirías a alguien que quieres", con Moka (Compañeros en 3D).
 *
 * Ejercicio de autocompasión: Moka cuenta algo pequeño que le salió mal y
 * lo que se dijo a sí misma; la persona la consuela y luego esa misma frase
 * se le devuelve a ella. Se basa en el ejercicio "¿Cómo tratarías a un
 * amigo?" de la autocompasión (Kristin Neff). Tema de Moka: los errores y
 * sentir que no eres suficiente.
 *
 * Reglas para escribir situaciones nuevas:
 * - Algo pequeño y cotidiano: Moka nunca está enferma, herida ni descuidada.
 * - `thought` y `options` en neutro de género (sin "cansada", "tonta"…),
 *   porque después se le dicen a la persona, sea quien sea.
 * - Las opciones son todas buenas (no es un examen): validan, recuerdan que
 *   a todos nos pasa o cambian la mirada, sin minimizar lo que sintió.
 */

export type MirrorSituation = {
  id: string;
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
    story: "Quise ayudar a regar el huerto y tiré la cubeta. Se mojó todo menos las plantas.",
    thought: "Mejor ya no intento ayudar, siempre la riego",
    options: [
      "Querías ayudar, y eso dice mucho de ti.",
      "Equivocarse es parte de aprender. Nadie aprende sin regarla tantito.",
      "Puedes reírte un poquito de esto y volver a intentarlo con calma.",
    ],
    thanks: "¡Je! Sí la regué, pero de verdad. Mañana lo intento con una cubeta más chiquita.",
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
