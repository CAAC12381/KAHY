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
  image: string;
  sadImage: string;
  gallery: string[];
}> = [
  {
    id: "vaca",
    name: "Moka",
    animal: "vaquita",
    description: "Tierna y juguetona",
    image: petAsset("animales/vaca/vaca.jpg"),
    sadImage: petAsset("animales/tristes/vaca-triste.png"),
    gallery: [petAsset("animales/vaca/vaca-2.jpg"), petAsset("animales/vaca/vaca-3.jpg")],
  },
  {
    id: "pollito",
    name: "Pío",
    animal: "pollito",
    description: "Curioso y alegre",
    image: petAsset("animales/pollito/pollito.jpg"),
    sadImage: petAsset("animales/tristes/pollito-triste.png"),
    gallery: [petAsset("animales/pollito/pollito-2.jpg"), petAsset("animales/pollito/pollito-3.jpg"), petAsset("animales/pollito/pollito-4.jpg")],
  },
  {
    id: "camaleon",
    name: "Lima",
    animal: "camaleón",
    description: "Sereno y creativo",
    image: petAsset("animales/camaleon/camaleon.jpg"),
    sadImage: petAsset("animales/tristes/camaleon-triste.png"),
    gallery: [petAsset("animales/camaleon/camaleon-1.jpg"), petAsset("animales/camaleon/camaleon-2.jpg"), petAsset("animales/camaleon/camaleon-3.jpg"), petAsset("animales/camaleon/camaleon-4.jpg")],
  },
  {
    id: "tortuga",
    name: "Tita",
    animal: "tortuguita",
    description: "Tranquila y dulce",
    image: petAsset("animales/tortuga/tortuga.png"),
    sadImage: petAsset("animales/tristes/tortuga-triste.png"),
    gallery: [petAsset("animales/tortuga/tortuga-1.jpg"), petAsset("animales/tortuga/tortuga-2.jpg"), petAsset("animales/tortuga/tortuga-3.jpg")],
  },
];

export const flowers: Array<{
  id: FlowerId;
  name: string;
  description: string;
  phases: string[];
}> = [
  { id: "Clavel", name: "Clavel", description: "Resistente y colorido", phases: [1, 2, 3, 4].map((phase) => petAsset(`plantas/Clavel/Fase${phase}.jpg`)) },
  { id: "Gerbera", name: "Gerbera", description: "Alegre y luminosa", phases: [1, 2, 3, 4].map((phase) => petAsset(`plantas/Gerbera/Fase${phase}.jpg`)) },
  { id: "Orquidea", name: "Orquídea", description: "Delicada y serena", phases: [1, 2, 3, 4].map((phase) => petAsset(`plantas/Orquidea/Fase${phase}.jpg`)) },
  { id: "Tulipan", name: "Tulipán", description: "Sencillo y constante", phases: [1, 2, 3, 4].map((phase) => petAsset(`plantas/Tulipan/Fase${phase}.jpg`)) },
];

