export type MainView =
  | "home"
  | "chat"
  | "activities"
  | "specialists"
  | "resources"
  | "profile";

export type MascotId = "vaca" | "pollito" | "camaleon" | "tortuga";
export type FlowerId = "Clavel" | "Gerbera" | "Orquidea" | "Tulipan";
export type PetMood = "feliz" | "triste";

export type TextScale = "normal" | "large";

export interface Preferences {
  reducedMotion: boolean;
  lowStimuli: boolean;
  simplified: boolean;
  showMascot: boolean;
  textScale: TextScale;
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
