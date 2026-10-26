import { ClipboardList, Hand, Lock, Phone, ShieldCheck, Stethoscope } from "lucide-react";
import { useId, useState } from "react";
import { screeningModules, type ScreeningDefinition } from "../../mock/screenings";
import { Button, Card } from "../ui";
import ValidationBadge from "./ValidationBadge";

/** Consentimiento informado: se acepta antes de iniciar cada módulo. */
export default function ConsentNotice({ definition, onAccept, onCancel }: { definition: ScreeningDefinition; onAccept: () => void; onCancel: () => void }) {
  const [accepted, setAccepted] = useState(false);
  const checkId = useId();
  const module = screeningModules[definition.module];

  return (
    <div className="page screening-page">
      <Card className="screening-consent">
        <span className="eyebrow"><ShieldCheck size={14} /> Antes de empezar · Módulo {definition.module}: {module.title}</span>
        <h1>Aviso de consentimiento</h1>
        <p className="screening-consent-lead">
          Vas a responder el <strong>{definition.name}</strong> <ValidationBadge note={definition.mexicoValidation} /> ({definition.items.length} preguntas, unos {definition.minutes} min). Léelo con calma antes de continuar.
        </p>
        <dl className="screening-consent-list">
          <div><dt><ClipboardList size={18} aria-hidden="true" /> Qué es un tamizaje</dt><dd>Preguntas breves de autorreporte que ayudan a identificar si podría convenirte una evaluación con un profesional.</dd></div>
          <div><dt><Stethoscope size={18} aria-hidden="true" /> No es un diagnóstico</dt><dd>El resultado es una orientación inicial. Solo un profesional de la salud mental puede interpretarlo y, si corresponde, hacer un diagnóstico.</dd></div>
          <div>
            <dt><Lock size={18} aria-hidden="true" /> Quién ve tus datos y cómo se guardan</dt>
            <dd>Sin cuenta, tus respuestas se guardan solo en este dispositivo. Con cuenta, se respaldan de forma privada para que las recuperes al iniciar sesión; KAHY no las vende ni las comparte con fines comerciales. Si tienes activada la personalización conectada, el chat puede usar el nombre del cuestionario y tu resultado general (nunca tus respuestas una por una, y nunca la escala de Paykel). Puedes borrar tu historial en Perfil.</dd>
          </div>
          <div><dt><Hand size={18} aria-hidden="true" /> Tu derecho a no responder</dt><dd>Responder es voluntario. Puedes saltar este módulo o salir en cualquier momento sin guardar nada. Para calcular un resultado se necesitan todas las respuestas.</dd></div>
          <div><dt><Phone size={18} aria-hidden="true" /> Si estás en crisis</dt><dd>No esperes al resultado: llama a la Línea de la Vida, <a href="tel:8009112000">800 911 2000</a> (gratuita, 24 horas), o al <a href="tel:911">911</a>, o acude al servicio de urgencias más cercano.</dd></div>
        </dl>
        <label className="screening-consent-check" htmlFor={checkId}>
          <input id={checkId} type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
          <span>Leí el aviso y acepto responder este tamizaje.</span>
        </label>
        <div className="screening-result-actions">
          <Button disabled={!accepted} onClick={onAccept}>Comenzar</Button>
          <Button variant="ghost" onClick={onCancel}>Ahora no</Button>
        </div>
      </Card>
    </div>
  );
}
