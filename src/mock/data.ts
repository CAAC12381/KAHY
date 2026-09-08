import type { FlowerId, MainView, MascotId } from "../types";

export const navItems: Array<{ id: MainView; label: string }> = [
  { id: "home", label: "Inicio" },
  { id: "chat", label: "Chat" },
  { id: "activities", label: "Actividades" },
  { id: "specialists", label: "Especialistas" },
  { id: "profile", label: "Perfil" },
];

const petAsset = (path: string) => `${import.meta.env.BASE_URL}assets/pets/${path}`;

export const mascots: Array<{
  id: MascotId;
  name: string;
  animal: string;
  description: string;
  /** Growth stages in order, from newly-arrived baby to grown-up. */
  stages: string[];
  /** Shown instead of the current stage when the companion has been neglected. */
  sadImage: string;
}> = [
  {
    id: "vaca",
    name: "Moka",
    animal: "vaquita",
    description: "Tierna y juguetona",
    stages: [petAsset("animales/vaca/vaca.jpg"), petAsset("animales/vaca/vaca-2.jpg"), petAsset("animales/vaca/vaca-3.jpg")],
    sadImage: petAsset("animales/tristes/vaca-triste.png"),
  },
  {
    id: "pollito",
    name: "Pío",
    animal: "pollito",
    description: "Curioso y alegre",
    stages: [petAsset("animales/pollito/pollito.jpg"), petAsset("animales/pollito/pollito-2.jpg"), petAsset("animales/pollito/pollito-3.jpg"), petAsset("animales/pollito/pollito-4.jpg")],
    sadImage: petAsset("animales/tristes/pollito-triste.png"),
  },
  {
    id: "camaleon",
    name: "Lima",
    animal: "camaleón",
    description: "Sereno y creativo",
    stages: [petAsset("animales/camaleon/camaleon.jpg"), petAsset("animales/camaleon/camaleon-1.jpg"), petAsset("animales/camaleon/camaleon-2.jpg"), petAsset("animales/camaleon/camaleon-3.jpg"), petAsset("animales/camaleon/camaleon-4.jpg")],
    sadImage: petAsset("animales/tristes/camaleon-triste.png"),
  },
  {
    id: "tortuga",
    name: "Tita",
    animal: "tortuguita",
    description: "Tranquila y dulce",
    stages: [petAsset("animales/tortuga/tortuga.png"), petAsset("animales/tortuga/tortuga-1.jpg"), petAsset("animales/tortuga/tortuga-2.jpg"), petAsset("animales/tortuga/tortuga-3.jpg")],
    sadImage: petAsset("animales/tristes/tortuga-triste.png"),
  },
];

export const flowers: Array<{
  id: FlowerId;
  name: string;
  description: string;
  /** Healthy growth stages in order, from seed to full bloom. */
  stages: string[];
  /** Shown instead of the current stage when the companion has been neglected. */
  wiltedImage: string;
}> = [
  { id: "Clavel", name: "Clavel", description: "Resistente y colorido", stages: [1, 2, 3].map((phase) => petAsset(`plantas/Clavel/Fase${phase}.jpg`)), wiltedImage: petAsset("plantas/Clavel/Fase4.jpg") },
  { id: "Gerbera", name: "Gerbera", description: "Alegre y luminosa", stages: [1, 2, 3].map((phase) => petAsset(`plantas/Gerbera/Fase${phase}.jpg`)), wiltedImage: petAsset("plantas/Gerbera/Fase4.jpg") },
  { id: "Orquidea", name: "Orquídea", description: "Delicada y serena", stages: [1, 2, 3].map((phase) => petAsset(`plantas/Orquidea/Fase${phase}.jpg`)), wiltedImage: petAsset("plantas/Orquidea/Fase4.jpg") },
  { id: "Tulipan", name: "Tulipán", description: "Sencillo y constante", stages: [1, 2, 3].map((phase) => petAsset(`plantas/Tulipan/Fase${phase}.jpg`)), wiltedImage: petAsset("plantas/Tulipan/Fase4.jpg") },
];

export const locations = ["Morelia", "Uruapan", "Zamora", "Otra zona de Michoacán"];

export const goals = [
  "Bajar el estrés",
  "Organizar mis tareas",
  "Entender lo que siento",
  "Practicar hábitos de calma",
  "Encontrar orientación profesional",
];

export const informationStyles = [
  { id: "brief", label: "Breve y directo", description: "Pocos pasos y frases cortas." },
  { id: "guided", label: "Guiado", description: "Explicaciones claras, paso por paso." },
  { id: "visual", label: "Más visual", description: "Tarjetas, símbolos y menos texto." },
];

export const specialists = [
  {
    id: "demo-ana",
    name: "Dra. Ana R.",
    focus: "Ansiedad y manejo del estrés",
    format: "Videollamada de demostración",
    availability: "Mar y jue · 16:00–19:00",
    note: "Perfil ficticio para probar filtros, perfil y agenda.",
    initials: "AR",
  },
  {
    id: "demo-luis",
    name: "Psic. Luis M.",
    focus: "TDAH y organización cotidiana",
    format: "Chat o videollamada de demostración",
    availability: "Lun, mié y vie · 10:00–14:00",
    note: "Perfil ficticio; no representa disponibilidad real.",
    initials: "LM",
  },
  {
    id: "demo-carmen",
    name: "Mtra. Carmen T.",
    focus: "Autismo y acompañamiento familiar",
    format: "Videollamada de demostración",
    availability: "Sáb · 09:00–13:00",
    note: "Perfil ficticio para visualizar una futura red de atención.",
    initials: "CT",
  },
  {
    id: "demo-diego",
    name: "Psic. Diego P.",
    focus: "Estrés traumático y hábitos de autocuidado",
    format: "Chat de demostración",
    availability: "Mar y vie · 12:00–17:00",
    note: "Perfil ficticio; la plataforma aún no ofrece terapia.",
    initials: "DP",
  },
];

