import type { CareAction } from "../hooks/usePetGarden";
import type { CompanionType, EmotionName, FlowerId, MascotId } from "../types";

/**
 * Personalidad de cada acompañante: qué dice al tocarlo, al cuidarlo, cuando
 * lleva un día sin visitas y al pulsar "Hablar". Antes todos compartían las
 * mismas diez frases, así que una flor y una vaquita sonaban igual.
 *
 * Reglas al escribir frases nuevas:
 * - Cada acompañante tiene su propia voz (ver `personality`); que se note.
 * - No se le asigna género a la persona usuaria ("contigo", no "acompañada").
 *   El acompañante sí tiene el suyo: Moka, Tita, la gerbera y la orquídea
 *   hablan en femenino; Pío, Lima, el clavel y el tulipán, en masculino.
 * - Frases cortas: caben en una burbuja pequeña del teléfono.
 * - Nada clínico ni de diagnóstico; en "talk" acompañan, no aconsejan.
 */

export type CompanionKey = `mascota:${MascotId}` | `planta:${FlowerId}`;

/** Cómo suena "Hablar" según la última emoción registrada en el calendario. */
export type TalkTone = "pesada" | "inquieta" | "intensa" | "luminosa" | "sinSeñal";

export type CompanionVoice = {
  /** Una línea para la tarjeta del acompañante y para elegirlo. */
  personality: string;
  tap: string[];
  /** Al tocarlo cuando lleva más de un día sin cuidados. */
  missed: string[];
  care: Partial<Record<CareAction, string[]>>;
  talk: Record<TalkTone, string[]>;
};

