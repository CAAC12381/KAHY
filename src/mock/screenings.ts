import type { ScreeningId, ScreeningResult } from "../types";

export const screeningLegalNotice =
  "Herramienta de tamizaje informativo, no sustituye la valoración clínica profesional. Los resultados no son un diagnóstico: son un punto de partida para conversar con un profesional de salud si tú lo decides.";

/** Se muestra en cada pantalla de resultados, sin excepción. */
export const resultDisclaimer =
  "Esta es una orientación inicial, no un diagnóstico. La interpretación final corresponde a un profesional de la salud mental.";

export type ScreeningOption = { value: number; label: string };

/** Semáforo del resultado. */
export type BandLevel = "verde" | "amarillo" | "naranja" | "rojo";

/** `label` es corto (se guarda con el resultado); `message` usa lenguaje cuidadoso: "tus respuestas sugieren…", nunca "tienes…". */
export type ScreeningBand = { min: number; max: number; label: string; level: BandLevel; message: string };

export type ScreeningModule = 1 | 2 | 3 | 4;

export type ScreeningReference = { apa: string; url?: string };

export type ScreeningSubscale = { label: string; items: number[]; cutoff: number; positiveText: string };

export type ScreeningDefinition = {
  id: ScreeningId;
  name: string;
  fullName: string;
  focus: string;
  module: ScreeningModule;
  minutes: number;
  interval: string;
  /** Aclaración que se muestra antes de las preguntas (por ejemplo, qué es una bebida). */
  note?: string;
  items: string[];
  options: ScreeningOption[];
  /** Opciones propias de algunas preguntas (AUDIT); si no hay, se usan `options`. */
  itemOptions?: Partial<Record<number, ScreeningOption[]>>;
  /** How score/interpretation is derived. "sum": add all answers into `bands`. "thresholdCount": count items meeting a per-item threshold (ASRS Part A). */
  scoring:
    | { type: "sum"; maxScore: number; bands: ScreeningBand[] }
    | { type: "thresholdCount"; thresholds: number[]; positiveCount: number; positive: Omit<ScreeningBand, "min" | "max">; negative: Omit<ScreeningBand, "min" | "max"> };
  /** Subpuntajes que se muestran en el resultado (GAD-2 y PHQ-2 dentro del PHQ-4). */
  subscales?: ScreeningSubscale[];
  /** 0-based index of the item that must always surface crisis resources when endorsed (PHQ-9 item 9). */
  safetyItemIndex?: number;
  /** Preguntas (0-based) que activan el protocolo de crisis en cuanto se responden con `min` o más. */
  crisis?: { items: number[]; min: number };
  /** Reutiliza las primeras respuestas de otro instrumento (el AUDIT completo continúa el AUDIT-C). */
  prefillFrom?: { id: ScreeningId; count: number };
  /** Texto del sello "Validado en México": qué estudio lo respalda. */
  mexicoValidation: string;
  /** Referencias en formato APA (7.ª ed.). */
  references: ScreeningReference[];
  sourceIds: string[];
};

export const screeningModules: Record<ScreeningModule, { title: string; purpose: string; instruments: ScreeningId[] }> = {
  1: { title: "Bienestar general", purpose: "Tamizaje inicial muy breve para detectar malestar general. Es la puerta de entrada.", instruments: ["phq4", "k10"] },
  2: { title: "Estado de ánimo y ansiedad", purpose: "Profundiza cuando el módulo 1 sugiere síntomas.", instruments: ["phq9", "gad7"] },
  3: { title: "Riesgo específico", purpose: "Revisa factores de riesgo importantes, solo cuando hay indicios en módulos previos.", instruments: ["paykel", "auditc", "audit"] },
  4: { title: "Perfil complementario", purpose: "Opcional: atención y estrés postraumático, recomendado según tus respuestas.", instruments: ["asrs", "pcl5"] },
};

const phq9Gad7Options: ScreeningOption[] = [
  { value: 0, label: "Nunca" },
  { value: 1, label: "Varios días" },
  { value: 2, label: "Más de la mitad de los días" },
  { value: 3, label: "Casi todos los días" },
];

// Etiquetas de la versión validada en México (Vargas Terrez et al., 2011): "nunca" vale 1 y "siempre" 5.
const k10Options: ScreeningOption[] = [
  { value: 1, label: "Nunca" },
  { value: 2, label: "Casi nunca" },
  { value: 3, label: "A veces" },
  { value: 4, label: "Casi siempre" },
  { value: 5, label: "Siempre" },
];

const auditFrequencyOptions: ScreeningOption[] = [
  { value: 0, label: "Nunca" },
  { value: 1, label: "Menos de una vez al mes" },
  { value: 2, label: "Mensualmente" },
  { value: 3, label: "Semanalmente" },
  { value: 4, label: "A diario o casi a diario" },
];

