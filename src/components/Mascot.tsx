import type { FlowerId, MascotId, PetMood } from "../types";
import { flowers, mascots } from "../mock/data";

export default function Mascot({
  id = "vaca",
  size = "medium",
  mood = "feliz",
  stage = 1,
  className = "",
}: {
  id?: MascotId;
  size?: "tiny" | "small" | "medium" | "large";
  mood?: PetMood;
  /** 1-indexed growth stage, clamped to this mascot's available stages. */
  stage?: number;
  className?: string;
}) {
  const mascot = mascots.find((item) => item.id === id) ?? mascots[0];
  const stageIndex = Math.min(mascot.stages.length - 1, Math.max(0, stage - 1));
  const src = mood === "triste" ? mascot.sadImage : mascot.stages[stageIndex];
  return (
    <span
      className={`mascot mascot--${size} ${className}`}
      role="img"
      aria-label={`${mascot.name}, ${mascot.animal} acompañante${mood === "triste" ? " (extraña un poco de atención)" : ""}`}
    >
      <img src={src} alt="" loading="lazy" />
    </span>
  );
}

export function Flower({
  id,
  stage = 1,
  neglected = false,
  size = "medium",
  className = "",
}: {
  id: FlowerId;
  /** 1-indexed growth stage, clamped to this flower's available stages. */
  stage?: number;
  neglected?: boolean;
  size?: "tiny" | "small" | "medium" | "large";
  className?: string;
}) {
  const flower = flowers.find((item) => item.id === id) ?? flowers[0];
  const stageIndex = Math.min(flower.stages.length - 1, Math.max(0, stage - 1));
  const src = neglected ? flower.wiltedImage : flower.stages[stageIndex];
  return (
    <span className={`flower-pot flower-pot--${size} ${className}`} role="img" aria-label={`${id} en su etapa de cuidado${neglected ? " (necesita agua y luz)" : ""}`}>
      <img src={src} alt="" loading="lazy" />
    </span>
  );
}
