import { Apple, Droplets, Flower2, Gamepad2, Heart, MessageCircle, PawPrint, Sparkles, Sprout, Sun } from "lucide-react";
import { useState } from "react";
import { flowers, mascots } from "../mock/data";
import type { CareAction } from "../hooks/usePetGarden";
import { usePetGarden } from "../hooks/usePetGarden";
import type { MascotId } from "../types";
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

export default function PetGarden({
  animalId,
  onChangeAnimal,
  moodHint,
}: {
  animalId: MascotId;
  onChangeAnimal: (id: MascotId) => void;
  moodHint?: string;
}) {
  const garden = usePetGarden();
  const [speaking, setSpeaking] = useState(false);
  const [selected, setSelected] = useState<"mascota" | "planta">("mascota");
  const animal = mascots.find((item) => item.id === animalId) ?? mascots[0];
  const flower = flowers.find((item) => item.id === garden.flowerId) ?? flowers[0];
  const activeCareLabels = selected === "mascota" ? animalCareLabels : plantCareLabels;

  function talk() {
    setSpeaking(true);
    window.setTimeout(() => setSpeaking(false), 2600);
  }

  return (
    <Card className="pet-garden">
      <div className="pet-garden-heading">
        <div>
          <span className="eyebrow"><Sparkles size={14} /> Tu rincón de compañía</span>
          <h2>Cuida a {animal.name} y a tu {flower.name.toLowerCase()}</h2>
          <p>Un espacio simbólico para pausar un momento. No sustituye el cuidado real de una mascota o planta.</p>
        </div>
        {garden.isNeglected && <span className="pet-alert">Te han extrañado un poco</span>}
      </div>

      <div className="pet-target-toggle" role="tablist" aria-label="Elegir a quién cuidar">
        <button type="button" role="tab" aria-selected={selected === "mascota"} className={selected === "mascota" ? "active" : ""} onClick={() => setSelected("mascota")}>
          <PawPrint size={16} /> Mascota
        </button>
        <button type="button" role="tab" aria-selected={selected === "planta"} className={selected === "planta" ? "active" : ""} onClick={() => setSelected("planta")}>
          <Flower2 size={16} /> Planta
        </button>
      </div>

      <div className="pet-garden-grid">
        <div className="pet-slot">
          <div
            className={`pet-slot-frame ${selected === "mascota" ? "pet-slot-frame--selected" : ""}`}
            role="button"
            tabIndex={0}
            aria-pressed={selected === "mascota"}
            onClick={() => setSelected("mascota")}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected("mascota"); } }}
          >
            <Mascot id={animalId} size="large" mood={garden.mood} className="pet-slot-image" />
            {speaking && <span className="pet-bubble">{garden.message}</span>}
          </div>
          <div className="pet-species-row" role="group" aria-label="Elegir animal acompañante">
            {mascots.map((item) => (
              <button key={item.id} className={item.id === animalId ? "active" : ""} onClick={() => onChangeAnimal(item.id)} title={item.name}>
                <Mascot id={item.id} size="tiny" />
              </button>
            ))}
          </div>
        </div>

        <div className="pet-slot">
          <div
            className={`pet-slot-frame pet-slot-frame--plant ${selected === "planta" ? "pet-slot-frame--selected" : ""}`}
            role="button"
            tabIndex={0}
            aria-pressed={selected === "planta"}
            onClick={() => setSelected("planta")}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected("planta"); } }}
          >
            <Flower id={garden.flowerId} phase={garden.growthPhase as 1 | 2 | 3 | 4} size="large" className="pet-slot-image" />
          </div>
          <div className="pet-species-row" role="group" aria-label="Elegir planta acompañante">
            {flowers.map((item) => (
              <button key={item.id} className={item.id === garden.flowerId ? "active" : ""} onClick={() => garden.setFlower(item.id)} title={item.name}>
                <Flower id={item.id} phase={1} size="tiny" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pet-meters">
        <div className="pet-meter"><span>Felicidad</span><div className="pet-meter-track"><span style={{ width: `${garden.happiness}%` }} /></div></div>
        <div className="pet-meter"><span>Vínculo</span><div className="pet-meter-track"><span style={{ width: `${garden.bond}%` }} /></div></div>
        <div className="pet-meter"><span>Crecimiento</span><div className="pet-meter-track"><span style={{ width: `${(garden.growth / 3) * 100}%` }} /></div></div>
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