const auditInjuryOptions: ScreeningOption[] = [
  { value: 0, label: "No" },
  { value: 2, label: "Sí, pero no en el último año" },
  { value: 4, label: "Sí, en el último año" },
];

const auditFirstItems: { items: string[]; options: Partial<Record<number, ScreeningOption[]>> } = {
  items: [
    "¿Con qué frecuencia consume alguna bebida alcohólica?",
    "¿Cuántas bebidas alcohólicas suele tomar en un día en que bebe?",
    "¿Con qué frecuencia toma 6 o más bebidas alcohólicas en una sola ocasión?",
  ],
  options: {
    0: [
      { value: 0, label: "Nunca" },
      { value: 1, label: "Una vez al mes o menos" },
      { value: 2, label: "De 2 a 4 veces al mes" },
      { value: 3, label: "De 2 a 3 veces a la semana" },
      { value: 4, label: "4 o más veces a la semana" },
    ],
    1: [
      { value: 0, label: "1 o 2" },
      { value: 1, label: "3 o 4" },
      { value: 2, label: "5 o 6" },
      { value: 3, label: "De 7 a 9" },
      { value: 4, label: "10 o más" },
    ],
  },
};

const auditNote = "Una bebida equivale aproximadamente a una cerveza de lata o botella (355 ml), una copa de vino o un caballito de tequila, mezcal u otro destilado.";

const yesNoOptions: ScreeningOption[] = [
  { value: 0, label: "No" },
  { value: 1, label: "Sí" },
];

const asrsOptions: ScreeningOption[] = [
  { value: 0, label: "Nunca" },
  { value: 1, label: "Rara vez" },
  { value: 2, label: "A veces" },
  { value: 3, label: "Frecuentemente" },
  { value: 4, label: "Muy frecuentemente" },
];

const pcl5Options: ScreeningOption[] = [
  { value: 0, label: "Nada en absoluto" },
  { value: 1, label: "Un poco" },
  { value: 2, label: "Moderadamente" },
  { value: 3, label: "Bastante" },
  { value: 4, label: "Extremadamente" },
];

