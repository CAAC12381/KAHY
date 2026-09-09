export type ReplyMode = "standard" | "support" | "safety";
export type ChatTopic =
  | "inicio"
  | "estrés"
  | "ánimo"
  | "trauma"
  | "neurodivergencia"
  | "adicciones"
  | "organización"
  | "acceso"
  | "seguridad"
  | "duelo"
  | "soledad"
  | "relaciones"
  | "sueño"
  | "pánico"
  | "medicación"
  | "diagnóstico"
  | "apoyo"
  | "autocuidado"
  | "conversación";

export type ConversationReply = {
  mode: ReplyMode;
  presentation?: "conversation" | "guided";
  topic: ChatTopic;
  label: string;
  title: string;
  introduction: string;
  insight?: string;
  steps: Array<{ horizon: string; text: string }>;
  question: string;
  choices: string[];
  sourceIds: string[];
  openHelp?: boolean;
};

// NOTE: duplicated in api/_lib/kahyAi.ts (Vercel's function bundler failed
// to trace an import reaching from api/ into this src/ file — see that
// file's header comment). Update both if you change this list.
const safetyPatterns = [
  /me quiero morir/i,
  /quiero morir/i,
  /no quiero vivir/i,
  /no quiero seguir (viviendo|aqui|así|asi)/i,
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
  /hacerme daño/i,
  /me quiero hacer daño/i,
  /quiero hacerme daño/i,
  /pienso hacerme daño/i,
  /lastimarme/i,
  /quiero lastimarme/i,
  /voy a lastimarme/i,
  /no puedo mantenerme a salvo/i,
  /me (corté|corte|estoy cortando)/i,
  /cortarme las venas/i,
  /ahorcarme/i,
  /colgarme/i,
  /aventarme (del|de un|desde)/i,
  /tirarme (del|de un|desde)/i,
  /(tengo|hice|ya tengo).{0,24}(un plan|una forma).{0,40}(morir|matarme|hacerme daño|suicid)/i,
  /despedirme de todos/i,
  /ojalá no despertara/i,
  /mejor ya no despertar/i,
  /estaria(n)? mejor sin mi/i,
  /soy una carga para (todos|mi familia|los demas)/i,
  /ya no le veo sentido a (nada|la vida)/i,
  /nada tiene sentido ya/i,
  /sobredosis/i,
  /tomé demasiadas pastillas/i,
  /me tome todas las pastillas/i,
  /no (está|esta) respirando/i,
  /no puedo respirar/i,
  /está inconsciente/i,
  /violencia.*ahora/i,
  /me están golpeando/i,
  /hacer(le)? daño a alguien/i,
  /estoy en peligro/i,
];

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function normalize(input: string) {
  return input.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function detectSafetySignal(input: string) {
  return safetyPatterns.some((pattern) => pattern.test(input));
}

export function getTopic(input: string): ChatTopic {
  const text = normalize(input);
  if (detectSafetySignal(input)) return "seguridad";
  if (includesAny(text, [
    "alcohol", "droga", "adiccion", "consumo", "sustancia", "abstinencia", "cigarro", "fumar", "vapeo", "apuestas", "ludopatia",
    "chupar", "la peda", "ando pedo", "andaba pedo", "traigo cruda", "estoy crudo", "estoy cruda", "el perico", "la coca", "la mona",
    "el toque", "la mota", "el porro", "las tachas", "me pase de copas", "le doy duro al alcohol", "no puedo dejar de tomar",
    "se me paso la mano tomando", "ya no la puedo dejar", "tomo para olvidar", "fumo mucha mota", "perdi la cuenta de las cervezas",
    "el vicio", "tengo un vicio",
  ])) return "adicciones";
  if (includesAny(text, [
    "autismo", "autista", "tdah", "neurodiv", "sensorial", "sobrecarga", "estimulos", "hiperfoco", "estimming",
    "soy bien disperso", "soy bien dispersa", "se me olvida todo", "soy bien inquieto", "soy bien inquieta", "no paro de moverme",
    "me sobrepasan los estimulos", "no soporto el ruido ni la luz", "hiperactivo", "hiperactiva", "se me traba la cabeza con los ruidos",
  ])) return "neurodivergencia";
  if (includesAny(text, [
    "trauma", "recuerdo", "pesadilla", "flashback", "abuso", "violencia", "revivo", "me disocio", "disociacion",
    "se me viene a la mente", "no se me quita de la cabeza", "me paralizo cuando", "revivi el momento", "me bloqueo cuando recuerdo",
  ])) return "trauma";
  if (includesAny(text, [
    "duelo", "murio", "fallecio", "perdi a", "muerte de", "luto", "lo perdi", "la perdi", "ya no esta conmigo",
    "se nos fue", "en paz descanse", "qepd", "se murio mi", "perdi a mi mama", "perdi a mi papa", "perdi a mi hermano",
    "perdi a mi hermana", "perdi a mi abuelo", "perdi a mi abuela", "perdi a mi perro", "perdi a mi gato", "me quede sin el",
    "me quede sin ella",
  ])) return "duelo";
  if (includesAny(text, [
    "me siento solo", "me siento sola", "estoy solo", "estoy sola", "soledad", "aislad", "sin nadie", "nadie con quien hablar", "no tengo amigos",
    "ando bien solo", "ando bien sola", "nadie me pela", "nadie me hace caso", "me siento invisible", "no le importo a nadie",
  ])) return "soledad";
  if (includesAny(text, [
    "pelea con mi pareja", "mi familia no me entiende", "conflicto familiar", "discuti con", "rompimos", "terminamos la relacion", "terminamos con", "relacion toxica", "mi pareja", "mi novio", "mi novia", "mi mama y yo", "mi papa y yo", "mis papas",
    "me termino", "tronamos", "ya trono con", "me puso el cuerno", "me fue infiel", "me engaño", "estamos peleados",
    "ya no aguanto a mi", "mi suegra", "mi suegro", "mi ex me", "me dejo plantado", "me dejo plantada", "somos toxicos", "es toxica la relacion",
  ])) return "relaciones";
  if (includesAny(text, [
    "no puedo dormir", "insomnio", "duermo mal", "desvelad", "trasnochando", "dormir bien", "pesadez para dormir",
    "no pego el ojo", "me la paso en vela", "ya no duermo nada", "me desvelo mucho", "traigo un desvelo",
  ])) return "sueño";
  if (includesAny(text, [
    "depres", "triste", "sin energia", "desanimo", "animo bajo", "vacio", "agotad", "sin ganas de nada", "no disfruto",
    "ando bien mal", "traigo la moral por los suelos", "me siento hecho bolas", "me siento hecha bolas", "no me nace hacer nada",
    "ya nada me llena", "me siento vacio por dentro", "me siento vacia por dentro", "no le veo caso a nada", "ya no puedo ni levantarme",
    "estoy en depre", "traigo bajon", "ando de bajon", "me siento mal", "me siento muy mal", "no me siento bien",
    "no ando bien", "no estoy bien",
  ])) return "ánimo";
  if (includesAny(text, [
    "tarea", "organizar", "procrast", "pendiente", "concentr", "estudiar", "trabajo acumulado",
    "se me junta todo", "no se ni por donde jalarle", "traigo mil pendientes", "se me acumulo todo", "no rindo",
    "ya no me alcanza el dia",
  ])) return "organización";
  if (includesAny(text, [
    "mi amigo", "mi amiga", "mi hermano", "mi hermana", "una persona cercana", "como ayudo a alguien", "quiero ayudar a alguien", "alguien que conozco", "un familiar esta", "un compañero esta",
    "mi cuate", "mi cuata", "un cuate mio", "una amiga mia", "un compa mio", "mi cuñado", "mi cuñada", "mi primo esta mal", "mi prima esta mal",
  ])) return "apoyo";
  if (includesAny(text, [
    "que medicamento", "mi medicamento", "mis pastillas", "dejar de tomar", "suspender el medicamento", "se me olvido tomar", "efectos secundarios", "cambiar la dosis", "el psiquiatra me receto", "dosis de",
    "las pastillas que me receto", "mi tratamiento", "ya no quiero tomar mis pastillas", "se me acabaron las pastillas",
  ])) return "medicación";
  if (includesAny(text, ["tengo cita con el psicologo", "tengo cita con el psiquiatra", "me van a evaluar", "quiero un diagnostico", "cual es mi diagnostico", "preparar mi cita", "me van a hacer un cuestionario", "primera consulta"])) return "diagnóstico";
  if (includesAny(text, [
    "ataque de panico", "me esta dando panico", "siento que me voy a morir", "no puedo respirar", "el corazon me va muy rapido", "taquicardia", "hiperventil", "me falta el aire",
    "siento que me da un infarto", "el corazon se me quiere salir", "me estoy sofocando", "me quede paralizado", "me quede paralizada",
  ])) return "pánico";
  if (includesAny(text, ["autocuidado", "cuidarme mejor", "habitos saludables", "sentirme mejor en general", "rutina de bienestar", "quiero prevenir", "necesito consentirme", "quiero mimarme un poco"])) return "autocuidado";
  if (includesAny(text, [
    "psicolog", "especialista", "terapia", "atencion", "cita", "morelia", "uruapan", "zamora", "pueblo", "lejos", "directorio", "consulta",
    "no hay quien atienda aqui", "no hay psicologos cerca", "esta bien lejos el centro de salud",
  ])) return "acceso";
  if (includesAny(text, [
    "ansiedad", "estres", "presion", "nervios", "preocup",
    "estoy hasta el gorro", "estoy hasta la madre", "ya no aguanto la presion", "me trae de la patada", "se me hace bola todo",
    "traigo los nervios de punta", "no doy una", "ya no puedo con todo esto", "estoy saturad", "ando bien estresad",
    "me esta llevando la fregada", "esta bien cabron esto", "esta bien gacho todo", "no mames ya no aguanto",
    "puta madre ya no puedo", "chingado ya no se que hacer", "estoy jodido", "estoy jodida", "valio madres todo",
  ])) return "estrés";
  return "conversación";
}

type FaqKey = "saludo" | "gracias" | "despedida" | "queEsKahy" | "costo" | "privacidad" | "humano" | "capacidades" | "numeroEmergencia";

function detectFaq(input: string): FaqKey | null {
  const text = normalize(input);
  if (includesAny(text, ["numero de emergencia", "telefono de ayuda", "a que numero llamo", "numero de la linea de la vida", "telefono de la linea de la vida"])) return "numeroEmergencia";
  if (includesAny(text, ["hablar con un humano", "persona real", "psicologo real", "alguien de verdad", "quiero hablar con alguien de verdad", "atencion humana"])) return "humano";
  if (includesAny(text, ["que puedes hacer", "en que me ayudas", "para que sirves", "que sabes hacer", "que puedo preguntarte", "que temas manejas"])) return "capacidades";
  if (includesAny(text, ["cuanto cuesta", "tiene costo", "es gratis", "es gratuito", "cobran por", "hay que pagar", "cuesta dinero", "precio de"])) return "costo";
  if (includesAny(text, ["privacidad", "confidencial", "guardan mis datos", "queda guardado", "se guarda esta conversacion", "alguien mas lee esto", "quien ve lo que escribo"])) return "privacidad";
  if (includesAny(text, ["que eres", "quien eres", "que es kahy", "como funciona esto", "eres un psicologo", "eres real", "eres una ia", "eres un bot"])) return "queEsKahy";
  if (includesAny(text, ["gracias", "muchas gracias", "te agradezco", "se agradece", "gracias mil", "mil gracias"])) return "gracias";
  if (includesAny(text, ["adios", "hasta luego", "nos vemos", "me despido", "bye", "hasta pronto", "ahi nos vidrios", "al rato te veo", "nos vidrios"])) return "despedida";
  if (/^\s*(hola+|holi+|buenas|buenos dias|buenas tardes|buenas noches|hey|que tal|ola|quiubo|quihubo|quihubole|que onda|q onda)\b/.test(text) || text.trim() === "hola") return "saludo";
  return null;
}

function faqReply(key: FaqKey, topic: ChatTopic): ConversationReply {
  const base = {
    mode: "standard" as ReplyMode,
    topic,
    steps: [] as Array<{ horizon: string; text: string }>,
  };
  switch (key) {
    case "saludo":
      return {
        ...base,
        label: "Bienvenida",
        title: "Hola, qué bueno que escribes",
        introduction: "Soy el motor de orientación de KAHY. Puedo ayudarte a ordenar lo que sientes, sugerir un siguiente paso concreto y, si hace falta, conectarte con apoyo humano.",
        insight: "No diagnostico ni sustituyo a un profesional; ofrezco una ruta local segura mientras conversamos.",
        steps: [
          { horizon: "Para empezar", text: "Cuéntame en una frase qué está pasando o qué tipo de apoyo buscas." },
          { horizon: "Si prefieres", text: "Puedes usar uno de los atajos de abajo: estrés, sobrecarga, consumo o atención remota." },
        ],
        question: "¿Por dónde quieres comenzar?",
        choices: ["Estrés o ansiedad", "Ánimo bajo", "Sobrecarga neurodivergente", "Buscar atención"],
        sourceIds: ["who-ai-health"],
      };
    case "gracias":
      return {
        ...base,
        label: "De nada",
        title: "Con gusto, para eso estoy aquí",
        introduction: "Puedes seguir escribiendo cuando quieras: continuar con lo que veníamos hablando, cambiar de tema o cerrar la conversación.",
        steps: [
          { horizon: "Si quieres seguir", text: "Cuéntame qué parte quieres profundizar o qué cambió." },
          { horizon: "Si prefieres pausar", text: "Puedes revisar tu plan de ahora o explorar actividades breves." },
        ],
        question: "¿Seguimos con lo mismo o prefieres otra cosa?",
        choices: ["Seguir con lo mismo", "Ver herramientas", "Buscar atención", "Por ahora es todo"],
        sourceIds: ["who-ai-health"],
      };
    case "despedida":
      return {
        ...base,
        label: "Hasta pronto",
        title: "Aquí voy a estar cuando quieras volver",
        introduction: "Nada de esta conversación queda guardado en un servidor. Si necesitas apoyo humano antes de irte, el botón de ayuda inmediata está siempre disponible.",
        steps: [
          { horizon: "Antes de cerrar", text: "Si algo de lo que hablamos requiere un siguiente paso, revísalo en tu plan de ahora." },
          { horizon: "Cuídate", text: "Vuelve cuando lo necesites; no hace falta explicar todo de nuevo." },
        ],
        question: "¿Quieres dejar algo anotado en tu plan antes de salir?",
        choices: ["Sí, anotar algo", "No, es todo por hoy", "Ver ayuda inmediata"],
        sourceIds: ["who-ai-health"],
      };
    case "queEsKahy":
      return {
        ...base,
        label: "Sobre KAHY",
        title: "Soy una guía de orientación, no un terapeuta",
        introduction: "KAHY es un prototipo de primer auxilio psicológico: ordena lo que compartes, sugiere pasos concretos y facilita conexión con apoyo humano cuando hace falta. Cuando hay una clave de IA configurada, un modelo de lenguaje redacta la respuesta; si no, uso rutas locales como esta.",
        insight: "No diagnostico, no reemplazo terapia y no evalúo riesgo clínico con puntuaciones.",
        steps: [
          { horizon: "Lo que sí hago", text: "Ayudo a separar situación, impacto y siguiente decisión, y sugiero recursos verificados." },
          { horizon: "Lo que no hago", text: "No doy diagnósticos, no receto ni sustituyo la atención de un profesional humano." },
        ],
        question: "¿Quieres que empecemos con algún tema en concreto?",
        choices: ["Estrés o ansiedad", "Ánimo bajo", "Buscar atención", "Ver fuentes verificadas"],
        sourceIds: ["who-ai-health", "mexico-privacy"],
      };
    case "costo":
      return {
        ...base,
        label: "Sobre el costo",
        title: "Esta demostración no tiene costo",
        introduction: "KAHY, en esta fase, es un prototipo visual sin cobros ni cuentas reales. Una versión operativa tendría que definir su modelo de acceso junto con instituciones de salud y universidades.",
        steps: [
          { horizon: "Ahora", text: "Puedes explorar el chat, actividades y el directorio de demostración sin costo." },
          { horizon: "A futuro", text: "El directorio real dependería de convenios con especialistas universitarios o gubernamentales." },
        ],
        question: "¿Te gustaría ver cómo luce el directorio de especialistas de demostración?",
        choices: ["Ver directorio", "Seguir platicando", "Volver al tema anterior"],
        sourceIds: ["mexico-privacy"],
      };
    case "privacidad":
      return {
        ...base,
        label: "Privacidad de esta conversación",
        title: "Tu conversación no se guarda en un servidor",
        introduction: "Este chat funciona sin expediente clínico. Cuando la IA está conectada, el texto se envía al proveedor solo para generar la respuesta y no se almacena en KAHY; en modo local, el mensaje ni siquiera sale de tu navegador.",
        insight: "Evita compartir nombre completo, domicilio exacto u otros datos que te identifiquen.",
        steps: [
          { horizon: "Lo que se guarda", text: "Solo tu perfil y preferencias de interfaz, y únicamente en este dispositivo si te registraste." },
          { horizon: "Lo que no se guarda", text: "El historial del chat, tu ubicación real ni tu información de salud." },
        ],
        question: "¿Quieres continuar con lo que estábamos hablando?",
        choices: ["Sí, continuar", "Ver base de fuentes", "Otra pregunta"],
        sourceIds: ["mexico-privacy", "who-ai-health"],
      };
    case "humano":
      return {
        ...base,
        label: "Conexión con una persona",
        title: "Puedo ayudarte a dar ese paso hacia una persona real",
        introduction: "KAHY es un prototipo automatizado; no reemplaza a un profesional. Si buscas hablar con alguien de verdad, puedo mostrarte el directorio de demostración o la ruta de ayuda inmediata según la urgencia.",
        steps: [
          { horizon: "Si es urgente", text: "Usa el botón de ayuda inmediata: 911 o Línea de la Vida 800 911 2000." },
          { horizon: "Si no es urgente", text: "Explora el directorio de especialistas de demostración para ver cómo funcionaría la conexión real." },
        ],
        question: "¿Es algo urgente o prefieres explorar opciones sin prisa?",
        choices: ["Es urgente", "Sin prisa, ver directorio", "Seguir platicando aquí"],
        sourceIds: ["linea-vida", "who-ai-health"],
      };
    case "capacidades":
      return {
        ...base,
        label: "En qué te puedo ayudar",
        title: "Esto es lo que puedo hacer contigo ahora mismo",
        introduction: "Puedo conversar sobre estrés, ansiedad y pánico, ánimo bajo, duelo, soledad, conflictos de relación, sueño, trauma reciente, sobrecarga neurodivergente, consumo o adicciones, dudas sobre medicamentos, preparar una evaluación, cómo apoyar a alguien más, autocuidado, organización de tareas y acceso a atención en tu zona.",
        insight: "Para cualquier peligro inmediato, prioridad siempre a 911 o Línea de la Vida 800 911 2000.",
        steps: [
          { horizon: "Cómo empezar", text: "Cuéntame en una frase qué está pasando; yo ubico el tema y armamos un plan breve." },
          { horizon: "Si no encajas en un tema", text: "Descríbelo con tus palabras de todas formas; puedo adaptarme aunque no use una palabra clave exacta." },
        ],
        question: "¿Cuál de estos temas se parece más a lo tuyo?",
        choices: ["Estrés o ansiedad", "Ánimo bajo", "Duelo o pérdida", "Buscar atención"],
        sourceIds: ["who-ai-health"],
      };
    case "numeroEmergencia":
      return {
        ...base,
        label: "Números de ayuda",
        title: "Aquí tienes los números que puedes usar ahora",
        introduction: "Si hay peligro inmediato para tu vida o la de alguien más, llama al 911. Para orientación en salud mental sin que sea una urgencia médica, la Línea de la Vida está disponible todos los días.",
        steps: [
          { horizon: "Emergencia", text: "911, servicio de emergencias de México." },
          { horizon: "Orientación", text: "Línea de la Vida: 800 911 2000, disponible todos los días, todo el día." },
        ],
        question: "¿Quieres que abra el panel de ayuda inmediata con estos datos?",
        choices: ["Abrir opciones de ayuda", "No por ahora", "Seguir platicando"],
        sourceIds: ["linea-vida"],
      };
  }
}

type FollowUpSeed = {
  mode?: ReplyMode;
  label: string;
  title: string;
  continuation: string;
  insight?: string;
  steps: Array<{ horizon: string; text: string }>;
  question: string;
  choices: string[];
  sourceIds: string[];
};

const followUpSeeds: Partial<Record<ChatTopic, FollowUpSeed>> = {
  "estrés": {
    label: "Estrés y ansiedad · seguimiento",
    title: "Sigamos ajustando el plan para el estrés",
    continuation: "Vamos a revisar si lo que probamos ayudó o si conviene cambiar de estrategia.",
    insight: "Si la sensación física se intensifica o aparece dolor de pecho, mareo fuerte o dificultad para respirar, esto deja de ser solo estrés y conviene buscar atención médica.",
    steps: [
      { horizon: "Revisar", text: "¿La acción que elegiste la última vez bajó algo la presión, aunque sea un poco?" },
      { horizon: "Ajustar", text: "Si no ayudó, prueba una acción más pequeña o cambia a la columna de \"lo que sí puedes decidir hoy\"." },
    ],
    question: "¿Seguimos con el cuerpo, con la situación concreta o con a quién pedir apoyo?",
    choices: ["El cuerpo sigue tenso", "La situación no se resuelve", "Necesito apoyo de alguien", "Ya mejoró un poco"],
    sourceIds: ["who-ai-health"],
  },
  "ánimo": {
    label: "Ánimo bajo · seguimiento",
    title: "Vamos paso a paso, sin exigirte motivación de más",
    continuation: "No hace falta que todo mejore de golpe; un cambio pequeño también cuenta.",
    insight: "Si esto lleva más de dos semanas afectando sueño, alimentación o pendientes, vale la pena una consulta profesional, incluso si hoy te sientes algo mejor.",
    steps: [
      { horizon: "Cuerpo", text: "¿Pudiste cubrir algo básico: agua, comida sencilla o descanso?" },
      { horizon: "Compañía", text: "¿Llegaste a escribirle a alguien o prefieres que preparemos ese mensaje juntos ahora?" },
    ],
    question: "¿Qué necesitas en este momento: seguir con el cuidado básico, el mensaje a alguien o hablar de la continuidad?",
    choices: ["Cuidado básico", "Ayúdame con el mensaje", "Hablemos de continuidad", "Me siento algo mejor"],
    sourceIds: ["who-ai-health", "linea-vida"],
  },
  trauma: {
    label: "Apoyo informado por trauma · seguimiento",
    title: "Seguimos a tu ritmo, sin forzar detalles",
    continuation: "Lo importante ahora es recuperar orientación y sensación de control, no revivir el evento completo.",
    insight: "Si en algún momento hay peligro presente, no un recuerdo, cambiamos de inmediato a buscar ayuda humana.",
    steps: [
      { horizon: "Chequeo", text: "¿Sigues sintiendo el recuerdo muy presente o ya bajó un poco la intensidad?" },
      { horizon: "Siguiente paso", text: "Si bajó, anota solo lo mínimo útil: qué lo activó y qué te ayudó a orientarte." },
    ],
    question: "¿Quieres seguir orientándote en el presente o prefieres pasar a pensar en apoyo profesional?",
    choices: ["Seguir orientándome", "Hay peligro ahora", "Hablemos de apoyo profesional", "Ya estoy más tranquilo"],
    sourceIds: ["who-ai-health", "nice-self-harm"],
  },
  neurodivergencia: {
    label: "Enfoque neuroafirmativo · seguimiento",
    title: "Sigamos reduciendo carga, no exigiendo más",
    continuation: "Un ajuste pequeño y sostenible vale más que un cambio grande que no dure.",
    insight: "Esta conversación no confirma ni descarta autismo o TDAH; solo ayuda a nombrar necesidades concretas.",
    steps: [
      { horizon: "Revisar", text: "¿El ajuste que probaste bajó algo la sobrecarga o hace falta reducir otra cosa?" },
      { horizon: "Comunicar", text: "Si necesitas pedirlo de nuevo, hazlo con la misma frase concreta; repetirla no es un problema." },
    ],
    question: "¿Seguimos con estímulos, con iniciar la tarea o con lo social?",
    choices: ["Sigue la sobrecarga", "No logro empezar aún", "Es la parte social", "Ya está mejor"],
    sourceIds: ["who-ai-health"],
  },
  adicciones: {
    label: "Consumo y seguridad · seguimiento",
    title: "Sigamos separando seguridad física de patrón de consumo",
    continuation: "No es un juicio moral; es información para decidir el siguiente paso con cuidado.",
    insight: "Ante temblor intenso, confusión, convulsiones o pérdida de conciencia, esto pasa a ser una urgencia médica: 911.",
    steps: [
      { horizon: "Seguridad", text: "¿Cómo te sientes físicamente en este momento?" },
      { horizon: "Patrón", text: "¿Ya identificaste qué buscabas aliviar con el consumo la última vez?" },
    ],
    question: "¿Seguimos con la seguridad física, el patrón o buscar apoyo esta semana?",
    choices: ["Tengo síntomas físicos", "Ya veo el patrón", "Quiero buscar apoyo", "Por hoy evité consumir"],
    sourceIds: ["linea-vida", "who-ai-health"],
  },
  "organización": {
    label: "Función ejecutiva · seguimiento",
    title: "Sigamos encontrando la puerta de entrada",
    continuation: "Si la acción anterior no funcionó, probamos una todavía más pequeña; no significa que hiciste algo mal.",
    steps: [
      { horizon: "Revisar", text: "¿Lograste esa acción de menos de cinco minutos o se quedó pendiente?" },
      { horizon: "Ajustar", text: "Si se quedó pendiente, reduce la acción a la mitad o cambia la distracción que sigue presente." },
    ],
    question: "¿Seguimos definiendo la tarea, reduciéndola más o protegiendo el siguiente bloque de tiempo?",
    choices: ["Aún no sé por dónde", "Necesito reducirla más", "Ya empecé, sigo con eso", "Se quedó igual"],
    sourceIds: ["who-ai-health"],
  },
  acceso: {
    label: "Brecha de atención · seguimiento",
    title: "Sigamos afinando qué tipo de atención buscas",
    continuation: "Cuanto más concreta la búsqueda, menos vueltas innecesarias.",
    steps: [
      { horizon: "Revisar", text: "¿Ya tienes claro si necesitas evaluación, psicoterapia, apoyo por consumo u orientación familiar?" },
      { horizon: "Siguiente paso", text: "Anota dos preguntas que harías antes de agendar: costo, modalidad, protocolo de emergencia." },
    ],
    question: "¿Qué barrera sigue pesando más: distancia, costo, conectividad o encontrar el especialista correcto?",
    choices: ["Distancia", "Costo", "Pocos datos", "Ya tengo más claridad"],
    sourceIds: ["mexico-privacy", "who-ai-health"],
  },
  duelo: {
    label: "Duelo · seguimiento",
    title: "Seguimos a tu ritmo con esta pérdida",
    continuation: "El duelo no avanza en línea recta; puede haber días distintos entre sí, y eso no significa que algo esté mal.",
    steps: [
      { horizon: "Ahora", text: "¿Qué necesitas hoy: hablar de la persona, distraerte un rato o simplemente estar en silencio?" },
      { horizon: "Apoyo", text: "Piensa en una persona con quien puedas compartir un recuerdo o simplemente compañía." },
    ],
    question: "¿Prefieres seguir hablando de esto o pasar a algo que te dé un respiro?",
    choices: ["Seguir hablando de esto", "Necesito un respiro", "Quiero pensar en apoyo profesional"],
    sourceIds: ["who-ai-health", "linea-vida"],
  },
  soledad: {
    label: "Soledad · seguimiento",
    title: "Sigamos construyendo un puente pequeño hacia otra persona",
    continuation: "No hace falta resolver la soledad de golpe; un contacto breve también cuenta.",
    steps: [
      { horizon: "Ahora", text: "¿Hay alguien, aunque sea con poca cercanía, a quien podrías escribirle un mensaje corto hoy?" },
      { horizon: "Ampliar red", text: "Piensa en un espacio con otras personas, presencial o en línea, al que podrías asomarte sin comprometerte a mucho." },
    ],
    question: "¿Prefieres pensar en ese primer mensaje o en dónde encontrar más compañía en general?",
    choices: ["Ayúdame con el mensaje", "Dónde encontrar compañía", "Prefiero seguir platicando aquí"],
    sourceIds: ["who-ai-health"],
  },
  relaciones: {
    label: "Relaciones · seguimiento",
    title: "Sigamos ordenando este conflicto",
    continuation: "Separar lo que sientes de lo que vas a decir suele bajar la intensidad de la conversación real.",
    steps: [
      { horizon: "Ahora", text: "¿Ya tienes claro qué necesitas pedir en una frase corta, sin explicar todo el historial?" },
      { horizon: "Momento", text: "Piensa cuándo habría espacio para hablarlo con calma, sin prisa ni interrupciones." },
    ],
    question: "¿Seguimos preparando lo que quieres decir o prefieres hablar de cómo te sientes tú primero?",
    choices: ["Preparar lo que voy a decir", "Hablar de cómo me siento", "Prefiero dejarlo por hoy"],
    sourceIds: ["who-ai-health"],
  },
  "sueño": {
    label: "Sueño · seguimiento",
    title: "Sigamos revisando qué interfiere con descansar",
    continuation: "Un solo ajuste sostenido suele rendir más que muchos cambios a la vez.",
    insight: "Si el insomnio es persistente, se acompaña de otros síntomas o afecta mucho tu día, conviene comentarlo con un profesional de salud.",
    steps: [
      { horizon: "Revisar", text: "¿Qué suele pasar justo antes de acostarte: pantallas, pensamientos repetitivos, ruido, horarios irregulares?" },
      { horizon: "Ajuste", text: "Elige un solo cambio pequeño para probar esta noche, no varios a la vez." },
    ],
    question: "¿Seguimos con la rutina antes de dormir o con lo que piensas cuando ya estás acostado?",
    choices: ["La rutina antes de dormir", "Pensamientos al acostarme", "Ya duermo algo mejor"],
    sourceIds: ["who-ai-health"],
  },
  "pánico": {
    label: "Síntomas de pánico · seguimiento",
    title: "Sigamos revisando cómo está tu cuerpo ahora",
    continuation: "Un episodio de pánico puede bajar en minutos incluso si en el momento se siente interminable.",
    insight: "Si en algún momento el dolor de pecho, la falta de aire o el mareo se sienten distintos a episodios previos, trátalo como posible urgencia médica: 911.",
    steps: [
      { horizon: "Ahora", text: "¿La sensación ya bajó algo o sigue igual de intensa?" },
      { horizon: "Si sigue fuerte", text: "Repite el 5-4-3-2-1: nombra 5 cosas que ves, 4 que tocas, 3 que oyes, 2 que hueles, 1 que saboreas." },
    ],
    question: "¿Seguimos con la respiración o prefieres hablar de qué lo pudo haber activado?",
    choices: ["Seguir con la respiración", "Hablar de qué lo activó", "Ya bajó la intensidad"],
    sourceIds: ["nice-panic-anxiety"],
  },
  "medicación": {
    label: "Medicamentos · seguimiento",
    title: "Sigamos preparando lo que le vas a decir a quien te receta",
    continuation: "No puedo opinar sobre dosis ni cambios; sí puedo ayudarte a organizar la conversación con tu médico o farmacéutico.",
    steps: [
      { horizon: "Registrar", text: "Anota qué notaste, cuándo empezó y qué tan seguido pasa." },
      { horizon: "Preguntar", text: "Prepara la pregunta concreta que le harías a tu médico o farmacéutico." },
    ],
    question: "¿Ya tienes forma de contactar pronto a quien te recetó, o necesitas ayuda para encontrar dónde preguntar?",
    choices: ["Ya puedo contactarlo", "Necesito dónde preguntar", "Es otra duda sobre esto"],
    sourceIds: ["who-ai-health"],
  },
  "diagnóstico": {
    label: "Preparar evaluación · seguimiento",
    title: "Sigamos afinando lo que vas a llevar a tu cita",
    continuation: "Entre más concreto y fechado sea lo que describas, más útil es para quien te evalúe.",
    steps: [
      { horizon: "Revisar", text: "¿Ya tienes ejemplos con fecha aproximada de cuándo pasa y qué tanto interfiere?" },
      { horizon: "Ajustar", text: "Agrega qué has intentado ya y qué resultado tuvo, aunque haya sido parcial." },
    ],
    question: "¿Seguimos preparando ejemplos o prefieres hablar de los nervios antes de la cita?",
    choices: ["Seguir con ejemplos", "Hablar de los nervios", "Ya me siento preparado"],
    sourceIds: ["nimh-asq", "phq9-gad7-mx"],
  },
  apoyo: {
    label: "Apoyar a otra persona · seguimiento",
    title: "Sigamos viendo cómo acompañar sin cargar todo tú",
    continuation: "Acompañar a alguien no significa que tengas que resolver su situación completa ni estar disponible todo el tiempo.",
    insight: "Si en algún momento esa persona menciona que quiere morir, se ha lastimado o no puedes contactarla, no esperes: 911 o Línea de la Vida 800 911 2000.",
    steps: [
      { horizon: "Revisar", text: "¿Esa persona ya tiene algún apoyo profesional o alguien más además de ti?" },
      { horizon: "Cuidarte", text: "¿Quién te acompaña a ti mientras acompañas a esa persona?" },
    ],
    question: "¿Seguimos viendo cómo hablarle o qué hacer si la situación se sale de tus manos?",
    choices: ["Cómo hablarle", "Qué hacer si se complica", "Ya está mejor"],
    sourceIds: ["who-pfa", "linea-vida"],
  },
  autocuidado: {
    label: "Autocuidado · seguimiento",
    title: "Sigamos sosteniendo un hábito a la vez",
    continuation: "Un solo hábito sostenido varias semanas suele rendir más que varios cambios a la vez que no se sostienen.",
    steps: [
      { horizon: "Revisar", text: "¿El hábito que elegiste ya se siente más fácil o sigue costando arrancarlo?" },
      { horizon: "Ajustar", text: "Si sigue costando, hazlo más pequeño todavía antes de agregar otro." },
    ],
    question: "¿Seguimos con ese hábito o quieres agregar otra área: sueño, movimiento, alimentación o conexión social?",
    choices: ["Seguir con el mismo hábito", "Agregar otra área", "Ya se siente más natural"],
    sourceIds: ["who-selfhelp"],
  },
};

function truncateQuote(input: string) {
  const clean = input.trim().replace(/\s+/g, " ");
  return clean.length > 100 ? `${clean.slice(0, 97)}…` : clean;
}

function followUpReply(topic: ChatTopic, input: string): ConversationReply | null {
  const seed = followUpSeeds[topic];
  if (!seed) return null;
  return {
    mode: seed.mode ?? "support",
    topic,
    label: seed.label,
    title: seed.title,
    introduction: `Leo lo que acabas de compartir: “${truncateQuote(input)}”. ${seed.continuation}`,
    insight: seed.insight,
    steps: seed.steps,
    question: seed.question,
    choices: seed.choices,
    sourceIds: seed.sourceIds,
  };
}

const initialTopicReplies: Partial<Record<ChatTopic, () => ConversationReply>> = {
  duelo: () => ({
    mode: "support", topic: "duelo", label: "Duelo y pérdida", title: "No hay una forma correcta de vivir un duelo",
    introduction: "Perder a alguien o algo importante puede traer oleadas distintas: tristeza, enojo, alivio, culpa o incluso momentos de calma. Todo eso puede convivir sin que signifique que haces algo mal.",
    insight: "El duelo no sigue etapas fijas ni un tiempo exacto. Si te preocupa no poder funcionar en el día a día después de mucho tiempo, eso sí conviene hablarlo con un profesional.",
    steps: [
      { horizon: "Ahora", text: "Permite la emoción que aparezca, sin obligarte a sentir algo distinto de lo que sientes." },
      { horizon: "Hoy", text: "Elige una forma pequeña de recordar o de cuidar de ti: una palabra, una imagen o un momento de silencio." },
      { horizon: "Compañía", text: "Busca a alguien que pueda simplemente acompañarte, sin necesidad de que resuelva nada." },
    ],
    question: "¿Qué necesitas más ahora: hablar de la pérdida, un momento de distracción o pensar en apoyo profesional?",
    choices: ["Hablar de la pérdida", "Necesito un respiro", "Buscar apoyo profesional"],
    sourceIds: ["who-ai-health", "linea-vida"],
  }),
  soledad: () => ({
    mode: "support", topic: "soledad", label: "Soledad", title: "Sentirte solo no significa que algo esté mal contigo",
    introduction: "La soledad puede aparecer incluso rodeado de gente, o por falta real de vínculos cercanos. Antes de resolverla toda, ayuda identificar si es una sensación pasajera o algo que se repite seguido.",
    insight: "No es necesario tener muchos vínculos; a veces una sola conexión constante hace una diferencia real.",
    steps: [
      { horizon: "Ahora", text: "Piensa en una persona, aunque no sea muy cercana, a quien podrías escribirle algo breve hoy." },
      { horizon: "Esta semana", text: "Busca un espacio con otras personas que te interese, sin presión de comprometerte de inmediato." },
      { horizon: "Si persiste", text: "Si la soledad se mantiene por semanas y afecta tu ánimo, coméntalo con un profesional." },
    ],
    question: "¿Prefieres que te ayude a redactar ese primer mensaje o hablar de dónde buscar más compañía?",
    choices: ["Ayúdame con el mensaje", "Dónde encontrar compañía", "Quiero seguir platicando de esto"],
    sourceIds: ["who-ai-health"],
  }),
  relaciones: () => ({
    mode: "support", topic: "relaciones", label: "Conflictos y relaciones", title: "Separemos lo que sientes de lo que vas a decir",
    introduction: "Un conflicto de pareja, familia o amistad suele mezclar emociones intensas con una necesidad concreta detrás. Nombrar esa necesidad ayuda a que la conversación real sea más clara.",
    insight: "Esto no evalúa si la relación es sana o no. Si hay violencia, control o miedo por tu seguridad, ese es un tema distinto y prioritario.",
    steps: [
      { horizon: "Antes de hablar", text: "Escribe en una frase qué necesitas realmente, sin explicar todo el historial del conflicto." },
      { horizon: "Al hablar", text: "Elige un momento sin prisa y usa esa frase como punto de partida, no como reclamo." },
      { horizon: "Si hay riesgo", text: "Si en algún momento sientes miedo por tu seguridad, esto deja de ser solo un conflicto: busca apoyo humano." },
    ],
    question: "¿Es un conflicto puntual, algo que se repite seguido, o te preocupa tu seguridad?",
    choices: ["Es puntual", "Se repite seguido", "Me preocupa mi seguridad"],
    sourceIds: ["who-ai-health", "nice-self-harm"],
  }),
  "sueño": () => ({
    mode: "standard", topic: "sueño", label: "Sueño y descanso", title: "Busquemos qué está interfiriendo con tu descanso",
    introduction: "Dormir mal puede venir de pensamientos que no bajan de intensidad, hábitos antes de acostarte o un horario irregular. Antes de cambiar todo, conviene ver qué pesa más.",
    insight: "Un par de noches difíciles no es necesariamente un problema clínico; si se vuelve frecuente y afecta tu día, vale la pena una consulta profesional.",
    steps: [
      { horizon: "Antes de dormir", text: "Nota qué pasa en la hora previa a acostarte: pantallas, cafeína, pendientes sin cerrar." },
      { horizon: "Al acostarte", text: "Si los pensamientos no bajan, escribe una lista breve de pendientes para \"soltarlos\" del cuerpo, no de la mente." },
      { horizon: "Rutina", text: "Elige un solo cambio pequeño y sostenlo varias noches antes de agregar otro." },
    ],
    question: "¿El problema es más para conciliar el sueño, para mantenerlo o pensamientos que no bajan?",
    choices: ["Cuesta conciliarlo", "Me despierto seguido", "Pensamientos que no paran"],
    sourceIds: ["who-ai-health"],
  }),
  "pánico": () => ({
    mode: "support", topic: "pánico", label: "Síntomas de pánico", title: "Primero el cuerpo, después el porqué",
    introduction: "Un episodio de pánico puede sentirse como si algo estuviera fallando gravemente en tu cuerpo: corazón acelerado, falta de aire, mareo. No puedo saber por chat si esto es solo un episodio de pánico o algo médico, así que si la sensación es nueva, distinta a otras veces o muy intensa, trátala primero como posible urgencia.",
    insight: "No es que 'sea solo ansiedad': el cuerpo reacciona como si hubiera una amenaza real, aunque no la haya. Nombrar esto suele ayudar a bajar la intensidad, sin minimizar lo que sientes.",
    steps: [
      { horizon: "Descartar urgencia", text: "Si tienes dolor de pecho que no cede, dificultad para respirar que empeora, desmayo o esto se siente distinto a otras veces, busca atención médica o llama al 911." },
      { horizon: "Si no hay señales de alarma", text: "Prueba el 5-4-3-2-1: nombra 5 cosas que ves, 4 que puedes tocar, 3 que oyes, 2 que hueles y 1 que puedes saborear." },
      { horizon: "Después", text: "Si estos episodios son nuevos, muy frecuentes o te impiden hacer cosas cotidianas, vale la pena una evaluación profesional." },
    ],
    question: "¿Tienes alguna señal física que te preocupe además del pánico, o prefieres que sigamos con la respiración?",
    choices: ["Me preocupa algo físico", "Seguir con la respiración", "Ya está bajando"],
    sourceIds: ["nice-panic-anxiety", "who-ai-health"],
  }),
  "medicación": () => ({
    mode: "support", topic: "medicación", label: "Medicamentos", title: "Sobre esto no puedo opinar, pero sí puedo ayudarte a preguntarlo bien",
    introduction: "Las decisiones sobre iniciar, suspender o cambiar la dosis de un medicamento son exclusivamente de quien te lo recetó. No es que no quiera ayudarte; es que una recomendación mía aquí podría ser insegura sin conocer tu historial completo.",
    insight: "Suspender de golpe algunos medicamentos puede tener efectos importantes en el cuerpo, incluso si te sientes mejor. Eso también se consulta con quien te lo recetó, no se decide solo.",
    steps: [
      { horizon: "Ahora", text: "Si sientes algo físicamente grave o inusual, eso es una urgencia médica: 911 o el servicio de urgencias más cercano." },
      { horizon: "Si es una duda", text: "Anota qué notaste, desde cuándo y qué tan seguido pasa, para describirlo con precisión." },
      { horizon: "Siguiente paso", text: "Contacta a quien te recetó o a una farmacia con farmacéutico disponible; muchas dudas de efectos secundarios se resuelven ahí sin esperar la siguiente cita." },
    ],
    question: "¿Tu duda es sobre un efecto que sientes, sobre olvidar una toma, o sobre querer dejarlo?",
    choices: ["Un efecto que siento", "Olvidé una toma", "Quiero dejarlo"],
    sourceIds: ["who-ai-health"],
  }),
  "diagnóstico": () => ({
    mode: "standard", topic: "diagnóstico", label: "Preparar una evaluación", title: "Un diagnóstico lo da una evaluación real, no un chat",
    introduction: "Puedo ayudarte a llegar mejor preparado a esa cita, pero no puedo decirte qué tienes. Quien te evalúe podría usar herramientas de tamizaje validadas (como cuestionarios de ánimo, ansiedad o atención), pero incluso esas son un punto de partida, no el diagnóstico final.",
    insight: "Un resultado positivo en cualquier cuestionario de tamizaje solo indica que conviene profundizar; nunca confirma por sí solo un trastorno.",
    steps: [
      { horizon: "Antes de la cita", text: "Anota ejemplos concretos con fecha aproximada: qué pasó, qué tanto interfirió y desde cuándo." },
      { horizon: "Qué llevar", text: "Incluye qué has intentado ya, aunque haya ayudado solo un poco, y qué esperas obtener de la cita." },
      { horizon: "Si tienes nervios", text: "Es normal sentir ansiedad antes de una evaluación; puedes decírselo a quien te atienda, forma parte de la conversación." },
    ],
    question: "¿Quieres que te ayude a organizar ejemplos concretos o prefieres hablar primero de los nervios por la cita?",
    choices: ["Organizar ejemplos", "Hablar de los nervios", "Ya sé qué voy a decir"],
    sourceIds: ["nimh-asq", "phq9-gad7-mx", "pcl5-mx"],
  }),
  apoyo: () => ({
    mode: "support", topic: "apoyo", label: "Apoyar a otra persona", title: "Acompañar bien no significa cargar con todo",
    introduction: "Ayuda saber qué necesita esa persona ahora mismo, sin asumir que tienes que resolverlo tú solo. Escuchar sin presionar y ayudarla a llegar a apoyo adecuado suele valer más que tener la respuesta perfecta.",
    insight: "Tu bienestar también importa aquí. Acompañar a alguien en crisis por mucho tiempo sin apoyo propio puede agotarte a ti también.",
    steps: [
      { horizon: "Si hay peligro inmediato", text: "Si esa persona habla de quitarse la vida, se ha lastimado, o no puedes contactarla, no esperes: llama al 911 o dile que llame a Línea de la Vida 800 911 2000." },
      { horizon: "Si no es urgente", text: "Pregúntale directamente qué necesita ahora: escuchar, distraerse, o ayuda para buscar apoyo profesional. No asumas por ella." },
      { horizon: "Tus límites", text: "Puedes acompañar sin estar disponible 24/7. Buscar a alguien más que también apoye no es abandonarla." },
    ],
    question: "¿La situación de esa persona es urgente ahora mismo, o quieres pensar en cómo acompañarla en general?",
    choices: ["Es urgente ahora", "Cómo acompañarla en general", "Necesito cuidarme yo también"],
    sourceIds: ["who-pfa", "linea-vida"],
  }),
  autocuidado: () => ({
    mode: "standard", topic: "autocuidado", label: "Autocuidado", title: "Un hábito sostenible vale más que un cambio grande que no dura",
    introduction: "El autocuidado no es una lista de diez cosas que hacer perfecto; es sostener uno o dos hábitos pequeños en las áreas que más pesan: descanso, movimiento, alimentación, conexión con otros y sentido de propósito.",
    insight: "No hace falta esperar una crisis para cuidarte. Elegir esto de forma preventiva también es válido.",
    steps: [
      { horizon: "Elige un área", text: "¿Cuál de estas cinco pesa más ahora: dormir, moverte, comer con regularidad, ver a otras personas, o sentir que haces algo con propósito?" },
      { horizon: "Hazlo pequeño", text: "Elige la versión más chica posible de un cambio en esa área: no 'dormir 8 horas', sino 'apagar la pantalla 15 minutos antes'." },
      { horizon: "Sostenlo", text: "Prueba ese único cambio varios días antes de agregar otro. La constancia importa más que la cantidad." },
    ],
    question: "¿Cuál de esas áreas eliges para empezar?",
    choices: ["Dormir mejor", "Moverme más", "Conectar con otros", "Sentido de propósito"],
    sourceIds: ["who-selfhelp"],
  }),
};

export function createReply(input: string, previousTopic: ChatTopic = "inicio"): ConversationReply {
  const faqKey = detectFaq(input);
  if (faqKey && !detectSafetySignal(input)) return faqReply(faqKey, previousTopic);

  const topic = getTopic(input);

  if (topic === "seguridad") return {
    mode: "safety",
    topic,
    label: "Prioridad: conexión humana inmediata",
    title: "Paremos aquí y prioricemos tu seguridad",
    introduction: "Detecté una frase explícita relacionada con peligro o daño. No voy a intentar resolver esto solo dentro de un chat ni a asignarte una puntuación.",
    insight: "La acción más segura es conectar ahora con una persona capaz de intervenir y reducir el acceso a cualquier medio de daño mientras llega apoyo.",
    steps: [
      { horizon: "Ahora", text: "Si el peligro es inmediato, llama al 911 o ve al servicio de urgencias más cercano." },
      { horizon: "En este momento", text: "Contacta a una persona de confianza y dile claramente: “Necesito que te quedes conmigo o me ayudes a llegar a un lugar seguro”." },
      { horizon: "Apoyo nacional", text: "Línea de la Vida: 800 911 2000, disponible todos los días. KAHY no realiza la llamada por ti." },
    ],
    question: "¿Puedes contactar ahora a emergencias o a una persona de confianza?",
    choices: ["Abrir opciones de ayuda", "Puedo contactar a alguien", "Necesito ver el número"],
    sourceIds: ["nice-self-harm", "nimh-asq", "linea-vida"],
    openHelp: true,
  };

  // Si el tema no cambió respecto al turno anterior, damos continuidad en vez de repetir la tarjeta inicial.
  if (topic === previousTopic && topic !== "inicio") {
    const followUp = followUpReply(topic, input);
    if (followUp) return followUp;
  }

  if (topic === "adicciones") return {
    mode: "support", topic, label: "Consumo y seguridad", title: "Separemos seguridad, patrón de consumo y apoyo",
    introduction: "Lo que cuentas puede necesitar más que fuerza de voluntad. Para orientarte con prudencia, conviene distinguir si hay una urgencia física, qué función está cumpliendo el consumo y quién puede acompañar el cambio.",
    insight: "No es seguro improvisar una suspensión brusca cuando puede existir abstinencia; una valoración médica es importante si hay temblores intensos, confusión, convulsiones, dificultad para respirar o pérdida de conciencia.",
    steps: [
      { horizon: "Seguridad hoy", text: "Evita conducir, mezclar sustancias o quedarte solo si te sientes físicamente mal. Ante pérdida de conciencia o respiración anormal, llama al 911." },
      { horizon: "Entender el patrón", text: "Anota qué pasó antes del consumo, qué buscabas aliviar y qué consecuencia apareció. Es información para conversar con un profesional, no una calificación moral." },
      { horizon: "Siguiente apoyo", text: "Elige una persona o servicio con quien hablar hoy. La Línea de la Vida también brinda orientación sobre consumo." },
    ],
    question: "¿Lo más urgente es una reacción física, evitar consumir hoy o encontrar atención cercana?",
    choices: ["Tengo síntomas físicos", "Quiero evitar consumir hoy", "Quiero buscar atención"], sourceIds: ["linea-vida", "nida-language"],
  };

  if (topic === "neurodivergencia") return {
    mode: "support", topic, label: "Enfoque neuroafirmativo", title: "Primero reduzcamos carga; después resolvemos la demanda",
    introduction: "Si hay sobrecarga sensorial, ejecutiva o social, insistir en “rendir normal” suele añadir presión. Podemos separar el ambiente, la tarea y la forma de pedir un ajuste.",
    insight: "Esta conversación no puede confirmar autismo o TDAH. Sí puede ayudarte a describir necesidades concretas sin convertirlas en un juicio sobre ti.",
    steps: [
      { horizon: "Ahora", text: "Reduce una sola fuente de carga: brillo, sonido, conversación, ropa incómoda o número de instrucciones. No cambies todo a la vez." },
      { horizon: "Comunicar", text: "Usa una petición observable: “Necesito diez minutos sin preguntas” o “Dame la instrucción por escrito y de una en una”." },
      { horizon: "Aprender del episodio", text: "Cuando pase, registra señales tempranas y el ajuste que ayudó. Ese mapa puede servir para pedir apoyos consistentes." },
    ],
    question: "¿Qué pesa más ahora: los estímulos, empezar una tarea o una interacción social?",
    choices: ["Demasiados estímulos", "No logro empezar", "Una situación social"], sourceIds: ["nice-adhd", "nice-autism"],
  };

  if (topic === "trauma") return {
    mode: "support", topic, label: "Apoyo informado por trauma", title: "No necesitas contar todos los detalles para recibir apoyo",
    introduction: "Cuando un recuerdo o sensación se siente demasiado presente, el objetivo inmediato no es obligarte a revivirlo, sino recuperar orientación, elección y conexión con el aquí y ahora.",
    insight: "Evitar preguntas invasivas protege tu control. Si hay violencia actual, la prioridad cambia a seguridad y apoyo humano inmediato.",
    steps: [
      { horizon: "Orientarte", text: "Mira a tu alrededor y ubica la fecha, el lugar y una diferencia concreta entre el recuerdo y este momento." },
      { horizon: "Recuperar elección", text: "Elige entre sentarte, caminar lentamente, tomar agua o acercarte a una salida. La opción la decides tú." },
      { horizon: "Después", text: "Anota solo lo necesario para pedir ayuda: qué activa la reacción, cuánto dura y qué te ayuda. No necesitas documentar el evento completo aquí." },
    ],
    question: "¿Esto es un recuerdo del pasado o hay una situación de violencia o peligro ocurriendo ahora?",
    choices: ["Es un recuerdo", "Hay peligro ahora", "Prefiero no decirlo"], sourceIds: ["nice-ptsd", "who-pfa", "pcl5-mx"],
  };

  if (topic === "duelo" || topic === "soledad" || topic === "relaciones" || topic === "sueño" || topic === "pánico" || topic === "medicación" || topic === "diagnóstico" || topic === "apoyo" || topic === "autocuidado") {
    const build = initialTopicReplies[topic];
    if (build) return build();
  }

  if (topic === "ánimo") return {
    mode: "support", topic, label: "Ánimo bajo", title: "Hagamos un plan que no dependa de sentirte motivado primero",
    introduction: "Cuando la energía es baja, una lista grande puede convertirse en más evidencia de fracaso. Conviene proteger necesidades básicas, reducir el tamaño de la acción y añadir contacto humano.",
    insight: "Esto no determina si tienes depresión. Importan la duración, el impacto cotidiano y cualquier pensamiento de muerte o daño, que requiere atención humana inmediata.",
    steps: [
      { horizon: "Próximos 10 minutos", text: "Elige una necesidad básica posible: agua, alimento sencillo, medicamento indicado o cambiarte a un lugar con luz y compañía." },
      { horizon: "Hoy", text: "Envía un mensaje específico: “No estoy bien y me ayudaría que me escribieras o estuvieras conmigo un rato”." },
      { horizon: "Continuidad", text: "Si esto persiste o interfiere con dormir, comer, estudiar o trabajar, prepara una consulta profesional con ejemplos concretos de esos cambios." },
    ],
    question: "¿Qué está más afectado hoy: cuidarte, cumplir pendientes o sentirte acompañado?",
    choices: ["Cuidado básico", "Pendientes", "Necesito compañía"], sourceIds: ["nice-depression", "phq9-gad7-mx", "linea-vida"],
  };

  if (topic === "organización") return {
    mode: "standard", topic, label: "Función ejecutiva", title: "Saquemos la tarea de tu cabeza y encontremos la puerta de entrada",
    introduction: "El bloqueo no siempre significa falta de interés. La tarea puede ser ambigua, demasiado grande, poco estimulante o competir con demasiadas señales al mismo tiempo.",
    insight: "En vez de planear todo, vamos a producir una acción visible que reduzca incertidumbre y pueda empezar con poca energía.",
    steps: [
      { horizon: "Definir", text: "Escribe qué tendría que existir para decir “esto avanzó”, sin usar palabras generales como hacer o terminar." },
      { horizon: "Reducir", text: "Elige una acción de menos de cinco minutos: abrir el archivo, reunir materiales o escribir tres encabezados." },
      { horizon: "Proteger el inicio", text: "Retira una distracción y usa un temporizador corto. Al terminar, decide de nuevo; no te obligues a prometer una hora completa." },
    ],
    question: "¿La barrera principal es no saber por dónde empezar, sostener la atención o sentir que debe quedar perfecto?",
    choices: ["No sé por dónde", "Pierdo la atención", "Perfeccionismo"], sourceIds: ["who-ai-health"],
  };

  if (topic === "acceso") return {
    mode: "standard", topic, label: "Brecha de atención", title: "Preparemos una búsqueda que funcione con distancia y pocos datos",
    introduction: "La ayuda en Michoacán no se limita a Morelia, Uruapan y Zamora: la Secretaría de Salud reporta Centros Comunitarios de Salud Mental y Adicciones (CECOSAMA) también en Huetamo, Zitácuaro y Lázaro Cárdenas. Aun así, conviene comparar canal, costo, credenciales, horario y qué pasa en una urgencia antes de agendar.",
    insight: "El directorio de especialistas de esta demostración es ficticio. Una versión operativa deberá sincronizarse con un directorio real y verificado, con fecha de última revisión, y ofrecer alternativas de voz o texto de bajo consumo, no solo videollamada.",
    steps: [
      { horizon: "Definir necesidad", text: "Anota si buscas evaluación, psicoterapia, apoyo por consumo, orientación familiar o atención médica. Eso evita derivaciones innecesarias." },
      { horizon: "Reducir barreras", text: "Pregunta por sesiones telefónicas, chat, horarios agrupados y requisitos de conectividad antes de agendar." },
      { horizon: "Verificar", text: "Confirma identidad profesional, alcance del servicio, privacidad, costo y protocolo de emergencia." },
    ],
    question: "¿Qué barrera necesitas resolver primero: distancia, costo, conectividad o encontrar el tipo correcto de profesional?",
    choices: ["Distancia", "Costo", "Pocos datos", "No sé qué especialista"], sourceIds: ["conasama-cecosama", "mexico-privacy"],
  };

  if (topic === "estrés") return {
    mode: "standard", topic, label: "Estrés y ansiedad", title: "No vamos a reducir todo a “respira”: primero ubiquemos la presión",
    introduction: "La ansiedad puede mezclar una alarma corporal, pensamientos que anticipan daño y una situación concreta que sí necesita una decisión. Cada parte requiere una respuesta distinta.",
    insight: "Una práctica de calma puede bajar intensidad, pero no reemplaza resolver la demanda, pedir apoyo o consultar si los síntomas son nuevos, intensos o persistentes.",
    steps: [
      { horizon: "Cuerpo", text: "Afloja una demanda física: siéntate, toma agua y alarga la exhalación solo si te resulta cómoda. Si hay dolor fuerte de pecho, desmayo o dificultad respiratoria, busca atención médica." },
      { horizon: "Situación", text: "Divide en dos columnas: lo que requiere una acción hoy y lo que solo estás intentando predecir. Elige una acción de la primera columna." },
      { horizon: "Apoyo", text: "Define a quién informar y qué pedir exactamente: tiempo, información, compañía o ayuda práctica." },
    ],
    question: "¿La presión viene principalmente de tu cuerpo, de pensamientos repetitivos o de un problema concreto?",
    choices: ["Sensaciones físicas", "Pensamientos repetitivos", "Problema concreto"], sourceIds: ["nice-panic-anxiety", "who-ai-health"],
  };

  return {
    mode: "standard",
    presentation: "conversation",
    topic: "conversación",
    label: "Conversación abierta",
    title: "Te sigo leyendo",
    introduction: `Leí esta parte: “${truncateQuote(input)}”. En este momento está activo el respaldo local, que es más limitado para temas abiertos, pero podemos seguir conversando sin forzar lo que dices dentro de una categoría que no corresponde.`,
    insight: "Si me cuentas qué te gustaría obtener de esta conversación, puedo orientarte mejor mientras se recupera la respuesta generativa.",
    steps: [],
    question: "¿Quieres que te escuche, que pensemos opciones o que resolvamos una duda concreta?",
    choices: ["Solo quiero contarlo", "Pensemos opciones", "Tengo una duda concreta"],
    sourceIds: [],
  };
}
