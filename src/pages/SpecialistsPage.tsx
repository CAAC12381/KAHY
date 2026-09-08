import { CalendarDays, Check, ChevronRight, Clock3, Filter, MapPin, Search, ShieldCheck, Video } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Card, DemoBadge, Modal } from "../components/ui";
import { specialists } from "../mock/data";

export default function SpecialistsPage({ notify }: { notify: (text: string) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [selected, setSelected] = useState<(typeof specialists)[number] | null>(null);
  const [slot, setSlot] = useState("");
  const filters = ["Todos", "Ansiedad", "TDAH", "Autismo", "Estrés"];
  const visible = useMemo(() => specialists.filter((item) => {
    const matchesQuery = `${item.name} ${item.focus}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "Todos" || item.focus.toLowerCase().includes(filter.toLowerCase());
    return matchesQuery && matchesFilter;
  }), [query, filter]);

  return <div className="page">
    <div className="page-heading"><div><span className="eyebrow">Red de atención · concepto</span><h1>Directorio de especialistas</h1><p>Prueba cómo podrían funcionar la búsqueda, el perfil y una agenda.</p></div><DemoBadge>Perfiles ficticios</DemoBadge></div>
    <div className="demo-banner"><ShieldCheck size={19} /><p><strong>No hay profesionales conectados en esta versión.</strong> Los nombres, horarios y citas son ejemplos para validar la experiencia.</p></div>
    <div className="directory-tools"><label className="search-field"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por enfoque o nombre…" /></label><div className="filter-row" aria-label="Filtros"><Filter size={18} />{filters.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
    <div className="specialist-grid">{visible.map((item) => <Card className="specialist-card" key={item.id}><div className="avatar" aria-hidden="true">{item.initials}</div><div className="specialist-top"><div><DemoBadge>Perfil demo</DemoBadge><h2>{item.name}</h2><p className="specialty">{item.focus}</p></div></div><ul className="meta-list"><li><Video size={17} />{item.format}</li><li><Clock3 size={17} />{item.availability}</li><li><MapPin size={17} />Atención remota de muestra</li></ul><button className="card-link" onClick={() => { setSelected(item); setSlot(""); }}>Ver perfil y agenda <ChevronRight size={18} /></button></Card>)}</div>
    {!visible.length && <div className="empty-directory"><Search size={28} /><h2>No hay coincidencias</h2><p>Prueba otro término o cambia el filtro.</p></div>}
    {selected && <Modal title={selected.name} onClose={() => setSelected(null)}><div className="profile-modal"><div className="modal-profile-head"><div className="avatar large">{selected.initials}</div><div><DemoBadge>Perfil ficticio</DemoBadge><h3>{selected.focus}</h3><p>{selected.note}</p></div></div><div className="scope-note"><ShieldCheck size={19} /><p>En una versión real, credenciales, alcance profesional, consentimiento y disponibilidad tendrían que verificarse antes de publicar este perfil.</p></div><h3><CalendarDays size={19} /> Selecciona un horario de prueba</h3><div className="slot-grid">{["Martes · 16:00", "Jueves · 17:30", "Viernes · 12:00"].map((item) => <button className={slot === item ? "active" : ""} onClick={() => setSlot(item)} key={item}>{slot === item && <Check size={17} />}{item}</button>)}</div><Button className="full-width" disabled={!slot} onClick={() => { notify(`Cita demostrativa seleccionada: ${slot}. No se realizó ninguna reserva.`); setSelected(null); }}>Confirmar demostración</Button></div></Modal>}
  </div>;
}