const ref = {
  kroenke2001: { apa: "Kroenke, K., Spitzer, R. L., & Williams, J. B. W. (2001). The PHQ-9: Validity of a brief depression severity measure. Journal of General Internal Medicine, 16(9), 606–613.", url: "https://doi.org/10.1046/j.1525-1497.2001.016009606.x" },
  kroenke2009: { apa: "Kroenke, K., Spitzer, R. L., Williams, J. B. W., & Löwe, B. (2009). An ultra-brief screening scale for anxiety and depression: The PHQ-4. Psychosomatics, 50(6), 613–621.", url: "https://doi.org/10.1176/appi.psy.50.6.613" },
  lowe2010: { apa: "Löwe, B., Wahl, I., Rose, M., Spitzer, C., Glaesmer, H., Wingenfeld, K., Schneider, A., & Brähler, E. (2010). A 4-item measure of depression and anxiety: Validation and standardization of the Patient Health Questionnaire-4 (PHQ-4) in the general population. Journal of Affective Disorders, 122(1–2), 86–95.", url: "https://doi.org/10.1016/j.jad.2009.06.019" },
  arrieta2017: { apa: "Arrieta, J., Aguerrebere, M., Raviola, G., Flores, H., Elliott, P., Espinosa, A., Reyes, A., Ortiz-Panozo, E., Rodriguez-Gutierrez, E. G., Mukherjee, J., Palazuelos, D., & Franke, M. F. (2017). Validity and utility of the Patient Health Questionnaire (PHQ)-2 and PHQ-9 for screening and diagnosis of depression in rural Chiapas, Mexico: A cross-sectional study. Journal of Clinical Psychology, 73(9), 1076–1090.", url: "https://doi.org/10.1002/jclp.22390" },
  spitzer2006: { apa: "Spitzer, R. L., Kroenke, K., Williams, J. B. W., & Löwe, B. (2006). A brief measure for assessing generalized anxiety disorder: The GAD-7. Archives of Internal Medicine, 166(10), 1092–1097.", url: "https://doi.org/10.1001/archinte.166.10.1092" },
  garciaCampayo2010: { apa: "García-Campayo, J., Zamorano, E., Ruiz, M. A., Pardo, A., Pérez-Páramo, M., López-Gómez, V., Freire, O., & Rejas, J. (2010). Cultural adaptation into Spanish of the generalized anxiety disorder-7 (GAD-7) scale as a screening tool. Health and Quality of Life Outcomes, 8, Artículo 8.", url: "https://doi.org/10.1186/1477-7525-8-8" },
  gaitanRossi2021: { apa: "Gaitán-Rossi, P., Pérez-Hernández, V., Vilar-Compte, M., & Teruel-Belismelis, G. (2021). Prevalencia mensual de trastorno de ansiedad generalizada durante la pandemia por Covid-19 en México. Salud Pública de México, 63(4), 478–485.", url: "https://doi.org/10.21149/12257" },
  kessler2002: { apa: "Kessler, R. C., Andrews, G., Colpe, L. J., Hiripi, E., Mroczek, D. K., Normand, S.-L. T., Walters, E. E., & Zaslavsky, A. M. (2002). Short screening scales to monitor population prevalences and trends in non-specific psychological distress. Psychological Medicine, 32(6), 959–976.", url: "https://doi.org/10.1017/S0033291702006074" },
  vargasTerrez2011: { apa: "Vargas Terrez, B. E., Villamil Salcedo, V., Rodríguez Estrada, C., Pérez Romero, J., & Cortés Sotres, J. (2011). Validación de la escala Kessler 10 (K-10) en la detección de depresión y ansiedad en el primer nivel de atención. Propiedades psicométricas. Salud Mental, 34(4), 323–331.", url: "https://www.scielo.org.mx/scielo.php?script=sci_arttext&pid=S0185-33252011000400005" },
  saunders1993: { apa: "Saunders, J. B., Aasland, O. G., Babor, T. F., de la Fuente, J. R., & Grant, M. (1993). Development of the Alcohol Use Disorders Identification Test (AUDIT): WHO collaborative project on early detection of persons with harmful alcohol consumption—II. Addiction, 88(6), 791–804.", url: "https://doi.org/10.1111/j.1360-0443.1993.tb02093.x" },
  babor2001: { apa: "Babor, T. F., Higgins-Biddle, J. C., Saunders, J. B., & Monteiro, M. G. (2001). AUDIT: The Alcohol Use Disorders Identification Test. Guidelines for use in primary care (2.ª ed.). Organización Mundial de la Salud.", url: "https://www.who.int/publications/i/item/WHO-MSD-MSB-01.6a" },
  bush1998: { apa: "Bush, K., Kivlahan, D. R., McDonell, M. B., Fihn, S. D., & Bradley, K. A. (1998). The AUDIT alcohol consumption questions (AUDIT-C): An effective brief screening test for problem drinking. Archives of Internal Medicine, 158(16), 1789–1795.", url: "https://doi.org/10.1001/archinte.158.16.1789" },
  bradley2007: { apa: "Bradley, K. A., DeBenedetti, A. F., Volk, R. J., Williams, E. C., Frank, D., & Kivlahan, D. R. (2007). AUDIT-C as a brief screen for alcohol misuse in primary care. Alcoholism: Clinical and Experimental Research, 31(7), 1208–1217.", url: "https://doi.org/10.1111/j.1530-0277.2007.00403.x" },
  medinaMora1998: { apa: "Medina-Mora, E., Carreño, S., & De la Fuente, J. R. (1998). Experience with the Alcohol Use Disorders Identification Test (AUDIT) in Mexico. En M. Galanter (Ed.), Recent developments in alcoholism (Vol. 14, pp. 383–396). Plenum Press.", url: "https://doi.org/10.1007/0-306-47148-5_19" },
  paykel1974: { apa: "Paykel, E. S., Myers, J. K., Lindenthal, J. J., & Tanner, J. (1974). Suicidal feelings in the general population: A prevalence study. The British Journal of Psychiatry, 124(582), 460–469.", url: "https://doi.org/10.1192/bjp.124.5.460" },
  serisMartinez2026: { apa: "Séris-Martínez, M., Austria-Corrales, F., Hernández, Y. C., Pérez-Amezcua, B., Tapia, A. J., Astudillo-García, C. I., & Rivera-Rivera, L. (2026). Psychometric validation of the Paykel Suicidal Behavior Scale in Mexican adolescents. Revista de Saúde Pública, 60.", url: "https://doi.org/10.11606/s1518-8787.2026060007086" },
  kessler2005: { apa: "Kessler, R. C., Adler, L., Ames, M., Demler, O., Faraone, S., Hiripi, E., Howes, M. J., Jin, R., Secnik, K., Spencer, T., Ustun, T. B., & Walters, E. E. (2005). The World Health Organization Adult ADHD Self-Report Scale (ASRS): A short screening scale for use in the general population. Psychological Medicine, 35(2), 245–256.", url: "https://doi.org/10.1017/S0033291704002892" },
  reyesZamorano2009: { apa: "Reyes Zamorano, E., et al. (2009). Validación de constructo de la escala de autorreporte del Trastorno por Déficit de Atención con Hiperactividad (TDAH) en el adulto de la Organización Mundial de la Salud en población universitaria mexicana. Salud Mental, 32(Supl. 1).", url: "https://www.medigraphic.com/pdfs/salmen/sam-2009/sams091h.pdf" },
  weathers2013: { apa: "Weathers, F. W., Litz, B. T., Keane, T. M., Palmieri, P. A., Marx, B. P., & Schnurr, P. P. (2013). The PTSD Checklist for DSM-5 (PCL-5). National Center for PTSD.", url: "https://www.ptsd.va.gov/professional/assessment/adult-sr/ptsd-checklist.asp" },
  blevins2015: { apa: "Blevins, C. A., Weathers, F. W., Davis, M. T., Witte, T. K., & Domino, J. L. (2015). The Posttraumatic Stress Disorder Checklist for DSM-5 (PCL-5): Development and initial psychometric evaluation. Journal of Traumatic Stress, 28(6), 489–498.", url: "https://doi.org/10.1002/jts.22059" },
  duronFigueroa2019: { apa: "Durón-Figueroa, R., Cárdenas-López, G., Castro-Calvo, J., & De la Rosa-Gómez, A. (2019). Adaptación de la Lista Checable de Trastorno por Estrés Postraumático para DSM-5 en población mexicana. Acta de Investigación Psicológica, 9(1), 26–36.", url: "https://doi.org/10.22201/fpsi.20074719e.2019.1.03" },
} satisfies Record<string, ScreeningReference>;

