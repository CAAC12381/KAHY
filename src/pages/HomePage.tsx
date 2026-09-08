import { ArrowRight, BookOpen, CalendarDays, Heart, Leaf, MessageCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import Mascot from "../components/Mascot";
import PetGarden from "../components/PetGarden";
import { Button, Card, DemoBadge } from "../components/ui";
import type { DemoProfile, MainView, Preferences } from "../types";

const moods = [
  { value: "difícil", symbol: "●", label: "Día difícil" },
  { value: "pesado", symbol: "◒", label: "Algo pesado" },
  { value: "neutral", symbol: "—", label: "Neutral" },
  { value: "tranquilo", symbol: "◕", label: "Con calma" },
  { value: "bien", symbol: "✦", label: "Me siento bien" },
];

export default function HomePage({
  profile,
  preferences,
  navigate,
  notify,
}: {
  profile: DemoProfile;
  preferences: Preferences;
  navigate: (view: MainView) => void;
  notify: (message: string) => void;
}) {
  const [mood, setMood] = useState("");
  const displayName = profile.name === "Invitado" ? "" : `, ${profile.name}`;

  return (
    <div className="page home-page">
      <section className="hero-card">
        <div className="hero-copy">
          <DemoBadge>Bienestar cotidiano · demo</DemoBadge>
          <h1>Hola{displayName}.<br />¿Qué necesitas en este momento?</h1>
          <p>Elige un camino breve. No tienes que completar todo ni explicarlo de una sola vez.</p>
          <div className="hero-actions">
            <Button onClick={() => navigate("chat")}><MessageCircle size={19} /> Abrir chat de prueba</Button>
            <Button variant="secondary" onClick={() => navigate("activities")}><Leaf size={19} /> Hacer una pausa</Button>
          </div>
        </div>
        {preferences.showMascot && <div className="hero-mascot"><span className="speech-note">Vamos paso a paso.</span><Mascot id={profile.mascot} size="large" /></div>}
      </section>

      <div className="section-heading"><div><span className="eyebrow">Registro momentáneo</span><h2>¿Cómo se siente tu día?</h2></div><small>No se guarda ni se analiza.</small></div>
      <Card className="mood-card">
        <div className="mood-row" role="group" aria-label="Selecciona cómo se siente tu día">
          {moods.map((item) => <button key={item.value} className={mood === item.value ? "mood active" : "mood"} onClick={() => { setMood(item.value); notify(`Registrado solo en esta pantalla: ${item.label}.`); }} aria-pressed={mood === item.value}><span>{item.symbol}</span><small>{item.label}</small></button>)}
        </div>
        {mood && <p className="mood-response"><Heart size={18} /> Puedes cambiar tu selección cuando quieras. KAHY no interpreta este registro.</p>}
      </Card>

      {preferences.showMascot && (
        <>
          <div className="section-heading"><div><span className="eyebrow">Compañía simbólica</span><h2>Tu jardín de bienestar</h2></div><small>Se guarda solo en este dispositivo</small></div>
          <PetGarden companionType={profile.companionType} mascotId={profile.mascot} flowerId={profile.flower} moodHint={mood} />
        </>
      )}

      <div className="section-heading"><div><span className="eyebrow">Accesos rápidos</span><h2>Un siguiente paso claro</h2></div></div>
      <div className="quick-grid">
        <button className="quick-card lilac" onClick={() => navigate("chat")}><span className="quick-icon"><MessageCircle /></span><strong>Quiero escribir</strong><p>Conversa con IA contextual y un respaldo local seguro.</p><span className="text-link">Abrir chat <ArrowRight size={17} /></span></button>
        <button className="quick-card olive" onClick={() => navigate("activities")}><span className="quick-icon"><Leaf /></span><strong>Necesito bajar estímulos</strong><p>Respiración, pausa sensorial y una actividad sencilla.</p><span className="text-link">Ver actividades <ArrowRight size={17} /></span></button>
        <button className="quick-card pink" onClick={() => navigate("specialists")}><span className="quick-icon"><CalendarDays /></span><strong>Quiero conocer opciones</strong><p>Explora cómo sería un directorio de especialistas.</p><span className="text-link">Ver directorio <ArrowRight size={17} /></span></button>
        <button className="quick-card cream" onClick={() => navigate("resources")}><span className="quick-icon"><BookOpen /></span><strong>Quiero información clara</strong><p>Consulta recursos locales y la base de fuentes verificadas.</p><span className="text-link">Abrir biblioteca <ArrowRight size={17} /></span></button>
      </div>

      <Card className="daily-card"><div><span className="eyebrow"><Sparkles size={15} /> Idea para hoy</span><h2>Haz visible el primer paso</h2><p>En lugar de “terminar el proyecto”, prueba “abrir el archivo y escribir un título”.</p></div><Button variant="secondary" onClick={() => navigate("activities")}>Desglosar una tarea</Button></Card>
    </div>
  );
}