export const locations = ["Morelia", "Uruapan", "Zamora", "Zitácuaro", "Huetamo", "Lázaro Cárdenas", "Otra zona de Michoacán"];

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
  {
    id: "who-pfa",
    title: "Primeros auxilios psicológicos: guía para trabajadores de campo",
    organization: "Organización Mundial de la Salud",
    category: "seguridad",
    summary: "Los primeros auxilios psicológicos son apoyo humano, práctico y no intrusivo; no equivalen a psicoterapia ni exigen narrar el evento a detalle.",
    productRule: "KAHY nunca pide describir un evento traumático como requisito para ayudar, y prioriza seguridad, elección y conexión con apoyo real por encima de retener la conversación.",
    url: "https://www.who.int/publications/i/item/9789241548205",
    verifiedAt: "7 sep 2026",
  },
  {
    id: "who-selfhelp",
    title: "En tiempos de estrés, haz lo que importa",
    organization: "Organización Mundial de la Salud",
    category: "instrumentos",
    summary: "Guía de autoayuda psicológica escalable y de bajo riesgo, disponible en español, para manejar el estrés cotidiano.",
    productRule: "Las prácticas de autocuidado que sugiere KAHY se basan en este tipo de material aprobado, nunca en técnicas terapéuticas intensivas.",
    url: "https://www.who.int/es/publications/b/53604",
    verifiedAt: "7 sep 2026",
  },
  {
    id: "nice-depression",
    title: "Depresión en adultos: tratamiento y manejo (NG222)",
    organization: "NICE",
    category: "seguridad",
    summary: "Un puntaje o síntoma aislado no autoriza a afirmar que alguien tiene depresión mayor; el ítem de muerte o autolesión siempre se atiende dentro de la ruta de seguridad.",
    productRule: "KAHY no diagnostica ánimo bajo ni depresión; describe posibilidades y prioriza cualquier señal de riesgo antes que el resto de la conversación.",
    url: "https://www.nice.org.uk/guidance/ng222",
    verifiedAt: "7 sep 2026",
  },
  {
    id: "nice-panic-anxiety",
    title: "Ansiedad generalizada y pánico en adultos (CG113)",
    organization: "NICE",
    category: "seguridad",
    summary: "Antes de calmar un episodio de pánico hay que descartar que los síntomas físicos correspondan a una urgencia médica.",
    productRule: "KAHY no asegura que un síntoma físico intenso 'es solo ansiedad'; orienta a grounding y sugiere evaluación si los episodios son nuevos, recurrentes o incapacitantes.",
    url: "https://www.nice.org.uk/guidance/cg113",
    verifiedAt: "7 sep 2026",
  },
  {
    id: "nice-ptsd",
    title: "Trastorno de estrés postraumático (NG116)",
    organization: "NICE",
    category: "seguridad",
    summary: "La atención informada por trauma prioriza seguridad, transparencia y control de la persona por encima de recopilar la historia completa del evento.",
    productRule: "KAHY nunca solicita relatar el evento traumático como condición para acompañar, y deja que la persona decida cuánto compartir.",
    url: "https://www.nice.org.uk/guidance/ng116",
    verifiedAt: "7 sep 2026",
  },
  {
    id: "nice-adhd",
    title: "Trastorno por déficit de atención e hiperactividad (NG87)",
    organization: "NICE",
    category: "seguridad",
    summary: "El diagnóstico de TDAH requiere una evaluación clínica y del desarrollo completa por un profesional cualificado; ninguna escala por sí sola basta.",
    productRule: "KAHY no confirma ni descarta TDAH; ayuda a nombrar necesidades concretas y a prepararse para una evaluación real.",
    url: "https://www.nice.org.uk/guidance/ng87/chapter/recommendations",
    verifiedAt: "7 sep 2026",
  },
  {
    id: "nice-autism",
    title: "Trastorno del espectro autista en adultos (CG142)",
    organization: "NICE",
    category: "seguridad",
    summary: "No existe una preferencia universal de lenguaje sobre autismo; cada persona puede indicar cómo prefiere que se hable de ella.",
    productRule: "KAHY pregunta preferencias de comunicación en vez de asumirlas, y no convierte una conversación en un diagnóstico.",
    url: "https://www.nice.org.uk/guidance/CG142/chapter/Recommendations",
    verifiedAt: "7 sep 2026",
  },
  {
    id: "phq9-gad7-mx",
    title: "Validación del PHQ-9 y GAD-7 en población mexicana",
    organization: "Estudios revisados por pares (San Luis Potosí, sobrevivientes de sismo, pacientes oncológicos)",
    category: "instrumentos",
    summary: "El PHQ-9 (depresión) y el GAD-7 (ansiedad) muestran buena confiabilidad y validez en muestras mexicanas; ambos son instrumentos de tamizaje, no de diagnóstico.",
    productRule: "KAHY no digitaliza ni puntúa estos cuestionarios; los menciona solo como referencia de lo que un profesional real podría usar en una evaluación.",
    url: "https://pubmed.ncbi.nlm.nih.gov/28195649/",
    verifiedAt: "7 sep 2026",
  },
  {
    id: "pcl5-mx",
    title: "Validación de la PCL-5 en adolescentes mexicanos (UdeG y Tecnológico de Zamora, Michoacán)",
    organization: "Revista de Psicología, Universidad Autónoma del Estado de México",
    category: "instrumentos",
    summary: "La PCL-5 es el único instrumento adaptado al DSM-5 para estrés postraumático validado en población mexicana, incluyendo un estudio realizado en Zamora, Michoacán.",
    productRule: "KAHY cita esta validación como evidencia de que existen instrumentos apropiados para la región, sin aplicarlos ni puntuarlos dentro del chat.",
    url: "https://revistapsicologia.uaemex.mx/article/view/26404",
    verifiedAt: "7 sep 2026",
  },
  {
    id: "nida-language",
    title: "Words Matter: lenguaje preferido para hablar de adicciones",
    organization: "National Institute on Drug Abuse (NIDA)",
    category: "ayuda",
    summary: "El lenguaje centrado en la persona ('persona que consume') reduce estigma frente a etiquetas identitarias ('adicto', 'drogadicto').",
    productRule: "KAHY evita etiquetas estigmatizantes en el tema de consumo y adicciones, incluso citando lo que la persona escribió.",
    url: "https://nida.nih.gov/sites/default/files/words_matter_handout.pdf",
    verifiedAt: "7 sep 2026",
  },
  {
    id: "conasama-cecosama",
    title: "Centros Comunitarios de Salud Mental y Adicciones en Michoacán",
    organization: "Secretaría de Salud de Michoacán / CONASAMA",
    category: "ayuda",
    summary: "Michoacán reporta CECOSAMA en Morelia, Uruapan, Huetamo, Zitácuaro, Zamora y Lázaro Cárdenas (agosto 2026), no solo en las tres ciudades más grandes.",
    productRule: "KAHY no asume que la ayuda regional se limita a Morelia, Uruapan y Zamora; el directorio real necesitaría sincronizarse con esta lista y su fecha de verificación.",
    url: "https://salud.michoacan.gob.mx/cuida-ssm-salud-mental-de-las-y-los-jovenes-a-traves-de-los-centros-de-salud-mental/",
    verifiedAt: "7 sep 2026",
  },
  {
    id: "inegi-suicidio",
    title: "Estadísticas de suicidio en México 2024",
    organization: "INEGI",
    category: "seguridad",
    summary: "8,856 defunciones por suicidio en personas de 10 años y más durante 2024, tasa nacional de 6.8 por cada 100 mil habitantes, mayor en hombres y población joven.",
    productRule: "Estos datos justifican tratar la detección y el escalamiento de crisis como un requisito de seguridad central del producto, no como una función opcional.",
    url: "https://www.inegi.org.mx/contenidos/saladeprensa/aproposito/2025/EAP_Suicidio_25.pdf",
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