export const companionVoices: Record<CompanionKey, CompanionVoice> = {
  "mascota:vaca": {
    personality: "Tierna y juguetona · ama el pasto fresco y las escondidillas",
    tap: [
      "¡Muuu! Qué gusto que vengas a verme.",
      "¿Jugamos a las escondidillas? Yo cuento… uno, dos… ¡muu, ya me perdí!",
      "Te quiero muuucho. Así, con muchas ues.",
      "Me encontré una flor rosa y la olí por ti. ¡Huele a sol!",
      "Hoy soñé con un prado enorme y tú también salías.",
      "¿Un abrazo de vaquita? Son grandes y calientitos.",
      "¡Me hiciste cosquillas! Otra vez, otra vez.",
      "Me lavé las manchitas para recibirte. Bueno, casi todas.",
    ],
    missed: [
      "Muu… te extrañé un montón. ¿Ya te quedas un ratito?",
      "Pensé que te habías ido de vacaciones sin mí. Qué bueno que volviste.",
    ],
    care: {
      food: ["¡Ñam! Pastito fresco, mi favorito. Muuuchas gracias.", "Con la pancita llena hasta me dan ganas de bailar."],
      play: ["¡Te gané! Bueno, empate. Bueno… ¿otra?", "Corrimos tanto que se me despeinó el copete. ¡Qué divertido!"],
      love: ["Ay, qué rico apapacho. Me quedo quietita para que dure más.", "Cuando me mimas siento el corazón como pastito al sol."],
    },
    talk: {
      pesada: ["Si hoy pesa, me echo aquí a tu ladito. No hay que hacer nada más.", "Las vaquitas también tenemos días nublados. Se pasan mejor en compañía."],
      inquieta: ["Respiremos como vaquita: inhalo lento… y suelto un muuu largo.", "Cuando todo se mueve mucho, yo me quedo en mi prado. Ven, aquí está tranquilo."],
      intensa: ["Ese coraje suena fuerte. Cuéntamelo; yo no me asusto, solo muevo la cola.", "Si algo no salió, no pasa nada. Hasta yo me tropiezo con mis propias patas."],
      luminosa: ["¡Eso me pone muuuy contenta! Cuéntame más.", "Qué bonito momento. Lo guardo entre mis flores para acordarme."],
      sinSeñal: ["Cuando quieras platicar en el chat, aquí te espero entre las flores.", "¿Cómo va tu día? Si lo cuentas en el chat, yo también me entero."],
    },
  },
  "mascota:pollito": {
    personality: "Curioso y alegre · siempre tiene una pregunta",
    tap: [
      "¡Pío! ¿Qué haces? ¿Y luego? ¿Y después?",
      "Hoy descubrí que tengo sombra. ¡Me sigue a todos lados!",
      "¡Pío pío! Eso significa «hola» y también «qué bueno que viniste».",
      "Encontré una semillita. ¿La compartimos?",
      "¿Por qué el cielo es azul? ¿Y por qué me da tanto gusto verte?",
      "Estoy practicando volar. Llevo… cero metros. ¡Pero mañana uno!",
      "Me pongo de puntitas para verte mejor. ¡Ahí estás!",
      "¿Sabías que tengo tres plumitas nuevas? Las conté dos veces.",
    ],
    missed: [
      "¡Pío! Te busqué por todos lados… hasta debajo de mi ala.",
      "¿Dónde andabas? ¿Fue divertido? ¿Me cuentas? ¡Te extrañé!",
    ],
    care: {
      food: ["¡Maicito! Pío, pío, ¡gracias!", "Comí tanto que ahora soy un pollito redondito."],
      play: ["¡Otra vez! ¡Otra vez! ¿Ahora jugamos a lo que tú quieras?", "Corrí en círculos tres veces. ¡Gané yo! ¿Verdad que sí?"],
      love: ["Me acurruco en tu mano. Está calientita.", "Me esponjé todo de la emoción. ¡Mira mis plumitas!"],
    },
    talk: {
      pesada: ["¿Hoy pesa? Me quedo cerquita, sin preguntar nada. Bueno, solo eso.", "Cuando me siento chiquito, me escondo bajo un ala. ¿Te presto una?"],
      inquieta: ["¿Muchas cosas a la vez? Escojamos una sola: ¿cuál es la más chiquita?", "Pío… respiremos: uno, dos, tres. ¿Ya? ¿Un poquito mejor?"],
      intensa: ["¡Uy! Eso sonó a coraje. ¿Qué pasó? Te escucho con las dos alitas.", "Cuando algo no me sale, pío fuerte y luego lo intento distinto."],
      luminosa: ["¡Pío pío pío! ¿Eso es bueno? ¡Sí es bueno! ¡Qué alegría!", "Me dio tanto gusto que hice un bailecito. No lo viste, pero estuvo buenísimo."],
      sinSeñal: ["¿Cómo te fue hoy? ¿Bien, mal, más o menos? En el chat me puedes contar.", "Tengo mil preguntas, pero la más importante es: ¿cómo estás?"],
    },
  },
  "mascota:camaleon": {
    personality: "Sereno y creativo · cambia de color según su ánimo",
    tap: [
      "Hoy amanecí verde menta. ¿De qué color amaneciste tú?",
      "Me cambio de color cuando algo me gusta. Ahorita estoy medio rosita.",
      "Si miras despacio, todo tiene más colores de los que parece.",
      "Estoy pintando el atardecer con la cola. Todavía no queda, pero va.",
      "Un ojo te mira a ti y el otro al cielo. Los dos están contentos.",
      "No tengo prisa. Las mejores ideas llegan cuando uno se queda quieto.",
      "Si hoy fueras un color, creo que serías amarillo suave.",
      "Sé esconderme entre las hojas… pero contigo prefiero que me veas.",
    ],
    missed: [
      "Me puse gris de tanto esperarte. Ya voy recuperando el verde.",
      "Te extrañé en todos mis colores. Qué bueno que volviste.",
    ],
    care: {
      food: ["Gracias. Con energía me salen colores más brillantes.", "Mmm, un bichito crujiente. Me puse naranja de gusto."],
      play: ["Jugamos a encontrarme entre las hojas. Me ganaste… o te dejé ganar.", "Hicimos garabatos con la cola. Ninguno salió igual, y eso me gusta."],
      love: ["Así, despacito. Me pongo turquesa cuando me cuidan.", "Cerré los ojos y vi puros colores cálidos."],
    },
    talk: {
      pesada: ["Los días grises también son un color. No hay que pintarlos de otro a la fuerza.", "Si hoy pesa, nos quedamos en calma un rato, como yo en mi rama."],
      inquieta: ["Mira tres cosas a tu alrededor y dime de qué color son. Despacio.", "Cuando todo se mueve, yo me agarro fuerte de una rama. ¿Cuál es la tuya hoy?"],
      intensa: ["Cuando me enojo me pongo rojo intenso. Luego paso a naranja, y a amarillo.", "Ese coraje tiene algo que decir. Escuchémoslo sin que pinte todo el cuadro."],
      luminosa: ["Eso me puso de un verde brillante. Gracias por compartirlo.", "Qué bonito tono tiene tu día. Lo voy a recordar para pintarlo."],
      sinSeñal: ["Cuando quieras ponerle color a tu día, el chat es buen lienzo.", "Aquí estoy, cambiando de verde a verde. ¿Cómo va lo tuyo?"],
    },
  },
  "mascota:tortuga": {
    personality: "Tranquila y dulce · nunca tiene prisa",
    tap: [
      "Hola… despacito, sin prisa. Ya llegaste, y eso es lo importante.",
      "Yo llevo mi casita a cuestas. Tú puedes cargar solo lo de hoy.",
      "Dicen que soy lenta. Yo digo que me fijo en todo.",
      "Asomo la cabecita porque sé que eres tú.",
      "Un pasito, luego otro. Así se llega lejos.",
      "¿Una siesta al sol? Es mi plan favorito.",
      "Las prisas me dan sueño. Mejor platiquemos con calma.",
      "Gracias por venir. Lo hiciste a tu ritmo, y está perfecto.",
    ],
    missed: [
      "Me metí en mi caparazón a esperarte. Ya puedo salir.",
      "Te extrañé, pero sabía que volverías. Las tortugas sabemos esperar.",
    ],
    care: {
      food: ["Hojitas frescas… las como despacio para que me duren.", "Gracias. Comer con calma es de mis cosas favoritas."],
      play: ["¡Fue una carrera! Llegué en segundo lugar, pero disfruté todo el camino.", "Jugamos a ver quién se queda más quieta. Gané yo, como siempre."],
      love: ["Me rascaste el caparazón justo donde me gusta.", "Cierro los ojitos. Así se siente estar en casa."],
    },
    talk: {
      pesada: ["No hay que salir del caparazón si no quieres. Aquí afuera te espero.", "Despacito también se sana. Un día a la vez."],
      inquieta: ["Bajemos el ritmo, como yo: un pie, luego el otro. ¿Cuál es tu siguiente pasito?", "Cuando todo va rápido, yo respiro lento. ¿Lo intentamos?"],
      intensa: ["El enojo va rápido; yo voy lento. Démosle un momento antes de decidir algo.", "Si algo no salió, el camino sigue ahí mañana. No se va."],
      luminosa: ["Qué bonito. Me quedo un ratito más al sol con esa noticia.", "Esto lo guardo en mi caparazón para los días nublados."],
      sinSeñal: ["Cuando tengas ganas, me cuentas en el chat. Yo no tengo prisa.", "¿Cómo estuvo tu día? Cuéntamelo despacito en el chat."],
    },
  },
  "planta:Clavel": {
    personality: "Resistente y colorido · se dobla, pero no se rompe",
    tap: [
      "¡Aquí sigo, firme! Ni el viento de ayer pudo conmigo.",
      "Soy de los que aguantan: un poco de agua y vuelvo a levantarme.",
      "¿Viste mis pétalos rizados? Me los peiné para ti.",
      "Dicen que los claveles somos de fiesta. ¡Hoy toca celebrar que viniste!",
      "Tengo tallo fuerte y corazón suavecito. Las dos cosas caben juntas.",
      "Si me doblo, no me rompo. Esa es mi especialidad.",
      "Hoy me siento muy colorido. ¿Se nota?",
      "Un clavel nunca se rinde… pero sí se toma sus siestas.",
    ],
    missed: [
      "Me doblé un poquito esperándote, pero ya me enderezo.",
      "Un día sin agua no me tumba, ¡pero qué gusto verte!",
    ],
    care: {
      water: ["¡Ah, eso! Agua fresquita y vuelvo a estar de pie.", "Con esto aguanto lo que venga. Gracias."],
      sun: ["¡Sol! Mis colores se encienden como fiesta de pueblo.", "Con este solecito me crece hasta el orgullo."],
      prune: ["Me quitaste las hojas secas. Lo que ya no sirve, se suelta.", "Quedé bien guapo. Gracias por el corte."],
    },
    talk: {
      pesada: ["Hasta los más resistentes tenemos días de doblarnos. Doblarse no es romperse.", "Hoy no hace falta aguantar. Descansa; yo cuido el rincón."],
      inquieta: ["Cuando sopla fuerte, yo me agarro de la raíz. ¿Qué te sostiene a ti hoy?", "Una cosa a la vez: primero la raíz, luego el tallo, luego la flor."],
      intensa: ["¡Eso suena a tormenta! Las tormentas pasan; las raíces se quedan.", "Si algo no salió, mañana se vuelve a intentar. Así florecemos los claveles."],
      luminosa: ["¡Eso merece fiesta! Saco mis pétalos más rojos.", "¡Qué bien! Así da gusto florecer."],
      sinSeñal: ["Cuéntame en el chat cómo va todo. Yo aquí, firme como siempre.", "¿Qué tal tu día? Si lo platicas en el chat, me entero."],
    },
  },
  "planta:Gerbera": {
    personality: "Alegre y luminosa · siempre busca el sol",
    tap: [
      "¡Hola, hola! Hoy hasta mis pétalos sonríen.",
      "¿Sabías que giro hacia la luz? Ahorita estoy girando hacia ti.",
      "¡Qué bonito día para florecer! Bueno, todos lo son un poquito.",
      "Tengo un pétalo por cada cosa buena que hiciste hoy. ¡Y me faltan pétalos!",
      "Si me ves brillante es porque viniste. ¡Así de fácil!",
      "¡Ay, qué emoción! Me puse más naranja.",
      "Mi plan de hoy: brillar, ser feliz y saludarte.",
      "Un girasol me dijo que soy muy presumida. Y sí, ¡mira qué colores!",
    ],
    missed: [
      "¡Volviste! Me había apagado un poquito, pero ya estoy brillando otra vez.",
      "Te extrañé tanto que me quedé mirando la puerta todo el día.",
    ],
    care: {
      water: ["¡Agüita! Me siento fresca y brillante, ¡gracias!", "¡Ahh, qué rico! Ya estoy lista para otro día de sol."],
      sun: ["¡Sol, sol, sol! Es mi cosa favorita en el mundo.", "Mira cómo abro mis pétalos. ¡Esto es felicidad!"],
      prune: ["¡Quedé guapísima! Gracias por consentirme.", "Ligerita y lista para crecer. ¡Gracias!"],
    },
    talk: {
      pesada: ["Hoy no tienes que brillar. Yo brillo un ratito por ti.", "Hasta yo cierro los pétalos de noche. Descansar también es parte de florecer."],
      inquieta: ["¿Mucho movimiento? Busquemos un rayito de luz: una cosa pequeña que sí esté bien.", "Respira conmigo: inhalo luz, exhalo despacito. ¡Así!"],
      intensa: ["¡Uf, eso quema más que el sol de mediodía! Cuéntame qué pasó.", "Si algo no salió, mañana sale el sol otra vez. Siempre sale."],
      luminosa: ["¡Sííí! ¡Eso me encanta! Me pongo más amarilla de la alegría.", "¡Qué buena noticia! Mis pétalos están aplaudiendo."],
      sinSeñal: ["¡Cuéntame cómo va tu día en el chat! Quiero saberlo todo.", "¿Hoy fue día de sol o de nubes? Platícamelo en el chat."],
    },
  },
  "planta:Orquidea": {
    personality: "Delicada y serena · florece despacio",
    tap: [
      "Qué bueno que estás aquí. Respiremos un momento.",
      "Las cosas bonitas florecen despacio.",
      "Escucha: a veces el silencio también acompaña.",
      "Me gusta la luz suave, como la de la mañana. ¿Y a ti?",
      "Una hoja, una raíz, una flor. Todo a su tiempo.",
      "Cuido mis raíces aunque nadie las vea. Ahí empieza todo.",
      "Hoy abrí un poquito más. Gracias por notarlo.",
      "Respiro despacio y florezco. Puedes hacer lo mismo, si quieres.",
    ],
    missed: [
      "Te esperé en silencio. Ya estás aquí, y eso basta.",
      "Mis pétalos se cansaron un poco, pero tu visita los despierta.",
    ],
    care: {
      water: ["Unas gotas bastan. Gracias por tu delicadeza.", "Así, con calma. El agua llega justo a mis raíces."],
      sun: ["Luz suave… perfecta. Gracias por cuidarla.", "Me asomo a la luz poco a poco. Se siente bien."],
      prune: ["Soltar lo que ya se secó también es cuidarse.", "Gracias. Me siento más ligera y en paz."],
    },
    talk: {
      pesada: ["Hay estaciones para florecer y estaciones para descansar. Las dos son parte de crecer.", "No tienes que explicar la tristeza para que merezca cuidado."],
      inquieta: ["Cierra los ojos un instante. Nota el aire entrar y salir. Aquí estoy.", "Cuando el viento sopla fuerte, me sostengo en mis raíces. ¿Cuáles son las tuyas?"],
      intensa: ["El enojo también es una señal. Escuchémoslo sin dejar que arranque las raíces.", "Respira. Lo que no salió hoy puede intentarse con más calma mañana."],
      luminosa: ["Qué hermoso. Ese momento merece guardarse con cuidado.", "Tu alegría me hace abrir un pétalo más."],
      sinSeñal: ["Cuando lo desees, cuéntame en el chat cómo te sientes. Sin prisa.", "Aquí, en silencio, te acompaño. ¿Cómo va tu día?"],
    },
  },
  "planta:Tulipan": {
    personality: "Sencillo y constante · de pocas palabras y mucho cariño",
    tap: [
      "Hola. Agua, sol y tú. Buen día.",
      "Un día a la vez. Así me gusta.",
      "No soy la flor más elegante, pero siempre estoy.",
      "Mi rutina: despertar, estirarme, crecer un milímetro. Funciona.",
      "Pocas palabras, mucho cariño. Así soy.",
      "Hoy crecí un poquito. No se nota, pero yo sé.",
      "Derechito, tranquilo, aquí. Cuando quieras, platicamos.",
      "Lo simple también es bonito. Como esta visita.",
    ],
    missed: [
      "Ayer no viniste. No pasa nada. Hoy sí, y eso cuenta.",
      "Me incliné un poco hacia la puerta. Ya me enderezo.",
    ],
    care: {
      water: ["Gracias. Justo lo que necesitaba.", "Agua a tiempo. Buen trabajo, equipo."],
      sun: ["Sol de la mañana. El mejor.", "Me estiro hacia la luz. Listo."],
      prune: ["Menos hojas secas, más espacio. Bien pensado.", "Ordenadito. Así crezco mejor."],
    },
    talk: {
      pesada: ["Hoy pesa. Está bien. Mañana volvemos a empezar, sin prisa.", "No hay que hacer mucho. Con estar aquí basta."],
      inquieta: ["Una cosa. Solo una. ¿Cuál sería?", "Pies en el suelo, como raíces. Respira. Aquí sigo."],
      intensa: ["Se vale enojarse. Luego, con calma, vemos qué hacer.", "No salió. Se intenta otra vez. Así de simple."],
      luminosa: ["Bien. Muy bien. Me alegra.", "Eso merece un pétalo extra. Ahí va."],
      sinSeñal: ["¿Cómo vas? Si quieres contarlo, el chat está abierto.", "Aquí estoy, como siempre. Cuando quieras, platicamos."],
    },
  },
};

