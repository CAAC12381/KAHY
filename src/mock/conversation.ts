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
  | "sueño";

export type ConversationReply = {
  mode: ReplyMode;
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

const safetyPatterns = [
  /me quiero morir/i,
  /quiero morir/i,
  /no quiero vivir/i,
  /suicid/i,
  /matarme/i,
  /me voy a matar/i,
  /acabar con mi vida/i,
  /hacerme daño/i,
  /me quiero hacer daño/i,
  /quiero hacerme daño/i,
  /pienso hacerme daño/i,
  /lastimarme/i,
  /quiero lastimarme/i,
  /voy a lastimarme/i,
  /no puedo mantenerme a salvo/i,
  /me (corté|corte|estoy cortando)/i,
  /(tengo|hice|ya tengo).{0,24}(un plan|una forma).{0,40}(morir|matarme|hacerme daño|suicid)/i,
  /despedirme de todos/i,
  /ojalá no despertara/i,
  /sobredosis/i,
  /tomé demasiadas pastillas/i,
  /no (está|esta) respirando/i,
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
  if (includesAny(text, ["alcohol", "droga", "adiccion", "consumo", "sustancia", "abstinencia", "cigarro", "fumar", "vapeo", "apuestas", "ludopatia"])) return "adicciones";
  if (includesAny(text, ["autismo", "autista", "tdah", "neurodiv", "sensorial", "sobrecarga", "estimulos", "hiperfoco", "estimming"])) return "neurodivergencia";
  if (includesAny(text, ["trauma", "recuerdo", "pesadilla", "flashback", "abuso", "violencia", "revivo", "me disocio", "disociacion"])) return "trauma";
  if (includesAny(text, ["duelo", "murio", "fallecio", "perdi a", "muerte de", "luto", "lo perdi", "la perdi", "ya no esta conmigo"])) return "duelo";
  if (includesAny(text, ["me siento solo", "me siento sola", "estoy solo", "estoy sola", "soledad", "aislad", "sin nadie", "nadie con quien hablar", "no tengo amigos"])) return "soledad";
  if (includesAny(text, ["pelea con mi pareja", "mi familia no me entiende", "conflicto familiar", "discuti con", "rompimos", "terminamos la relacion", "terminamos con", "relacion toxica", "mi pareja", "mi novio", "mi novia", "mi mama y yo", "mi papa y yo", "mis papas"])) return "relaciones";
  if (includesAny(text, ["no puedo dormir", "insomnio", "duermo mal", "desvelad", "trasnochando", "dormir bien", "pesadez para dormir"])) return "sueño";
  if (includesAny(text, ["depres", "triste", "sin energia", "desanimo", "animo bajo", "vacio", "agotad", "sin ganas de nada", "no disfruto"])) return "ánimo";
  if (includesAny(text, ["tarea", "organizar", "procrast", "pendiente", "concentr", "estudiar", "trabajo acumulado"])) return "organización";
  if (includesAny(text, ["psicolog", "especialista", "terapia", "atencion", "cita", "morelia", "uruapan", "zamora", "pueblo", "lejos", "directorio", "consulta"])) return "acceso";
  if (includesAny(text, ["ansiedad", "estres", "presion", "nervios", "panico", "preocup", "taquicardia", "ataque de panico"])) return "estrés";
  return "inicio";
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
  if (includesAny(text, ["gracias", "muchas gracias", "te agradezco", "se agradece"])) return "gracias";
  if (includesAny(text, ["adios", "hasta luego", "nos vemos", "me despido", "bye", "hasta pronto"])) return "despedida";
  if (/^\s*(hola+|holi+|buenas|buenos dias|buenas tardes|buenas noches|hey|que tal|ola)\b/.test(text) || text.trim() === "hola") return "saludo";
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
        introduction: "Puedo conversar sobre estrés y ansiedad, ánimo bajo, duelo, soledad, conflictos de relación, sueño, trauma reciente, sobrecarga neurodivergente, consumo o adicciones, organización de tareas y acceso a atención en tu zona.",
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
    choices: ["Tengo síntomas físicos", "Quiero evitar consumir hoy", "Quiero buscar atención"], sourceIds: ["linea-vida", "who-ai-health"],
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
    choices: ["Demasiados estímulos", "No logro empezar", "Una situación social"], sourceIds: ["who-ai-health"],
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
    choices: ["Es un recuerdo", "Hay peligro ahora", "Prefiero no decirlo"], sourceIds: ["who-ai-health", "nice-self-harm"],
  };

  if (topic === "duelo" || topic === "soledad" || topic === "relaciones" || topic === "sueño") {
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
    choices: ["Cuidado básico", "Pendientes", "Necesito compañía"], sourceIds: ["who-ai-health", "linea-vida"],
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
    introduction: "Fuera de las ciudades grandes, el primer obstáculo puede ser encontrar una opción verificable y sostenible. Conviene comparar canal, costo, credenciales, horario y qué pasa en una urgencia.",
    insight: "El directorio actual es ficticio. Una versión operativa deberá verificar profesionales y ofrecer alternativas de voz o texto de bajo consumo, no solo videollamada.",
    steps: [
      { horizon: "Definir necesidad", text: "Anota si buscas evaluación, psicoterapia, apoyo por consumo, orientación familiar o atención médica. Eso evita derivaciones innecesarias." },
      { horizon: "Reducir barreras", text: "Pregunta por sesiones telefónicas, chat, horarios agrupados y requisitos de conectividad antes de agendar." },
      { horizon: "Verificar", text: "Confirma identidad profesional, alcance del servicio, privacidad, costo y protocolo de emergencia." },
    ],
    question: "¿Qué barrera necesitas resolver primero: distancia, costo, conectividad o encontrar el tipo correcto de profesional?",
    choices: ["Distancia", "Costo", "Pocos datos", "No sé qué especialista"], sourceIds: ["mexico-privacy", "who-ai-health"],
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
    choices: ["Sensaciones físicas", "Pensamientos repetitivos", "Problema concreto"], sourceIds: ["who-ai-health"],
  };

  // Tema no identificado por palabra clave: si veníamos de otro tema, damos continuidad genérica en vez de reiniciar.
  if (previousTopic !== "inicio") {
    return {
      mode: "standard",
      topic: previousTopic,
      label: "Seguimos en la conversación",
      title: "No identifiqué una palabra clave nueva, pero seguimos en esto",
      introduction: `Leo lo que compartes: “${truncateQuote(input)}”. No reconozco un tema nuevo específico, así que seguimos con lo que veníamos hablando para no perder el hilo.`,
      insight: "Puedes describirlo con otras palabras o elegir una opción de abajo si prefieres cambiar de tema.",
      steps: [
        { horizon: "Seguir", text: "Cuéntame un poco más sobre esta parte, con tus propias palabras." },
        { horizon: "Cambiar de tema", text: "O dime directamente qué tipo de apoyo necesitas ahora." },
      ],
      question: "¿Seguimos con esto o prefieres cambiar de tema?",
      choices: ["Seguir con esto", "Cambiar de tema", "Buscar atención"],
      sourceIds: ["who-ai-health"],
    };
  }

  return {
    mode: "standard", topic, label: "Conversación guiada", title: "Podemos ordenar esto sin asumir un diagnóstico",
    introduction: "Para ayudarte de forma más útil, necesito ubicar qué tipo de apoyo buscas ahora. Este motor usa rutas escritas y no interpreta clínicamente tu historia.",
    insight: "Puedes compartir solo lo que te resulte cómodo. Evita nombres completos, direcciones u otros datos identificables.",
    steps: [
      { horizon: "1 · Situación", text: "Describe en una frase qué está pasando, sin explicar toda la historia." },
      { horizon: "2 · Impacto", text: "Indica qué está afectando más: seguridad, cuerpo, sueño, tareas, consumo, relaciones o acceso a atención." },
      { horizon: "3 · Objetivo", text: "Elige qué necesitas de esta conversación: ordenar, hacer un plan, practicar una herramienta o buscar apoyo humano." },
    ],
    question: "¿Por dónde prefieres comenzar?",
    choices: ["Estrés o ansiedad", "Ánimo bajo", "Sobrecarga neurodivergente", "Consumo", "Buscar atención"],
    sourceIds: ["who-ai-health", "mexico-privacy"],
  };
}
