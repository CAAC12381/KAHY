import { Apple, Droplets, Gamepad2, Heart, MessageCircle, Sparkles, Sprout, Sun } from "lucide-react";
import { useState } from "react";
import { flowers, mascots } from "../mock/data";
import type { CareAction } from "../hooks/usePetGarden";
import { stageForGrowth, usePetGarden } from "../hooks/usePetGarden";
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
}: {
  companionType: CompanionType;
  mascotId: MascotId;
  flowerId: FlowerId;
  moodHint?: string;
}) {
  const garden = usePetGarden();
  const [speaking, setSpeaking] = useState(false);
  const animal = mascots.find((item) => item.id === mascotId) ?? mascots[0];
  const flower = flowers.find((item) => item.id === flowerId) ?? flowers[0];
  const isMascot = companionType === "mascota";
  const activeCareLabels = isMascot ? animalCareLabels : plantCareLabels;
  const companionLabel = isMascot ? animal.name : `tu ${flower.name.toLowerCase()}`;
  const stageCount = isMascot ? animal.stages.length : flower.stages.length;
  const stage = stageForGrowth(garden.growth, stageCount);

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
        <div className={`pet-slot-frame ${isMascot ? "" : "pet-slot-frame--plant"}`}>
          {isMascot ? (
            <Mascot id={mascotId} size="large" mood={garden.mood} stage={stage} className="pet-slot-image" />
          ) : (
            <Flower id={flowerId} stage={stage} neglected={garden.isNeglected} size="large" className="pet-slot-image" />
          )}
          {speaking && <span className="pet-bubble">{garden.message}</span>}
        </div>
        <span className="pet-stage-tag">{stageLabel(stage, stageCount)}</span>
      </div>

      <div className="pet-meters">
        <div className="pet-meter"><span>Felicidad</span><div className="pet-meter-track"><span style={{ width: `${garden.happiness}%` }} /></div></div>
        <div className="pet-meter"><span>Vínculo</span><div className="pet-meter-track"><span style={{ width: `${garden.bond}%` }} /></div></div>
        <div className="pet-meter"><span>Crecimiento</span><div className="pet-meter-track"><span style={{ width: `${garden.growth}%` }} /></div></div>
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
