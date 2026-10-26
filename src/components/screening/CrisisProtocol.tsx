import { HeartHandshake, Phone, Siren } from "lucide-react";
import { Button } from "../ui";

/**
 * Protocolo de seguridad ante respuestas de riesgo suicida (PHQ-9 ítem 9, Paykel).
 * Se muestra en cuanto se responde la pregunta y en el resultado: nunca se deja a la persona
 * sola con un resultado alarmante. Los enlaces tel: solo abren el marcador si la persona los toca.
 */
export default function CrisisProtocol({ onHelp, onDirectory, compact = false }: { onHelp: () => void; onDirectory?: () => void; compact?: boolean }) {
  return (
    <section className={`crisis-protocol ${compact ? "crisis-protocol--compact" : ""}`} role="alert" aria-label="Protocolo de seguridad">
      <div className="crisis-protocol-head">
        <HeartHandshake size={compact ? 20 : 26} aria-hidden="true" />
        <div>
          <strong>Tu seguridad es lo primero</strong>
          <p>Respondiste algo relacionado con hacerte daño o con no querer vivir. Eso merece acompañamiento humano ahora: no tienes que pasar por esto en soledad.</p>
        </div>
      </div>
      <div className="crisis-protocol-calls">
        <a className="crisis-call" href="tel:8009112000">
          <Phone size={20} aria-hidden="true" />
          <span><strong>Línea de la Vida · 800 911 2000</strong><small>Gratuita y confidencial, 24 horas, todos los días</small></span>
        </a>
        <a className="crisis-call crisis-call--emergency" href="tel:911">
          <Siren size={20} aria-hidden="true" />
          <span><strong>Emergencias · 911</strong><small>Si hay peligro inmediato</small></span>
        </a>
      </div>
      {!compact && (
        <ul className="crisis-protocol-steps">
          <li>Si sientes que podrías hacerte daño ahora, acude al servicio de urgencias más cercano.</li>
          <li>Busca a una persona de confianza: llámale o escríbele y pídele que te acompañe.</li>
          <li>Aleja de tu alcance cualquier cosa con la que pudieras lastimarte.</li>
        </ul>
      )}
      <div className="crisis-protocol-actions">
        <Button variant="danger" onClick={onHelp}>Más opciones de ayuda</Button>
        {onDirectory && <Button variant="secondary" onClick={onDirectory}>Servicios de atención cercanos</Button>}
      </div>
    </section>
  );
}
