import type { BandLevel } from "../../mock/screenings";

const lights: { level: BandLevel; label: string }[] = [
  { level: "verde", label: "Verde" },
  { level: "amarillo", label: "Amarillo" },
  { level: "naranja", label: "Naranja" },
  { level: "rojo", label: "Rojo" },
];

/** Resumen visual del resultado: el color encendido corresponde a la banda del instrumento. */
export default function TrafficLight({ level }: { level: BandLevel }) {
  return (
    <div className="traffic-light" role="img" aria-label={`Semáforo en ${lights.find((light) => light.level === level)?.label.toLowerCase()}`}>
      {lights.map((light) => (
        <span key={light.level} className={`traffic-light-dot traffic-light-dot--${light.level} ${light.level === level ? "is-on" : ""}`} />
      ))}
    </div>
  );
}
