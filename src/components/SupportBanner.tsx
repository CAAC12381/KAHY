import { AlertTriangle, CheckCircle2, Phone } from "lucide-react";
import { Button } from "./ui";

export default function SupportBanner({ onHelp, onAcknowledge }: { onHelp: () => void; onAcknowledge: () => void }) {
  return (
    <div className="support-banner" role="alert">
      <AlertTriangle size={24} />
      <div className="support-banner-body">
        <strong>Vimos algo en tu tamizaje reciente y queremos que tengas apoyo a la mano</strong>
        <p>Esto no es un diagnóstico ni una evaluación de riesgo automática: respondiste algo relacionado con hacerte daño, y eso siempre merece acompañamiento humano, no solo una app.</p>
        <div className="support-banner-line"><Phone size={17} /><span>Línea de la Vida: <strong>800 911 2000</strong> · todos los días, todo el día</span></div>
        <div className="support-banner-actions">
          <Button variant="danger" onClick={onHelp}>Ver opciones de ayuda</Button>
          <Button variant="ghost" onClick={onAcknowledge}><CheckCircle2 size={16} /> Ya vi esto, continuar</Button>
        </div>
      </div>
    </div>
  );
}
