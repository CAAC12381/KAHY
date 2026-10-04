import { AlertTriangle, BadgeCheck, ChevronRight, Clock3, ExternalLink, Mail, MapPin, Phone, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Card, DemoBadge, Modal } from "../components/ui";
import { DIRECTORY_VERIFIED_LABEL, serviceCities, serviceKindLabels, supportServices, type ServiceCity, type ServiceKind, type SupportService } from "../data/supportDirectory";

const kindFilters: Array<{ id: ServiceKind | "todos"; label: string }> = [
  { id: "todos", label: "Todos" },
  { id: "linea", label: "Líneas 24 horas" },
  { id: "centro", label: "Centros comunitarios" },
  { id: "hospital", label: "Hospital" },
  { id: "universitario", label: "Universitario" },
];

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function mapsUrl(service: SupportService) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${service.name}, ${service.address}, Michoacán`)}`;
}

/**
 * Directorio de servicios reales (src/data/supportDirectory.ts). KAHY solo
 * muestra la información y enlaza a su fuente: no agenda citas ni llama por
 * la persona. Las líneas telefónicas se muestran con cualquier filtro de
 * ciudad porque atienden a distancia.
 */
export default function SpecialistsPage({ city, onHelp }: { city: string; onHelp: () => void }) {
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState<ServiceCity | "Todas">(serviceCities.find((item) => item === city) ?? "Todas");
  const [kind, setKind] = useState<ServiceKind | "todos">("todos");
  const [selected, setSelected] = useState<SupportService | null>(null);

  const visible = useMemo(() => {
    const text = normalize(query.trim());
    return supportServices.filter((item) => {
      const matchesKind = kind === "todos" || item.kind === kind;
      const matchesCity = cityFilter === "Todas" || !item.city || item.city === cityFilter;
      const matchesQuery = !text || normalize([item.name, item.operator, item.summary, item.coverage, item.city ?? "", ...item.services].join(" ")).includes(text);
      return matchesKind && matchesCity && matchesQuery;
    });
  }, [query, cityFilter, kind]);

  // El modal va fuera de .page: su animación de entrada deja una transformación que
  // haría que el fondo "fixed" se midiera contra la página y no contra la pantalla.
  return <><div className="page directory-page">
    <div className="page-heading"><div><span className="eyebrow">Red de atención · información oficial</span><h1>Directorio de servicios de apoyo</h1><p>Servicios públicos y universitarios reales de salud mental en Michoacán, con la fuente de cada dato.</p></div><DemoBadge>Verificado el {DIRECTORY_VERIFIED_LABEL}</DemoBadge></div>

    <div className="directory-urgent" role="note"><ShieldAlert size={24} /><p><strong>Si hay peligro inmediato,</strong> llama al 911 o acude al servicio de urgencias más cercano.</p><a className="button button--danger" href="tel:911"><Phone size={17} /> Llamar al 911</a><Button variant="ghost" onClick={onHelp}>Más ayuda inmediata</Button></div>

    <div className="demo-banner"><ShieldCheck size={19} /><p><strong>KAHY no agenda citas ni tiene convenio con estos servicios.</strong> Los datos provienen de las fuentes oficiales citadas, pero teléfonos y horarios pueden cambiar: llama antes de acudir.</p></div>

    <div className="directory-tools">
      <label className="search-field"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por servicio, tema o institución…" aria-label="Buscar en el directorio" /></label>
      <div className="filter-row" role="group" aria-label="Filtrar por ciudad"><MapPin size={18} /><button className={cityFilter === "Todas" ? "active" : ""} aria-pressed={cityFilter === "Todas"} onClick={() => setCityFilter("Todas")}>Todo Michoacán</button>{serviceCities.map((item) => <button key={item} className={cityFilter === item ? "active" : ""} aria-pressed={cityFilter === item} onClick={() => setCityFilter(item)}>{item}</button>)}</div>
      <div className="filter-row" role="group" aria-label="Filtrar por tipo de servicio">{kindFilters.map((item) => <button key={item.id} className={kind === item.id ? "active" : ""} aria-pressed={kind === item.id} onClick={() => setKind(item.id)}>{item.label}</button>)}</div>
    </div>

    <p className="directory-count" role="status">{visible.length === 1 ? "1 servicio" : `${visible.length} servicios`}{cityFilter !== "Todas" && ` para ${cityFilter} (las líneas telefónicas atienden desde cualquier lugar)`}</p>

    <div className="specialist-grid">{visible.map((item) => <Card className="specialist-card service-card" key={item.id}>
      <div className="service-badges"><span className="pill">{serviceKindLabels[item.kind]}</span>{item.alwaysOpen && <span className="pill service-open">24 horas</span>}{item.free && <span className="pill service-free">Gratuito</span>}</div>
      <h2>{item.name}</h2>
      <p className="specialty">{item.operator}</p>
      <p className="service-summary">{item.summary}</p>
      <ul className="meta-list">
        <li><MapPin size={17} />{item.address ?? item.coverage}</li>
        {item.hours && <li><Clock3 size={17} />{item.hours}</li>}
      </ul>
      {item.phones.length > 0
        ? <div className="service-actions"><a className="button button--primary" href={`tel:${item.phones[0].tel}`}><Phone size={17} /> Llamar al {item.phones[0].display}</a>{item.phones.length > 1 && <small>Otros teléfonos: {item.phones.slice(1).map((phone) => phone.display).join(" · ")}</small>}</div>
        : <p className="service-caution"><AlertTriangle size={16} /> Teléfono no publicado por la fuente oficial.</p>}
      <button className="card-link" onClick={() => setSelected(item)}>Ver detalles y fuentes <ChevronRight size={18} /></button>
    </Card>)}</div>
    {!visible.length && <div className="empty-directory"><Search size={28} /><h2>No hay coincidencias</h2><p>Prueba otro término o cambia los filtros. La Línea de la Vida (800 911 2000) atiende desde cualquier lugar del país.</p></div>}
  </div>

    {selected && <Modal title={selected.name} onClose={() => setSelected(null)}><div className="service-detail">
      <div className="service-badges"><span className="pill">{serviceKindLabels[selected.kind]}</span>{selected.alwaysOpen && <span className="pill service-open">24 horas</span>}{selected.free && <span className="pill service-free">Gratuito</span>}</div>
      <p className="specialty">{selected.operator}</p>
      <p>{selected.summary}</p>
      {selected.caution && <div className="notice-box service-warning"><AlertTriangle size={19} /><p><strong>Confirma antes de acudir.</strong> {selected.caution}</p></div>}
      <dl>
        <dt>Qué atiende</dt><dd><ul>{selected.services.map((service) => <li key={service}>{service}</li>)}</ul></dd>
        <dt>A quién</dt><dd>{selected.coverage}</dd>
        {selected.phones.length > 0 && <><dt>Teléfonos</dt><dd className="service-phones">{selected.phones.map((phone) => <a key={phone.tel} href={`tel:${phone.tel}`}><Phone size={15} /> {phone.display}</a>)}</dd></>}
        {selected.address && <><dt>Domicilio</dt><dd>{selected.address}<br /><a className="text-link" href={mapsUrl(selected)} target="_blank" rel="noreferrer">Buscar en el mapa <ExternalLink size={15} /></a></dd></>}
        {selected.hours && <><dt>Horario</dt><dd>{selected.hours}</dd></>}
        {selected.cost && <><dt>Costo</dt><dd>{selected.cost}</dd></>}
        {selected.requirements && <><dt>Qué llevar</dt><dd>{selected.requirements}</dd></>}
        {selected.email && <><dt>Correo</dt><dd><a className="text-link" href={`mailto:${selected.email}`}><Mail size={15} /> {selected.email}</a></dd></>}
      </dl>
      <h3>Fuentes</h3>
      <ul className="service-sources">{selected.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label} <ExternalLink size={14} /></a><small>{source.date}</small></li>)}</ul>
      <p className="verified-line"><BadgeCheck size={17} /> Datos revisados en estas fuentes el {selected.verifiedAt}.</p>
      <Button className="full-width" onClick={() => setSelected(null)}>Cerrar</Button>
    </div></Modal>}
  </>;
}
