import { emotionTone } from "../../lib/emotionLexicon";
import type { EmotionName } from "../../types";

export type ToneKey = "sun" | "calm" | "heavy" | "alert";

/** Clases completas (Tailwind necesita strings estáticos para generarlas). */
export const toneStyles: Record<ToneKey, { cell: string; swatch: string; label: string }> = {
  sun: { cell: "bg-[#fff2cb] border-[#efdca2]", swatch: "bg-[#fff2cb] ring-[#e6cd84]", label: "Energía agradable" },
  calm: { cell: "bg-[#e7f0df] border-[#cfe0c1]", swatch: "bg-[#e7f0df] ring-[#bcd3aa]", label: "Calma o neutral" },
  heavy: { cell: "bg-[#ece5f0] border-[#dacde3]", swatch: "bg-[#ece5f0] ring-[#cbb8d8]", label: "Emoción difícil" },
  alert: { cell: "bg-[#f5dedd] border-[#e9c6c4]", swatch: "bg-[#f5dedd] ring-[#ddb0ad]", label: "Tensión o agobio" },
};

export const toneOrder: ToneKey[] = ["sun", "calm", "heavy", "alert"];

export function toneFor(emotion: EmotionName): ToneKey | null {
  const tone = emotionTone(emotion);
  return tone === "neutral" ? null : tone;
}

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
