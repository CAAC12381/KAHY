import { CheckCircle2, ExternalLink, Phone, ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import AppShell from "./layouts/AppShell";
import { AccessFlow, Onboarding, SplashScreen } from "./pages/AccessFlow";
import ActivitiesPage, { type Activity } from "./pages/ActivitiesPage";
import ChatPage from "./pages/ChatPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import ResourcesPage from "./pages/ResourcesPage";
import ScreeningPage from "./pages/ScreeningPage";
import SpecialistsPage from "./pages/SpecialistsPage";
import { Button, DemoBadge, Modal } from "./components/ui";
import AccessibilityMenu from "./components/AccessibilityMenu";
import { usePetGarden } from "./hooks/usePetGarden";
import { useScreenings } from "./hooks/useScreenings";
import { useChatHistory } from "./hooks/useChatHistory";
import { useEmotionCalendar } from "./hooks/useEmotionCalendar";
import { useTaskPlans } from "./hooks/useTaskPlans";
import { useDailyHabits } from "./hooks/useDailyHabits";
import { getDeviceId, resetDeviceId, setDeviceId } from "./lib/deviceId";
import { clearSession, logoutAccount, readSession, SESSION_EXPIRED_EVENT, type Session } from "./services/authApi";
import { fetchRemoteProfile, saveRemoteProfile, deleteRemoteData, type RemoteProfile } from "./services/dataApi";
import type { DemoProfile, MainView, Preferences, ToastMessage } from "./types";
import "./styles/accounts-directory.css";

type Stage = "splash" | "access" | "onboarding" | "app";
type PersistedRegistration = { version: 1; profile: DemoProfile; preferences: Preferences };

const REGISTRATION_KEY = "kahy.registration.v1";
const ACCESSIBILITY_KEY = "kahy.accessibility.v1";

const defaultPreferences: Preferences = {
  reducedMotion: false,
  lowStimuli: false,
  simplified: false,
  showMascot: true,
  textScale: "normal",
  colorMode: "standard",
  readableFont: false,
  underlineLinks: false,
  rememberConversations: false,
  adaptivePersonalization: true,
  saveChatHistory: true,
};

const accessibilityKeys = ["reducedMotion", "lowStimuli", "simplified", "textScale", "colorMode", "readableFont", "underlineLinks"] as const;

function readAccessibilityPreferences(): Partial<Preferences> {
  try {
    const data = JSON.parse(window.localStorage.getItem(ACCESSIBILITY_KEY) || "{}") as Partial<Preferences>;
    return accessibilityKeys.reduce<Partial<Preferences>>((result, key) => {
      if (data[key] !== undefined) Object.assign(result, { [key]: data[key] });
      return result;
    }, {});
  } catch {
    return {};
  }
}

function saveAccessibilityPreferences(preferences: Preferences) {
  try {
    const data = accessibilityKeys.reduce<Record<string, unknown>>((result, key) => ({ ...result, [key]: preferences[key] }), {});
    window.localStorage.setItem(ACCESSIBILITY_KEY, JSON.stringify(data));
  } catch {
    // Los ajustes siguen aplicados durante la sesión si el navegador bloquea el almacenamiento.
  }
}

function preferenceClasses(preferences: Preferences) {
  return [
    "kahy-app",
    preferences.reducedMotion && "reduce-motion",
    preferences.lowStimuli && "low-stimuli",
    preferences.simplified && "simplified",
    preferences.textScale === "large" && "large-text",
    preferences.textScale === "extra-large" && "extra-large-text",
    preferences.colorMode === "high-contrast" && "high-contrast",
    preferences.colorMode === "grayscale" && "grayscale-colors",
    preferences.colorMode === "warm" && "warm-colors",
    preferences.readableFont && "readable-font",
    preferences.underlineLinks && "underline-links",
  ].filter(Boolean).join(" ");
}

const defaultProfile: DemoProfile = {
  name: "Invitado",
  companionType: "mascota",
  mascot: "vaca",
  flower: "Clavel",
  city: "Morelia",
  goals: [],
};

function readRegistration(): PersistedRegistration | null {
  try {
    const raw = window.localStorage.getItem(REGISTRATION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<PersistedRegistration>;
    const profile = data.profile;
    const preferences = data.preferences;
    if (data.version !== 1 || !profile || !preferences) return null;
    if (typeof profile.name !== "string" || !["vaca", "pollito", "camaleon", "tortuga"].includes(profile.mascot)) return null;
    const companionType = profile.companionType === "planta" ? "planta" : "mascota";
    // Se mezcla con los valores por defecto para que un campo agregado después de que alguien ya se registró (como saveChatHistory) no llegue como undefined.
    return { version: 1, profile: { ...defaultProfile, ...profile, companionType }, preferences: { ...defaultPreferences, ...preferences } } as PersistedRegistration;
  } catch {
    return null;
  }
}

function saveRegistration(profile: DemoProfile, preferences: Preferences) {
  try {
    window.localStorage.setItem(REGISTRATION_KEY, JSON.stringify({ version: 1, profile, preferences } satisfies PersistedRegistration));
  } catch {
    // La app sigue funcionando si el navegador bloquea el almacenamiento local.
  }
}

function profileFromRemote(current: DemoProfile, remote: RemoteProfile): DemoProfile {
  return {
    ...current,
    name: remote.name,
    companionType: remote.companionType === "planta" ? "planta" : "mascota",
    mascot: remote.mascot as DemoProfile["mascot"],
    flower: remote.flower as DemoProfile["flower"],
    city: remote.city,
    goals: remote.goals,
  };
}

function syncProfile(deviceId: string, profile: DemoProfile, preferences: Preferences) {
  saveRemoteProfile(deviceId, {
    name: profile.name,
    companionType: profile.companionType,
    mascot: profile.mascot,
    flower: profile.flower,
    city: profile.city,
    goals: profile.goals,
    preferences: preferences as unknown as Record<string, unknown>,
  });
}

export default function App() {
  const [restoredRegistration] = useState(readRegistration);
  const [deviceId, setCurrentDeviceId] = useState(getDeviceId);
  const [account, setAccount] = useState<Session | null>(readSession);
  // El aviso de "sesión terminada" solo tiene sentido si la app todavía cree tener una cuenta activa.
  const accountRef = useRef(account);
  accountRef.current = account;
  const [stage, setStage] = useState<Stage>("splash");
  const [pendingName, setPendingName] = useState("Invitado");
  const [view, setView] = useState<MainView>("home");
  const [profile, setProfile] = useState(restoredRegistration?.profile ?? defaultProfile);
  const [preferences, setPreferences] = useState<Preferences>(() => ({ ...defaultPreferences, ...(restoredRegistration?.preferences ?? {}), ...readAccessibilityPreferences() }));
  const [isRegistered, setIsRegistered] = useState(Boolean(restoredRegistration));
  const [showHelp, setShowHelp] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const garden = usePetGarden(deviceId);
  const habits = useDailyHabits(deviceId, (habitId, date) => garden.rewardMilestone(`habit:${date}:${habitId}`, 4, "¡Un hábito cumplido! Eso también me ayuda a crecer."));
  const screenings = useScreenings(deviceId, (result) => garden.rewardMilestone(`screening:${result.id}:${result.completedAt}`, 3, "Conocerte un poco mejor también fortalece nuestro camino."));
  const chatHistory = useChatHistory(preferences.saveChatHistory);
  const emotionCalendar = useEmotionCalendar(deviceId);
  const taskPlans = useTaskPlans(deviceId, {
    onStepCompleted: (plan, step) => garden.rewardMilestone(`task-step:${plan.id}:${step.id}`, 2, "Ese paso completado cuenta. Vamos creciendo con avances reales."),
    onPlanCompleted: (plan) => garden.rewardMilestone(`task-plan:${plan.id}`, 4, "¡Terminaste una tarea completa! Tu constancia también se refleja aquí."),
  });
  // Navegación con intención: abrir una actividad concreta o llegar al chat con un mensaje ya escrito.
  const [activityIntent, setActivityIntent] = useState<{ key: number; activity: Activity; planId?: string } | null>(null);
  const [chatDraft, setChatDraft] = useState<{ key: number; text: string } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setStage(restoredRegistration ? "app" : "access"), 950);
    return () => window.clearTimeout(timer);
  }, [restoredRegistration]);

  // Restaura el perfil desde la base de datos si sobrevivió a un localStorage parcialmente borrado.
  // Entrar desde otro dispositivo pasa por completeLogin, más abajo.
  useEffect(() => {
    if (!restoredRegistration) return;
    fetchRemoteProfile(deviceId).then((remote) => {
      if (!remote) return;
      setProfile((current) => profileFromRemote(current, remote));
      setPreferences((current) => ({ ...current, ...(remote.preferences as Partial<Preferences>), ...readAccessibilityPreferences() }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onExpired = () => {
      if (!accountRef.current) return;
      setAccount(null);
      notify("Tu sesión terminó. Inicia sesión de nuevo desde Perfil para seguir respaldando tus datos.");
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function navigate(nextView: MainView) {
    setActivityIntent(null);
    setChatDraft(null);
    setView(nextView);
  }

  function openTaskBreakdown(planId?: string) {
    setChatDraft(null);
    setActivityIntent({ key: Date.now(), activity: "task", planId });
    setView("activities");
  }

  function talkToKahy(text: string) {
    setActivityIntent(null);
    setChatDraft({ key: Date.now(), text });
    setView("chat");
  }

  function notify(text: string) {
    setToast({ id: Date.now(), text });
  }

  /** Este navegador pasa a usar el id de datos de la cuenta; los hooks vuelven a pedir sus datos al cambiar deviceId. */
  function adoptAccount(session: Session, dataId: string) {
    setDeviceId(dataId);
    setCurrentDeviceId(dataId);
    setAccount(session);
  }

  /** `created` llega cuando el registro abrió una cuenta real; sin él, el perfil queda solo en este dispositivo. */
  function startRegistration(name: string, rememberConversations: boolean, created?: { session: Session; dataId: string }) {
    if (created) adoptAccount(created.session, created.dataId);
    setPendingName(name || "Invitado");
    setPreferences((prev) => ({ ...prev, rememberConversations }));
    setStage("onboarding");
  }

  async function completeLogin(session: Session, dataId: string) {
    adoptAccount(session, dataId);
    const remote = await fetchRemoteProfile(dataId);
    if (!remote) {
      // La cuenta existe pero aún no tiene perfil guardado: se usa el de este dispositivo o se completa la personalización.
      if (isRegistered) return syncProfile(dataId, profile, preferences);
      setPendingName(session.email.split("@")[0] || "Invitado");
      setStage("onboarding");
      return;
    }
    const nextProfile = profileFromRemote(defaultProfile, remote);
    const nextPreferences = { ...defaultPreferences, ...(remote.preferences as Partial<Preferences>), ...readAccessibilityPreferences() };
    setProfile(nextProfile);
    setPreferences(nextPreferences);
    saveRegistration(nextProfile, nextPreferences);
    setIsRegistered(true);
    setView("home");
    setStage("app");
  }

  /** Cuenta creada desde Perfil: respalda el perfil que ya existía en este dispositivo. */
  function accountCreated(session: Session, dataId: string) {
    adoptAccount(session, dataId);
    setIsRegistered(true);
    saveRegistration(profile, preferences);
    syncProfile(dataId, profile, preferences);
    notify("Cuenta creada. Desde ahora tu avance se respalda y puedes entrar desde otro dispositivo.");
  }

  /** Cierra la sesión sin borrar nada de la cuenta: solo limpia este navegador (conserva los ajustes de accesibilidad). */
  async function logout() {
    await logoutAccount();
    try {
      Object.keys(window.localStorage).filter((key) => key.startsWith("kahy.") && key !== ACCESSIBILITY_KEY).forEach((key) => window.localStorage.removeItem(key));
    } catch {
      // Si el almacenamiento está bloqueado no hay nada local que limpiar.
    }
    resetDeviceId();
    window.location.reload();
  }

  function finishOnboarding(nextProfile: DemoProfile, nextPreferences: Preferences) {
    setProfile(nextProfile);
    setPreferences(nextPreferences);
    setIsRegistered(true);
    saveRegistration(nextProfile, nextPreferences);
    syncProfile(deviceId, nextProfile, nextPreferences);
    saveAccessibilityPreferences(nextPreferences);
    setView("home");
    setStage("app");
  }

  function updateProfile(nextProfile: DemoProfile) {
    setProfile(nextProfile);
    if (isRegistered) {
      saveRegistration(nextProfile, preferences);
      syncProfile(deviceId, nextProfile, preferences);
    }
  }

  function updatePreferences(nextPreferences: Preferences) {
    setPreferences(nextPreferences);
    saveAccessibilityPreferences(nextPreferences);
    if (isRegistered) {
      saveRegistration(profile, nextPreferences);
      syncProfile(deviceId, profile, nextPreferences);
    }
  }

  function resetRegistration() {
    const question = account
      ? "¿Quieres eliminar tu cuenta y todos los datos guardados en ella? Esta acción no se puede deshacer."
      : "¿Quieres borrar el perfil guardado en este dispositivo? La próxima vez podrás registrarte de nuevo.";
    if (!window.confirm(question)) return;
    window.localStorage.removeItem(REGISTRATION_KEY);
    window.localStorage.removeItem("kahy.chat-memory.v1");
    // Con cuenta, el servidor borra también la cuenta y sus sesiones.
    deleteRemoteData(deviceId);
    screenings.reset();
    chatHistory.clear();
    emotionCalendar.clear();
    taskPlans.clear();
    habits.clear();
    accountRef.current = null;
    clearSession();
    setAccount(null);
    setCurrentDeviceId(resetDeviceId());
    setProfile(defaultProfile);
    setPreferences({ ...defaultPreferences, ...readAccessibilityPreferences() });
    setIsRegistered(false);
    setView("home");
    setStage("access");
  }

  const accessibilityMenu = <AccessibilityMenu preferences={preferences} onChange={updatePreferences} />;

  if (stage === "splash") return <div className={preferenceClasses(preferences)}><SplashScreen />{accessibilityMenu}</div>;
  if (stage === "access") return <div className={preferenceClasses(preferences)}><AccessFlow onExplore={() => { setIsRegistered(false); setStage("app"); }} deviceId={deviceId} onLogin={completeLogin} onRegister={startRegistration} />{accessibilityMenu}</div>;
  if (stage === "onboarding") return <div className={preferenceClasses(preferences)}><Onboarding initialName={pendingName} preferences={preferences} onFinish={finishOnboarding} />{accessibilityMenu}</div>;

  return (
    <div className={preferenceClasses(preferences)}>
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <AppShell currentView={view} onNavigate={navigate} onHelp={() => setShowHelp(true)} mascot={profile.mascot} preferences={preferences}>
        {view === "home" && <HomePage profile={profile} preferences={preferences} navigate={navigate} notify={notify} screenings={screenings} onHelp={() => setShowHelp(true)} garden={garden} emotionCalendar={emotionCalendar} taskPlans={taskPlans} habits={habits} onOpenTask={openTaskBreakdown} />}
        {view === "chat" && <ChatPage key={chatDraft?.key ?? "chat"} initialDraft={chatDraft?.text} onHelp={() => setShowHelp(true)} navigate={navigate} preferences={preferences} screenings={screenings} garden={garden} profile={profile} deviceId={deviceId} chatHistory={chatHistory} emotionCalendar={emotionCalendar} taskPlans={taskPlans} habits={habits} onOpenTask={openTaskBreakdown} />}
        {view === "activities" && <ActivitiesPage key={activityIntent?.key ?? "activities"} preferences={preferences} notify={notify} taskPlans={taskPlans} emotionCalendar={emotionCalendar} onHelp={() => setShowHelp(true)} onTalkToKahy={talkToKahy} initialActivity={activityIntent?.activity} initialPlanId={activityIntent?.planId} />}
        {view === "screening" && <ScreeningPage screenings={screenings} onHelp={() => setShowHelp(true)} navigate={navigate} />}
        {view === "specialists" && <SpecialistsPage city={profile.city} onHelp={() => setShowHelp(true)} />}
        {view === "resources" && <ResourcesPage />}
        {view === "profile" && <ProfilePage profile={profile} preferences={preferences} setProfile={updateProfile} setPreferences={updatePreferences} navigate={navigate} notify={notify} isRegistered={isRegistered} onResetRegistration={resetRegistration} account={account} onLogout={logout} onLoggedIn={completeLogin} onAccountCreated={accountCreated} screenings={screenings} deviceId={deviceId} chatHistory={chatHistory} emotionCalendar={emotionCalendar} />}
      </AppShell>

      {showHelp && <Modal title="Ayuda inmediata" onClose={() => setShowHelp(false)}><div className="help-modal"><DemoBadge>Información oficial · sin llamada automática</DemoBadge><div className="urgent-note"><ShieldAlert size={28} /><div><h3>Si hay peligro inmediato</h3><p>Contacta al 911 o acude al servicio de urgencias más cercano. Este prototipo no puede detectar, atender ni monitorear una emergencia.</p></div></div><div className="help-option"><Phone size={22} /><div><strong>Línea de la Vida</strong><p>800 911 2000 · orientación nacional 24 horas, todos los días.</p></div></div><a className="button button--secondary full-width" href="https://www.gob.mx/conasama/es/articulos/linea-de-la-vida-800-911-2000?idiom=es" target="_blank" rel="noreferrer">Ver fuente oficial <ExternalLink size={17} /></a><p className="fine-print">No se realiza ninguna llamada desde KAHY. En una implementación real, este flujo requeriría revisión profesional, pruebas y protocolos operativos.</p><Button className="full-width" onClick={() => setShowHelp(false)}>Entendido</Button></div></Modal>}
      {toast && <div className="toast" role="status" key={toast.id}><CheckCircle2 size={19} />{toast.text}</div>}
      {accessibilityMenu}
    </div>
  );
}
