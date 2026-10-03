export type MainView =
  | "home"
  | "chat"
  | "activities"
  | "screening"
  | "specialists"
  | "resources"
  | "profile";

export type MascotId = "vaca" | "pollito" | "camaleon" | "tortuga";
export type FlowerId = "Clavel" | "Gerbera" | "Orquidea" | "Tulipan";
export type PetMood = "feliz" | "triste";

export type EmotionName =
  | "alegría"
  | "calma"
  | "alivio"
  | "esperanza"
  | "tristeza"
  | "ansiedad"
  | "miedo"
  | "enojo"
  | "frustración"
  | "culpa"
  | "soledad"
  | "cansancio"
  | "confusión"
  | "agobio"
  | "neutral"
  | "no_clara";

export type EmotionIntensity = "suave" | "media" | "intensa" | "no_clara";
export type EmotionalProgress = "expresó" | "identificó" | "reflexionó" | "decidió" | "actuó" | "pidió_apoyo" | "sin_señal";

export interface EmotionInsight {
  primary: EmotionName;
  detail: string;
  intensity: EmotionIntensity;
  progress: EmotionalProgress;
  confidence: "baja" | "media" | "alta";
}

export interface EmotionEntry extends EmotionInsight {
  id: string;
  at: number;
}

export type TaskEnergy = "poca" | "media" | "bastante";
export type TaskPlanSource = "manual" | "ia" | "local" | "chat";

export interface TaskStep {
  id: string;
  text: string;
  /** Estimación amable en minutos; nunca una meta obligatoria. */
  minutes?: number;
  done: boolean;
  doneAt?: number;
}

export interface TaskPlan {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  energy: TaskEnergy;
  source: TaskPlanSource;
  feelingBefore?: EmotionName;
  feelingAfter?: EmotionName;
  steps: TaskStep[];
}

export type TextScale = "normal" | "large";

export interface Preferences {
  reducedMotion: boolean;
  lowStimuli: boolean;
  simplified: boolean;
  showMascot: boolean;
  textScale: TextScale;
  rememberConversations: boolean;
  /** Uses saved wellbeing signals (never full archived transcripts) to tailor suggestions across KAHY. */
  adaptivePersonalization: boolean;
  /** Full chat transcripts, kept only in this browser (never sent to the server) — separate from rememberConversations, which is topic-only and may sync. */
  saveChatHistory: boolean;
}

export type CompanionType = "mascota" | "planta";

export interface DemoProfile {
  name: string;
  companionType: CompanionType;
  mascot: MascotId;
  flower: FlowerId;
  city: string;
  goals: string[];
}

export interface ToastMessage {
  id: number;
  text: string;
}

export type ScreeningId = "phq9" | "gad7" | "asrs" | "pcl5";

export interface ScreeningResult {
  id: ScreeningId;
  completedAt: number;
  answers: number[];
  score: number;
  /** Published interpretation band for this score, from the instrument itself — not a KAHY-computed diagnosis. */
  band: string;
  /** PHQ-9 only: true if item 9 (thoughts of self-harm) was endorsed at all (score >= 1). */
  item9Positive?: boolean;
}