export const screenings: ScreeningDefinition[] = [
  {
    id: "phq4",
    name: "PHQ-4",
    fullName: "Cuestionario de Salud del Paciente-4 (PHQ-2 + GAD-2)",
    focus: "Malestar general: ánimo bajo y ansiedad, en 4 preguntas",
    module: 1,
    minutes: 1,
    interval: "En las últimas 2 semanas, ¿qué tan seguido te ha molestado alguno de los siguientes problemas?",
    items: [
      "Sentirse nervioso(a), ansioso(a) o con los nervios de punta",
      "No poder parar o controlar su preocupación",
      "Poco interés o placer en hacer las cosas",
      "Se ha sentido decaído(a), deprimido(a) o sin esperanzas",
    ],
    options: phq9Gad7Options,
    scoring: {
      type: "sum",
      maxScore: 12,
      bands: [
        { min: 0, max: 2, label: "Sin malestar relevante", level: "verde", message: "Tus respuestas no sugieren un malestar emocional relevante en este momento." },
        { min: 3, max: 5, label: "Malestar leve", level: "amarillo", message: "Tus respuestas sugieren síntomas leves de ansiedad o de ánimo bajo. Se recomienda seguimiento." },
        { min: 6, max: 8, label: "Malestar moderado", level: "naranja", message: "Tus respuestas sugieren síntomas moderados de ansiedad o de ánimo bajo. Podrías beneficiarte de una evaluación adicional." },
        { min: 9, max: 12, label: "Malestar elevado", level: "rojo", message: "Tus respuestas sugieren síntomas importantes de ansiedad o de ánimo bajo. Te recomendamos buscar una evaluación con un profesional de la salud mental." },
      ],
    },
    subscales: [
      { label: "Ansiedad (GAD-2)", items: [0, 1], cutoff: 3, positiveText: "sugiere síntomas de ansiedad que vale la pena explorar" },
      { label: "Ánimo (PHQ-2)", items: [2, 3], cutoff: 3, positiveText: "sugiere síntomas de ánimo bajo que vale la pena explorar" },
    ],
    mexicoValidation: "Sus dos componentes se validaron en México: el PHQ-2 en adultos de Chiapas (Arrieta et al., 2017) y el GAD-2 en población adulta nacional (Gaitán-Rossi et al., 2021).",
    references: [ref.kroenke2009, ref.lowe2010, ref.arrieta2017, ref.gaitanRossi2021],
    sourceIds: ["phq9-gad7-mx"],
  },
  {
    id: "k10",
    name: "K10",
    fullName: "Escala de Malestar Psicológico de Kessler-10",
    focus: "Malestar psicológico general, en 10 preguntas",
    module: 1,
    minutes: 3,
    interval: "Durante las últimas 4 semanas:",
    items: [
      "¿Con qué frecuencia se ha sentido cansado(a) sin alguna buena razón?",
      "¿Con qué frecuencia se ha sentido nervioso(a)?",
      "¿Con qué frecuencia se ha sentido tan nervioso(a) que nada podía calmarlo(a)?",
      "¿Con qué frecuencia se ha sentido sin esperanza?",
      "¿Con qué frecuencia se ha sentido inquieto(a) o intranquilo(a)?",
      "¿Con qué frecuencia se ha sentido tan inquieto(a) que no podía quedarse quieto(a)?",
      "¿Con qué frecuencia se ha sentido deprimido(a)?",
      "¿Con qué frecuencia ha sentido que todo lo que hacía representaba un esfuerzo?",
      "¿Con qué frecuencia se ha sentido tan triste que nada podía animarlo(a)?",
      "¿Con qué frecuencia se ha sentido inútil o sin valor?",
    ],
    options: k10Options,
    scoring: {
      type: "sum",
      maxScore: 50,
      // Niveles del estudio mexicano; 22 es el punto de corte para contextos clínicos.
      bands: [
        { min: 10, max: 15, label: "Malestar bajo", level: "verde", message: "Tus respuestas sugieren un malestar psicológico bajo." },
        { min: 16, max: 21, label: "Malestar moderado", level: "amarillo", message: "Tus respuestas sugieren algo de malestar psicológico. Se recomienda seguimiento y cuidar tus rutinas de descanso." },
        { min: 22, max: 29, label: "Malestar alto", level: "naranja", message: "Tus respuestas sugieren un malestar psicológico alto. Podrías beneficiarte de una evaluación adicional." },
        { min: 30, max: 50, label: "Malestar muy alto", level: "rojo", message: "Tus respuestas sugieren un malestar psicológico muy alto. Te recomendamos buscar una evaluación con un profesional de la salud mental." },
      ],
    },
    mexicoValidation: "Validada en adultos de atención primaria de la Ciudad de México (Vargas Terrez et al., 2011).",
    references: [ref.kessler2002, ref.vargasTerrez2011],
    sourceIds: [],
  },
  {
    id: "phq9",
    name: "PHQ-9",
    fullName: "Cuestionario de Salud del Paciente-9",
    focus: "Síntomas de ánimo bajo o depresivos",
    module: 2,
    minutes: 3,
    interval: "En las últimas 2 semanas, ¿qué tan seguido te ha molestado alguno de los siguientes problemas?",
    items: [
      "Poco interés o placer en hacer las cosas",
      "Se ha sentido decaído(a), deprimido(a) o sin esperanzas",
      "Dificultad para quedarse o permanecer dormido(a), o ha dormido demasiado",
      "Se ha sentido cansado(a) o con poca energía",
      "Falta de apetito o ha comido en exceso",
      "Se ha sentido mal con usted mismo(a), o que es un fracaso, o que ha quedado mal con usted mismo(a) o con su familia",
      "Dificultad para concentrarse en actividades, como leer el periódico o ver televisión",
      "Se ha movido o hablado tan lento que otras personas podrían notarlo, o lo contrario: muy inquieto(a) o agitado(a), moviéndose mucho más de lo normal",
      "Pensamientos de que estaría mejor muerto(a), o de hacerse daño de alguna manera",
    ],
    options: phq9Gad7Options,
    scoring: {
      type: "sum",
      maxScore: 27,
      bands: [
        { min: 0, max: 4, label: "Síntomas mínimos", level: "verde", message: "Tus respuestas no sugieren síntomas depresivos relevantes." },
        { min: 5, max: 9, label: "Síntomas leves", level: "amarillo", message: "Tus respuestas sugieren síntomas leves de depresión. Se recomienda seguimiento." },
        { min: 10, max: 14, label: "Síntomas moderados", level: "naranja", message: "Tus respuestas sugieren síntomas moderados de depresión. Podrías beneficiarte de una evaluación adicional." },
        { min: 15, max: 19, label: "Síntomas moderadamente severos", level: "rojo", message: "Tus respuestas sugieren síntomas depresivos importantes. Te recomendamos buscar una evaluación con un profesional de la salud mental." },
        { min: 20, max: 27, label: "Síntomas severos", level: "rojo", message: "Tus respuestas sugieren síntomas depresivos intensos. Te recomendamos buscar atención profesional pronto." },
      ],
    },
    safetyItemIndex: 8,
    crisis: { items: [8], min: 1 },
    mexicoValidation: "Validado en adultos de Chiapas, México (Arrieta et al., 2017).",
    references: [ref.kroenke2001, ref.arrieta2017],
    sourceIds: ["phq9-gad7-unam", "phq9-gad7-mx", "nice-depression"],
  },
  {
    id: "gad7",
    name: "GAD-7",
    fullName: "Escala de Trastorno de Ansiedad Generalizada-7",
    focus: "Síntomas de ansiedad",
    module: 2,
    minutes: 2,
    interval: "En las últimas 2 semanas, ¿qué tan seguido te ha molestado alguno de los siguientes problemas?",
    items: [
      "Sentirse nervioso(a), ansioso(a) o con los nervios de punta",
      "No poder parar o controlar su preocupación",
      "Preocuparse demasiado por diferentes cosas",
      "Dificultad para relajarse",
      "Estar tan inquieto(a) que es difícil quedarse quieto(a)",
      "Molestarse o irritarse fácilmente",
      "Sentir miedo, como si algo terrible pudiera pasar",
    ],
    options: phq9Gad7Options,
    scoring: {
      type: "sum",
      maxScore: 21,
      bands: [
        { min: 0, max: 4, label: "Síntomas mínimos", level: "verde", message: "Tus respuestas no sugieren síntomas de ansiedad relevantes." },
        { min: 5, max: 9, label: "Síntomas leves", level: "amarillo", message: "Tus respuestas sugieren síntomas leves de ansiedad. Se recomienda seguimiento." },
        { min: 10, max: 14, label: "Síntomas moderados", level: "naranja", message: "Tus respuestas sugieren síntomas moderados de ansiedad. Podrías beneficiarte de una evaluación adicional." },
        { min: 15, max: 21, label: "Síntomas severos", level: "rojo", message: "Tus respuestas sugieren síntomas de ansiedad intensos. Te recomendamos buscar una evaluación con un profesional de la salud mental." },
      ],
    },
    mexicoValidation: "Validado en población adulta mexicana, junto con el GAD-2 (Gaitán-Rossi et al., 2021).",
    references: [ref.spitzer2006, ref.garciaCampayo2010, ref.gaitanRossi2021],
    sourceIds: ["phq9-gad7-unam", "phq9-gad7-mx", "nice-panic-anxiety"],
  },
  {
    id: "paykel",
    name: "Escala de Paykel",
    fullName: "Escala de Paykel de Ideación y Conducta Suicida",
    focus: "Pensamientos sobre la muerte y el suicidio",
    module: 3,
    minutes: 1,
    interval: "En el último año:",
    items: [
      "¿Ha sentido que la vida no vale la pena?",
      "¿Ha deseado estar muerto(a)? Por ejemplo, irse a dormir y desear no despertar.",
      "¿Ha pensado en quitarse la vida, aunque realmente no lo fuera a hacer?",
      "¿Ha llegado al punto de considerar seriamente quitarse la vida, o de hacer planes sobre cómo lo haría?",
      "¿Ha intentado quitarse la vida?",
    ],
    options: yesNoOptions,
    scoring: {
      type: "sum",
      maxScore: 5,
      // Punto de corte de la validación mexicana: una respuesta afirmativa (≥ 1).
      bands: [
        { min: 0, max: 0, label: "Sin respuestas afirmativas", level: "verde", message: "No respondiste que sí a ninguna pregunta. Si algo cambia, buscar apoyo siempre es una buena decisión." },
        { min: 1, max: 5, label: "Requiere acompañamiento profesional", level: "rojo", message: "Respondiste que sí a al menos una pregunta. Esto merece la atención de un profesional de la salud mental: no tienes que pasar por esto en soledad." },
      ],
    },
    crisis: { items: [0, 1, 2, 3, 4], min: 1 },
    mexicoValidation: "Validada en adolescentes mexicanos de Morelos (Séris-Martínez et al., 2026).",
    references: [ref.paykel1974, ref.serisMartinez2026],
    sourceIds: ["nice-self-harm"],
  },
  {
    id: "auditc",
    name: "AUDIT-C",
    fullName: "Prueba de Identificación de Trastornos por Consumo de Alcohol, versión breve",
    focus: "Hábitos de consumo de alcohol, en 3 preguntas",
    module: 3,
    minutes: 1,
    interval: "Las siguientes preguntas son sobre su consumo de bebidas alcohólicas.",
    note: auditNote,
    items: auditFirstItems.items,
    options: auditFrequencyOptions,
    itemOptions: auditFirstItems.options,
    scoring: {
      type: "sum",
      maxScore: 12,
      // Umbral sensible ≥ 3: en mujeres se usa ≥ 3 y en hombres ≥ 4 (Bradley et al., 2007); KAHY no pregunta el sexo.
      bands: [
        { min: 0, max: 2, label: "Consumo de bajo riesgo", level: "verde", message: "Tus respuestas sugieren un consumo de alcohol de bajo riesgo." },
        { min: 3, max: 12, label: "Conviene revisar el consumo", level: "amarillo", message: "Tus respuestas sugieren que vale la pena revisar tu consumo con unas preguntas más (AUDIT completo)." },
      ],
    },
    mexicoValidation: "México participó en el desarrollo del AUDIT con la OMS y cuenta con experiencia de validación nacional (Medina-Mora et al., 1998). El AUDIT-C son sus 3 primeras preguntas.",
    references: [ref.bush1998, ref.bradley2007, ref.saunders1993, ref.medinaMora1998],
    sourceIds: [],
  },
  {
    id: "audit",
    name: "AUDIT",
    fullName: "Prueba de Identificación de Trastornos por Consumo de Alcohol",
    focus: "Hábitos de consumo de alcohol, versión completa",
    module: 3,
    minutes: 2,
    interval: "Las siguientes preguntas son sobre su consumo de bebidas alcohólicas.",
    note: auditNote,
    items: [
      ...auditFirstItems.items,
      "En el último año, ¿con qué frecuencia no pudo parar de beber una vez que había empezado?",
      "En el último año, ¿con qué frecuencia no pudo hacer lo que se esperaba de usted porque había bebido?",
      "En el último año, ¿con qué frecuencia necesitó beber en ayunas para recuperarse después de haber bebido mucho el día anterior?",
      "En el último año, ¿con qué frecuencia tuvo remordimientos o sentimientos de culpa después de haber bebido?",
      "En el último año, ¿con qué frecuencia no pudo recordar lo que sucedió la noche anterior porque había estado bebiendo?",
      "¿Usted o alguna otra persona ha resultado herido(a) porque usted había bebido?",
      "¿Algún familiar, amigo(a), médico(a) u otro profesional de la salud se ha preocupado por su forma de beber o le ha sugerido que deje de beber?",
    ],
    options: auditFrequencyOptions,
    itemOptions: { ...auditFirstItems.options, 8: auditInjuryOptions, 9: auditInjuryOptions },
    scoring: {
      type: "sum",
      maxScore: 40,
      // Zonas de riesgo de la OMS (Babor et al., 2001).
      bands: [
        { min: 0, max: 7, label: "Consumo de bajo riesgo", level: "verde", message: "Tus respuestas sugieren un consumo de alcohol de bajo riesgo." },
        { min: 8, max: 15, label: "Consumo de riesgo", level: "amarillo", message: "Tus respuestas sugieren un consumo que podría ponerte en riesgo. Reducirlo puede ayudarte; se recomienda seguimiento." },
        { min: 16, max: 19, label: "Consumo que podría estar afectando tu salud", level: "naranja", message: "Tus respuestas sugieren un consumo que podría estar afectando tu salud. Podrías beneficiarte de una evaluación con un profesional." },
        { min: 20, max: 40, label: "Consumo que requiere evaluación especializada", level: "rojo", message: "Tus respuestas sugieren que tu consumo podría requerir atención especializada. Te recomendamos buscar una evaluación profesional." },
      ],
    },
    prefillFrom: { id: "auditc", count: 3 },
    mexicoValidation: "México participó en el desarrollo del AUDIT con la OMS y cuenta con experiencia de validación nacional (Medina-Mora et al., 1998).",
    references: [ref.saunders1993, ref.babor2001, ref.medinaMora1998],
    sourceIds: [],
  },
  {
    id: "asrs",
    name: "ASRS v1.1 (Parte A)",
    fullName: "Escala de Autorreporte de TDAH en Adultos, Parte A",
    focus: "Síntomas de atención e impulsividad en adultos",
    module: 4,
    minutes: 2,
    interval: "En los últimos 6 meses, ¿con qué frecuencia...",
    items: [
      "¿Tiene problemas para terminar los detalles finales de un proyecto, una vez que ya hizo las partes difíciles?",
      "¿Tiene dificultad para poner las cosas en orden cuando tiene que hacer una tarea que requiere organización?",
      "¿Tiene problemas para recordar citas u obligaciones?",
      "Cuando tiene una tarea que requiere pensar mucho, ¿evita o retrasa empezarla?",
      "¿Se mueve o retuerce las manos o los pies cuando tiene que estar sentado(a) por mucho tiempo?",
      "¿Se siente excesivamente activo(a) e impulsado(a) a hacer cosas, como si lo moviera un motor?",
    ],
    options: asrsOptions,
    scoring: {
      // Umbral oficial de la Parte A: preguntas 1-3 cuentan como positivas desde "A veces" (>=2); preguntas 4-6 desde "Frecuentemente" (>=3).
      type: "thresholdCount",
      thresholds: [2, 2, 2, 3, 3, 3],
      positiveCount: 4,
      positive: { label: "Coincide con el patrón que busca el tamizaje", level: "naranja", message: "Tus respuestas sugieren síntomas de inatención o hiperactividad que podrían beneficiarse de una evaluación adicional." },
      negative: { label: "No coincide con el patrón que busca el tamizaje", level: "verde", message: "Tus respuestas no coinciden con el patrón de síntomas de atención que busca este tamizaje." },
    },
    mexicoValidation: "Validada en estudiantes universitarios de la Ciudad de México (Reyes Zamorano et al., 2009) y con traducción oficial para México.",
    references: [ref.kessler2005, ref.reyesZamorano2009],
    sourceIds: ["asrs-mx", "nice-adhd"],
  },
  {
    id: "pcl5",
    name: "PCL-5",
    fullName: "Lista de Verificación de TEPT para el DSM-5",
    focus: "Síntomas de estrés postraumático",
    module: 4,
    minutes: 5,
    interval: "En el último mes, ¿cuánto le ha molestado...",
    items: [
      "Recuerdos repetidos, perturbadores y no deseados de la experiencia estresante",
      "Sueños repetidos y perturbadores de la experiencia estresante",
      "De repente sentir o actuar como si la experiencia estresante estuviera ocurriendo de nuevo",
      "Sentirse muy molesto(a) cuando algo le recuerda la experiencia estresante",
      "Tener fuertes reacciones físicas cuando algo le recuerda la experiencia estresante (palpitaciones, dificultad para respirar, sudoración)",
      "Evitar recuerdos, pensamientos o sentimientos relacionados con la experiencia estresante",
      "Evitar cosas externas que le recuerden la experiencia estresante (personas, lugares, conversaciones, actividades, objetos o situaciones)",
      "Problemas para recordar partes importantes de la experiencia estresante",
      "Creencias negativas fuertes sobre usted mismo(a), otras personas o el mundo",
      "Culparse a usted mismo(a) o a alguien más por la experiencia estresante o lo que pasó después",
      "Tener fuertes emociones negativas como miedo, horror, enojo, culpa o vergüenza",
      "Pérdida de interés en actividades que antes disfrutaba",
      "Sentirse distante o alejado(a) de otras personas",
      "Dificultad para experimentar emociones positivas",
      "Comportamiento irritable, arrebatos de enojo o actuar de forma agresiva",
      "Tomar demasiados riesgos o hacer cosas que podrían causarle daño",
      "Estar \"superalerta\", vigilante o en guardia",
      "Sentirse nervioso(a) o sobresaltarse fácilmente",
      "Dificultad para concentrarse",
      "Problemas para dormir (dificultad para quedarse o permanecer dormido(a))",
    ],
    options: pcl5Options,
    scoring: {
      type: "sum",
      maxScore: 80,
      bands: [
        { min: 0, max: 32, label: "Por debajo del punto de corte de referencia", level: "verde", message: "Tus respuestas están por debajo del punto de corte de referencia (33)." },
        { min: 33, max: 80, label: "En o por encima del punto de corte de referencia (33)", level: "naranja", message: "Tus respuestas sugieren síntomas de estrés postraumático que podrían beneficiarse de una evaluación adicional con un profesional." },
      ],
    },
    mexicoValidation: "Adaptada y validada en población mexicana (Durón-Figueroa et al., 2019).",
    references: [ref.weathers2013, ref.blevins2015, ref.duronFigueroa2019],
    sourceIds: ["pcl5-unam", "pcl5-mx", "nice-ptsd"],
  },
];

