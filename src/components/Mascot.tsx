import type { MascotId, PetMood } from "../types";
import { mascots } from "../mock/data";

export default function Mascot({
  id = "vaca",
  size = "medium",
  mood = "feliz",
  className = "",
}: {
  id?: MascotId;
  size?: "tiny" | "small" | "medium" | "large";
  mood?: PetMood;
  className?: string;
}) {
  const mascot = mascots.find((item) => item.id === id) ?? mascots[0];
  const src = mood === "triste" ? mascot.sadImage : mascot.image;
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
  phase = 1,
  size = "medium",
  className = "",
}: {
  id: "Clavel" | "Gerbera" | "Orquidea" | "Tulipan";
  phase?: 1 | 2 | 3 | 4;
  size?: "tiny" | "small" | "medium" | "large";
  className?: string;
}) {
  return (
    <span className={`flower-pot flower-pot--${size} ${className}`} role="img" aria-label={`${id} en su etapa ${phase} de cuidado`}>
      <img src={`/assets/pets/plantas/${id}/Fase${phase}.jpg`} alt="" loading="lazy" />
    </span>
  );
}