export type KnowledgeSource = {
  id: string;
  title: string;
  organization: string;
  category: "seguridad" | "privacidad" | "instrumentos" | "ayuda";
  summary: string;
  productRule: string;
  url: string;
  verifiedAt: string;
};

export const trustedSources: KnowledgeSource[] = [
  {
    id: "who-ai-health",
    title: "Ética y gobernanza de la IA para la salud",
    organization: "Organización Mundial de la Salud",
    category: "seguridad",
    summary: "La tecnología debe proteger autonomía, bienestar, transparencia y responsabilidad humana.",
    productRule: "KAHY no se presenta como terapeuta, no diagnostica y explica siempre los límites de la demostración.",
    url: "https://www.who.int/publications/i/item/9789240029200",
    verifiedAt: "7 sep 2026",
  },
  {
    id: "nice-self-harm",
    title: "Autolesión: evaluación y manejo",
    organization: "NICE",
    category: "seguridad",
    summary: "Las escalas no deben utilizarse para predecir suicidio ni para clasificar personas en riesgo bajo, medio o alto.",
    productRule: "El prototipo no calcula niveles de riesgo ni toma decisiones clínicas automáticas.",
    url: "https://www.nice.org.uk/guidance/ng225/chapter/recommendations",
    verifiedAt: "7 sep 2026",
  },
  {
    id: "nimh-asq",
    title: "ASQ Toolkit",
    organization: "National Institute of Mental Health",
    category: "instrumentos",
    summary: "Una detección positiva necesita una evaluación de seguridad posterior por personal capacitado.",
    productRule: "Los cuestionarios clínicos quedan fuera de esta fase visual hasta contar con protocolo y supervisión profesional.",
    url: "https://www.nimh.nih.gov/research/research-conducted-at-nimh/asq-toolkit-materials",
    verifiedAt: "7 sep 2026",
  },
  {
    id: "mexico-privacy",
    title: "Ley Federal de Protección de Datos Personales",
    organization: "Cámara de Diputados, México",
    category: "privacidad",
    summary: "Los datos de salud son sensibles y requieren protección reforzada, finalidad clara y consentimiento aplicable.",
    productRule: "Esta versión funciona sin cuentas reales, sin expediente y sin enviar respuestas a un servidor.",
    url: "https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf",
    verifiedAt: "7 sep 2026",
  },
  {
    id: "linea-vida",
    title: "Línea de la Vida",
    organization: "CONASAMA, Gobierno de México",
    category: "ayuda",
    summary: "Servicio nacional de orientación disponible todos los días en el 800 911 2000.",
    productRule: "La ayuda urgente debe escalar a personas y servicios reales; nunca depender solamente de una interfaz automática.",
    url: "https://www.gob.mx/conasama/es/articulos/linea-de-la-vida-800-911-2000?idiom=es",
    verifiedAt: "7 sep 2026",
  },
];

export const resourceCards = [
  {
    id: "pause",
    tag: "Práctica de calma",
    title: "Pausa de un minuto",
    time: "1 min",
    description: "Una guía breve para notar el cuerpo y volver al momento presente.",
    body: "Apoya ambos pies, mira un objeto cercano y nombra en silencio tres detalles que puedas ver. Después deja salir el aire lentamente. Puedes detenerte cuando quieras.",
  },
  {
    id: "task",
    tag: "Organización",
    title: "Convertir una tarea en el siguiente paso",
    time: "2 min",
    description: "Reduce una tarea grande a una acción pequeña y visible.",
    body: "Escribe la tarea. Pregunta: ¿qué acción física puedo hacer en menos de cinco minutos? Elige solo una, por ejemplo: abrir el documento o colocar los materiales sobre la mesa.",
  },
  {
    id: "sensory",
    tag: "Accesibilidad",
    title: "Ajustar estímulos",
    time: "2 min",
    description: "Ideas generales para bajar carga visual o auditiva sin asumir un diagnóstico.",
    body: "Reduce una fuente de estímulo a la vez: brillo, sonido, notificaciones o movimiento. Observa si el cambio te resulta cómodo y conserva solo lo que te ayude.",
  },
];

export function getDemoReply(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("tarea") || normalized.includes("organ")) {
    return "Podemos probar algo pequeño: escribe una sola tarea y conviértela en una acción de menos de cinco minutos. Esta respuesta es un ejemplo predefinido; KAHY no analiza clínicamente lo que escribes.";
  }
  if (normalized.includes("ansiedad") || normalized.includes("estrés") || normalized.includes("estres")) {
    return "Si te sirve, podemos abrir una práctica breve de respiración o una pausa sensorial. Esta demostración no evalúa síntomas ni sustituye atención profesional.";
  }
  if (normalized.includes("ayuda") || normalized.includes("crisis") || normalized.includes("peligro")) {
    return "Puedo mostrar el panel de ayuda inmediata con recursos humanos y de emergencia. Este chat de demostración no puede intervenir ni valorar una situación de riesgo.";
  }
  return "Gracias por escribirlo. En este prototipo las respuestas son predefinidas y no interpretan tu situación. Puedes elegir una actividad breve, explorar recursos o abrir la sección de especialistas de demostración.";
}
