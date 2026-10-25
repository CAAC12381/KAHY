import { ArrowRight, BookOpen, CalendarDays, ClipboardList, Leaf, MessageCircle, Sparkles } from "lucide-react";
import Mascot from "../components/Mascot";
import PetGarden from "../components/PetGarden";
import SupportBanner from "../components/SupportBanner";
import { Button, Card, DemoBadge } from "../components/ui";
import WellbeingTracker from "../components/wellbeing/WellbeingTracker";
import { useDailyHabits } from "../hooks/useDailyHabits";
import type { PetGardenApi } from "../hooks/usePetGarden";
import type { EmotionCalendarApi } from "../hooks/useEmotionCalendar";
import type { ScreeningsState } from "../hooks/useScreenings";
import { flowers, mascots } from "../mock/data";
import type { DemoProfile, MainView, Preferences } from "../types";

export default function HomePage({
  profile,
  preferences,
  navigate,
  notify,
  screenings,
  onHelp,
  garden,
  emotionCalendar,
}: {
  profile: DemoProfile;
  preferences: Preferences;
  navigate: (view: MainView) => void;
  notify: (message: string) => void;
  screenings: ScreeningsState;
  onHelp: () => void;
  garden: PetGardenApi;
  emotionCalendar: EmotionCalendarApi;
}) {
  const habits = useDailyHabits(garden.gainFromHabit);
  const displayName = profile.name === "Invitado" ? "" : `, ${profile.name}`;
  const companionName = profile.companionType === "mascota"
    ? mascots.find((item) => item.id === profile.mascot)?.name
    : flowers.find((item) => item.id === profile.flower)?.name;

  return (
    <div className="page home-page">
      {screenings.showSupportBanner && <SupportBanner onHelp={onHelp} onAcknowledge={screenings.acknowledgeSupport} />}
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

      <div className="section-heading"><div><span className="eyebrow">Calendario emocional y hábitos</span><h2>Cómo te has sentido y lo que has hecho por ti</h2></div><small>Se guardan etiquetas y fechas, no el texto</small></div>
      <WellbeingTracker
        entries={emotionCalendar.entries}
        habits={habits}
        companionName={preferences.showMascot ? companionName : null}
      />

      {preferences.showMascot && (
        <>
          <div className="section-heading"><div><span className="eyebrow">Compañía simbólica</span><h2>Tu jardín de bienestar</h2></div><small>Se guarda solo en este dispositivo</small></div>
          <PetGarden companionType={profile.companionType} mascotId={profile.mascot} flowerId={profile.flower} emotion={emotionCalendar.latest} garden={garden} />
        </>
      )}

      <div className="section-heading"><div><span className="eyebrow">Accesos rápidos</span><h2>Un siguiente paso claro</h2></div></div>
      <div className="quick-grid">
        <button className="quick-card lilac" onClick={() => navigate("chat")}><span className="quick-icon"><MessageCircle /></span><strong>Quiero escribir</strong><p>Conversa con IA contextual y un respaldo local seguro.</p><span className="text-link">Abrir chat <ArrowRight size={17} /></span></button>
        <button className="quick-card olive" onClick={() => navigate("activities")}><span className="quick-icon"><Leaf /></span><strong>Necesito bajar estímulos</strong><p>Respiración, pausa sensorial y una actividad sencilla.</p><span className="text-link">Ver actividades <ArrowRight size={17} /></span></button>
        <button className="quick-card pink" onClick={() => navigate("specialists")}><span className="quick-icon"><CalendarDays /></span><strong>Quiero conocer opciones</strong><p>Explora cómo sería un directorio de especialistas.</p><span className="text-link">Ver directorio <ArrowRight size={17} /></span></button>
        <button className="quick-card cream" onClick={() => navigate("resources")}><span className="quick-icon"><BookOpen /></span><strong>Quiero información clara</strong><p>Consulta recursos locales y la base de fuentes verificadas.</p><span className="text-link">Abrir biblioteca <ArrowRight size={17} /></span></button>
        <button className="quick-card lilac" onClick={() => navigate("screening")}><span className="quick-icon"><ClipboardList /></span><strong>Quiero un autorreporte</strong><p>Cuestionarios de ánimo, ansiedad, atención o estrés postraumático. No diagnostican.</p><span className="text-link">Ir a Tamizaje <ArrowRight size={17} /></span></button>
      </div>

      <Card className="daily-card"><div><span className="eyebrow"><Sparkles size={15} /> Idea para hoy</span><h2>Haz visible el primer paso</h2><p>En lugar de “terminar el proyecto”, prueba “abrir el archivo y escribir un título”.</p></div><Button variant="secondary" onClick={() => navigate("activities")}>Desglosar una tarea</Button></Card>
    </div>
  );
}