export function getScreening(id: ScreeningId): ScreeningDefinition {
  return screenings.find((item) => item.id === id) ?? screenings[0];
}

export function optionsFor(definition: ScreeningDefinition, index: number): ScreeningOption[] {
  return definition.itemOptions?.[index] ?? definition.options;
}

/** Banda (con semáforo y mensaje) que corresponde a un puntaje. */
export function bandFor(definition: ScreeningDefinition, score: number): Omit<ScreeningBand, "min" | "max"> {
  if (definition.scoring.type === "thresholdCount") {
    return score >= definition.scoring.positiveCount ? definition.scoring.positive : definition.scoring.negative;
  }
  const bands = definition.scoring.bands;
  return bands.find((entry) => score >= entry.min && score <= entry.max) ?? (score < bands[0].min ? bands[0] : bands[bands.length - 1]);
}

export function scoreScreening(definition: ScreeningDefinition, answers: number[]): { score: number; band: string } {
  if (definition.scoring.type === "sum") {
    const score = answers.reduce((sum, value) => sum + value, 0);
    return { score, band: bandFor(definition, score).label };
  }
  const { thresholds } = definition.scoring;
  const positives = answers.filter((value, index) => value >= thresholds[index]).length;
  return { score: positives, band: bandFor(definition, positives).label };
}

