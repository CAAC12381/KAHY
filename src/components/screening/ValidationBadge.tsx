import { BadgeCheck } from "lucide-react";

/** Sello "Validado en México". El detalle del estudio queda en el título y en "Fuentes y validación". */
export default function ValidationBadge({ note }: { note: string }) {
  return (
    <span className="mx-badge" title={note} aria-label={`Validado en México. ${note}`}>
      <BadgeCheck size={14} aria-hidden="true" /> Validado en México
    </span>
  );
}
