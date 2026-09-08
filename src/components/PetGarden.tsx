import { Apple, Droplets, Gamepad2, Heart, MessageCircle, Sparkles, Sprout, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { flowers, mascots } from "../mock/data";
import type { CareAction, PetGardenApi } from "../hooks/usePetGarden";
import { stageForGrowth } from "../hooks/usePetGarden";
import type { CompanionType, FlowerId, MascotId } from "../types";
import Mascot, { Flower } from "./Mascot";
import { Card } from "./ui";

type CareButton = { action: CareAction; label: string; icon: typeof Apple };

const animalCareLabels: CareButton[] = [
  { action: "food", label: "Alimentar", icon: Apple },
  { action: "play", label: "Jugar", icon: Gamepad2 },
  { action: "love", label: "Mimar", icon: Heart },
];

const plantCareLabels: CareButton[] = [
  { action: "water", label: "Regar", icon: Droplets },
  { action: "sun", label: "Dar sol", icon: Sun },
  { action: "prune", label: "Nutrir / Podar", icon: Sprout },
];

function stageLabel(stage: number, stageCount: number): string {
  if (stage <= 1) return "Bebé";
  if (stage >= stageCount) return "Adulto";
  return "Creciendo";
}

export default function PetGarden({
  companionType,
  mascotId,
  flowerId,
  moodHint,
  garden,
}: {
  companionType: CompanionType;
  mascotId: MascotId;
  flowerId: FlowerId;
  moodHint?: string;
  garden: PetGardenApi;
}) {
  const [speaking, setSpeaking] = useState(false);
  const [gaining, setGaining] = useState(false);
  const [evolving, setEvolving] = useState(false);
  const animal = mascots.find((item) => item.id === mascotId) ?? mascots[0];
  const flower = flowers.find((item) => item.id === flowerId) ?? flowers[0];
  const isMascot = companionType === "mascota";
  const activeCareLabels = isMascot ? animalCareLabels : plantCareLabels;
  const companionLabel = isMascot ? animal.name : `tu ${flower.name.toLowerCase()}`;
  const stageCount = isMascot ? animal.stages.length : flower.stages.length;
  const stage = stageForGrowth(garden.growth, stageCount);
  const companionKey = isMascot ? `mascota:${mascotId}` : `planta:${flowerId}`;
  const previousStage = useRef(stage);
  const previousCompanionKey = useRef(companionKey);
  const mountedPulse = useRef(garden.pulse);

  // Un destello breve cada vez que se gana progreso (cuidarlo aquí, un hábito o el chat).
  useEffect(() => {
    if (garden.pulse === mountedPulse.current) return;
    mountedPulse.current = garden.pulse;
    setGaining(true);
    const timer = window.setTimeout(() => setGaining(false), 900);
    return () => window.clearTimeout(timer);
  }, [garden.pulse]);

  // Una celebración más grande cuando el crecimiento realmente pasa a la siguiente etapa visual.
  // Cambiar de compañero (mascota <-> planta, u otra especie) solo actualiza la base de comparación, sin celebrar.
  useEffect(() => {
    const companionChanged = companionKey !== previousCompanionKey.current;
    previousCompanionKey.current = companionKey;
    if (companionChanged || stage <= previousStage.current) {
      previousStage.current = stage;
      return;
    }
    previousStage.current = stage;
    setEvolving(true);
    const timer = window.setTimeout(() => setEvolving(false), 1600);
    return () => window.clearTimeout(timer);
  }, [stage, companionKey]);

  function talk() {
    setSpeaking(true);
    window.setTimeout(() => setSpeaking(false), 2600);
  }

  return (
    <Card className="pet-garden">
      <div className="pet-garden-heading">
        <div>
          <span className="eyebrow"><Sparkles size={14} /> Tu rincón de compañía</span>
          <h2>Cuida a {companionLabel}</h2>
          <p>Un espacio simbólico para pausar un momento. No sustituye el cuidado real de una mascota o planta.</p>
        </div>
        {garden.isNeglected && <span className="pet-alert">Te han extrañado un poco</span>}
      </div>

      <div className="pet-garden-single">
        <div className={`pet-slot-frame ${isMascot ? "" : "pet-slot-frame--plant"} ${gaining ? "pet-slot-frame--gain" : ""} ${evolving ? "pet-slot-frame--evolve" : ""}`}>
          <div className={`pet-idle ${isMascot ? "pet-idle--breathe" : "pet-idle--sway"}`}>
            {isMascot ? (
              <Mascot id={mascotId} size="large" mood={garden.mood} stage={stage} className="pet-slot-image" />
            ) : (
              <Flower id={flowerId} stage={stage} neglected={garden.isNeglected} size="large" className="pet-slot-image" />
            )}
          </div>
          {speaking && <span className="pet-bubble">{garden.message}</span>}
          {gaining && (
            <span className="pet-sparkles" aria-hidden="true">
              <i /><i /><i /><i />
            </span>
          )}
          {evolving && <span className="pet-evolve-badge" role="status">¡Creció un poco más!</span>}
        </div>
        <span className="pet-stage-tag">{stageLabel(stage, stageCount)}</span>
      </div>

      <div className="pet-meters">
        <div className="pet-meter"><span>Felicidad</span><div className="pet-meter-track"><span style={{ width: `${garden.happiness}%` }} /></div></div>
        <div className="pet-meter"><span>Vínculo</span><div className="pet-meter-track"><span style={{ width: `${garden.bond}%` }} /></div></div>
        <div className="pet-meter"><span>Crecimiento</span><div className="pet-meter-track"><span className={gaining ? "pet-meter-fill--gain" : ""} style={{ width: `${garden.growth}%` }} /></div></div>
      </div>

      <div className="pet-actions">
        {activeCareLabels.map(({ action, label, icon: Icon }) => (
          <button key={action} onClick={() => { garden.care(action); talk(); }}>
            <Icon size={18} /> {label}
          </button>
        ))}
        <button className="pet-talk" onClick={() => { garden.reactToMood(moodHint || ""); talk(); }}>
          <MessageCircle size={18} /> Hablar
        </button>
      </div>
      <p className="pet-fine-print">Cuidarlo es simbólico: si pasa un día sin visitarlo, se pondrá un poco triste hasta que regreses.</p>
    </Card>
  );
}