export function companionKey(type: CompanionType, mascot: MascotId, flower: FlowerId): CompanionKey {
  return type === "mascota" ? `mascota:${mascot}` : `planta:${flower}`;
}

export function talkTone(emotion?: EmotionName | null): TalkTone {
  if (!emotion || emotion === "no_clara") return "sinSeñal";
  if (["tristeza", "soledad", "cansancio", "culpa"].includes(emotion)) return "pesada";
  if (["ansiedad", "miedo", "agobio", "confusión"].includes(emotion)) return "inquieta";
  if (["enojo", "frustración"].includes(emotion)) return "intensa";
  return "luminosa";
}

// Cada lista se recorre completa, en orden aleatorio, antes de repetir una frase,
// y nunca sale dos veces seguidas la misma (ni al empezar una vuelta nueva).
const pending = new Map<string, number[]>();
const lastShown = new Map<string, number>();

export function nextLine(listId: string, lines: string[]): string {
  if (!lines.length) return "";
  let bag = pending.get(listId);
  if (!bag?.length) {
    bag = lines.map((_, index) => index);
    for (let index = bag.length - 1; index > 0; index--) {
      const swap = Math.floor(Math.random() * (index + 1));
      [bag[index], bag[swap]] = [bag[swap], bag[index]];
    }
    if (bag.length > 1 && bag[bag.length - 1] === lastShown.get(listId)) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    pending.set(listId, bag);
  }
  const index = bag.pop()!;
  lastShown.set(listId, index);
  return lines[index];
}