export function buildScreeningResult(definition: ScreeningDefinition, answers: number[]): ScreeningResult {
  const { score, band } = scoreScreening(definition, answers);
  const item9Positive = definition.safetyItemIndex !== undefined ? answers[definition.safetyItemIndex] >= 1 : undefined;
  return {
    id: definition.id,
    completedAt: Date.now(),
    answers,
    score,
    band,
    ...(item9Positive !== undefined ? { item9Positive } : {}),
  };
}

/** True si alguna respuesta de riesgo (PHQ-9 ítem 9, cualquier "sí" en Paykel) llega al umbral del protocolo de crisis. */
export function triggersCrisis(definition: ScreeningDefinition, answers: number[]): boolean {
  if (!definition.crisis) return false;
  const { items, min } = definition.crisis;
  return items.some((index) => (answers[index] ?? 0) >= min);
}

export function needsCrisisSupport(result: ScreeningResult): boolean {
  return Boolean(result.item9Positive) || triggersCrisis(getScreening(result.id), result.answers);
}

export function subscaleScores(definition: ScreeningDefinition, answers: number[]) {
  return (definition.subscales ?? []).map((subscale) => {
    const score = subscale.items.reduce((sum, index) => sum + (answers[index] ?? 0), 0);
    return { ...subscale, score, positive: score >= subscale.cutoff };
  });
}
