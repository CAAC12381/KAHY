import { ArrowRight, BookOpen, CalendarDays, Check, ClipboardList, Leaf, ListChecks, MessageCircle, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import EmotionCalendar from "../components/EmotionCalendar";
import Mascot, { Flower } from "../components/Mascot";
import PetGarden from "../components/PetGarden";
import SupportBanner from "../components/SupportBanner";
import { Button, Card, DemoBadge } from "../components/ui";
import { dailyHabits, type DailyHabitsApi } from "../hooks/useDailyHabits";
import { stageForGrowth, type PetGardenApi } from "../hooks/usePetGarden";
import type { EmotionCalendarApi } from "../hooks/useEmotionCalendar";
import type { TaskPlansApi } from "../hooks/useTaskPlans";
import type { ScreeningsState } from "../hooks/useScreenings";
import { flowers, mascots } from "../mock/data";
import type { DemoProfile, MainView, Preferences } from "../types";

// El parpadeo de bienvenida se muestra solo la primera vez que se abre Inicio tras cargar la plataforma.
let welcomeBlinkPlayed = false;

export default function HomePage({
  profile,
  preferences,
  navigate,
  notify,
  screenings,
  onHelp,
  garden,
  emotionCalendar,
  taskPlans,
  habits,
  onOpenTask,
}: {
  profile: DemoProfile;
  preferences: Preferences;
  navigate: (view: MainView) => void;
  notify: (message: string) => void;
  screenings: ScreeningsState;
  onHelp: () => void;
  garden: PetGardenApi;
  emotionCalendar: EmotionCalendarApi;
  taskPlans: TaskPlansApi;
  habits: DailyHabitsApi;
  onOpenTask: (planId?: string) => void;
}) {
  const [welcomeBlink] = useState(() => !welcomeBlinkPlayed);
  useEffect(() => {
    welcomeBlinkPlayed = true;
  }, []);
  const currentTask = [...taskPlans.active].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const currentNext = currentTask?.steps.find((step) => !step.done && step.text.trim());
  const displayName = profile.name === "Invitado" ? "" : `, ${profile.name}`;
  const companionName = profile.companionType === "mascota"
    ? mascots.find((item) => item.id === profile.mascot)?.name
    : flowers.find((item) => item.id === profile.flower)?.name;
  const companionData = profile.companionType === "mascota" ? mascots.find((item) => item.id === profile.mascot) : flowers.find((item) => item.id === profile.flower);
  const companionStage = stageForGrowth(garden.growth, companionData?.stages.length || 3);
  const companionMessage = currentTask && currentNext
    ? `Seguimos con un paso de ${currentTask.title}.`
    : habits.completed.length
      ? `Hoy ya llevas ${habits.completed.length} avance${habits.completed.length === 1 ? "" : "s"}.`
      : emotionCalendar.latest
        ? "Lo que sentiste también cuenta como avance."
        : "Vamos paso a paso.";

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
        {preferences.showMascot && <div className="hero-mascot"><span className="speech-note">{companionMessage}</span>{profile.companionType === "mascota" ? <Mascot id={profile.mascot} size="large" mood={garden.mood} stage={companionStage} blink={welcomeBlink} /> : <Flower id={profile.flower} size="large" stage={companionStage} neglected={garden.isNeglected} />}</div>}
      </section>

      <div className="section-heading"><div><span className="eyebrow">Calendario emocional</span><h2>Lo que ha aparecido en tus conversaciones</h2></div><small>Se guardan etiquetas y fechas, no el texto</small></div>
      <Card className="emotion-calendar-card"><EmotionCalendar entries={emotionCalendar.entries} /></Card>

      <div className="section-heading"><div><span className="eyebrow">Hábitos de hoy</span><h2>Pequeñas acciones que también cuentan</h2></div><small>{habits.streak > 1 ? `Racha de ${habits.streak} días` : "Tu avance se guarda y personaliza KAHY"}</small></div>
      <Card className="habits-card">
        <div className="habits-list">
          {dailyHabits.map((habit) => {
            const done = habits.completed.includes(habit.id);
            return (
              <button key={habit.id} className={done ? "habit-chip done" : "habit-chip"} onClick={() => habits.toggle(habit.id)} aria-pressed={done}>
                <span className="habit-check">{done && <Check size={14} />}</span>
                {habit.label}
              </button>
            );
          })}
        </div>
        {preferences.showMascot && companionName && <p className="habits-note">Cada hábito que marcas también ayuda a {companionName} a crecer un poco.</p>}
      </Card>

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
        <button className="quick-card pink" onClick={() => navigate("specialists")}><span className="quick-icon"><CalendarDays /></span><strong>Quiero conocer opciones</strong><p>Servicios públicos y universitarios reales en Michoacán, con teléfono y fuente oficial.</p><span className="text-link">Ver directorio <ArrowRight size={17} /></span></button>
        <button className="quick-card cream" onClick={() => navigate("resources")}><span className="quick-icon"><BookOpen /></span><strong>Quiero información clara</strong><p>Consulta recursos locales y la base de fuentes verificadas.</p><span className="text-link">Abrir biblioteca <ArrowRight size={17} /></span></button>
        <button className="quick-card lilac" onClick={() => navigate("screening")}><span className="quick-icon"><ClipboardList /></span><strong>Quiero un autorreporte</strong><p>Cuestionarios de ánimo, ansiedad, atención o estrés postraumático. No diagnostican.</p><span className="text-link">Ir a Tamizaje <ArrowRight size={17} /></span></button>
      </div>

      {currentTask && currentNext
        ? <Card className="daily-card"><div><span className="eyebrow"><ListChecks size={15} /> Tarea en curso · {currentTask.steps.filter((step) => step.done).length} de {currentTask.steps.length} pasos</span><h2>{currentTask.title}</h2><p>Tu siguiente paso: “{currentNext.text}”.</p></div><Button variant="secondary" onClick={() => onOpenTask(currentTask.id)}>Continuar tarea</Button></Card>
        : <Card className="daily-card"><div><span className="eyebrow"><Sparkles size={15} /> Idea para hoy</span><h2>Haz visible el primer paso</h2><p>En lugar de “terminar el proyecto”, prueba “abrir el archivo y escribir un título”.</p></div><Button variant="secondary" onClick={() => onOpenTask()}>Desglosar una tarea</Button></Card>}
    </div>
  );
}
