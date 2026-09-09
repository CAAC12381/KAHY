import { CheckCircle2, ExternalLink, Phone, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import AppShell from "./layouts/AppShell";
import { AccessFlow, Onboarding, SplashScreen } from "./pages/AccessFlow";
import ActivitiesPage from "./pages/ActivitiesPage";
import ChatPage from "./pages/ChatPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import ResourcesPage from "./pages/ResourcesPage";
import ScreeningPage from "./pages/ScreeningPage";
import SpecialistsPage from "./pages/SpecialistsPage";
import { Button, DemoBadge, Modal } from "./components/ui";
import { usePetGarden } from "./hooks/usePetGarden";
import { useScreenings } from "./hooks/useScreenings";
import { useChatHistory } from "./hooks/useChatHistory";
import { getDeviceId } from "./lib/deviceId";
import { fetchRemoteProfile, saveRemoteProfile, deleteRemoteData } from "./services/dataApi";
import type { DemoProfile, MainView, Preferences, ToastMessage } from "./types";

type Stage = "splash" | "access" | "onboarding" | "app";
type PersistedRegistration = { version: 1; profile: DemoProfile; preferences: Preferences };

const REGISTRATION_KEY = "kahy.registration.v1";

const defaultPreferences: Preferences = {
  reducedMotion: false,
  lowStimuli: false,
  simplified: false,
  showMascot: true,
  textScale: "normal",
  rememberConversations: false,
  saveChatHistory: true,
};

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
  const [deviceId] = useState(getDeviceId);
  const [stage, setStage] = useState<Stage>("splash");
  const [pendingName, setPendingName] = useState("Invitado");
  const [view, setView] = useState<MainView>("home");
  const [profile, setProfile] = useState(restoredRegistration?.profile ?? defaultProfile);
  const [preferences, setPreferences] = useState(restoredRegistration?.preferences ?? defaultPreferences);
  const [isRegistered, setIsRegistered] = useState(Boolean(restoredRegistration));
  const [showHelp, setShowHelp] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const screenings = useScreenings(deviceId);
  const garden = usePetGarden(deviceId);
  const chatHistory = useChatHistory(preferences.saveChatHistory);

  useEffect(() => {
    const timer = window.setTimeout(() => setStage(restoredRegistration ? "app" : "access"), 950);
    return () => window.clearTimeout(timer);
  }, [restoredRegistration]);

  // Restaura el perfil desde la base de datos si sobrevivió a un localStorage parcialmente borrado.
  // No sustituye entrar desde otro dispositivo: deviceId es anónimo y local a este navegador.
  useEffect(() => {
    if (!restoredRegistration) return;
    fetchRemoteProfile(deviceId).then((remote) => {
      if (!remote) return;
      setProfile((current) => ({
        ...current,
        name: remote.name,
        companionType: remote.companionType === "planta" ? "planta" : "mascota",
        mascot: remote.mascot as DemoProfile["mascot"],
        flower: remote.flower as DemoProfile["flower"],
        city: remote.city,
        goals: remote.goals,
      }));
      setPreferences((current) => ({ ...current, ...(remote.preferences as Partial<Preferences>) }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function notify(text: string) {
    setToast({ id: Date.now(), text });
  }

  function startRegistration(name: string, rememberConversations: boolean) {
    setPendingName(name || "Invitado");
    setPreferences((prev) => ({ ...prev, rememberConversations }));
    setStage("onboarding");
  }

  function login(name: string) {
    const stored = readRegistration();
    if (stored) {
      setProfile(stored.profile);
      setPreferences(stored.preferences);
    } else {
      const nextProfile = { ...defaultProfile, name: name || "Invitado" };
      setProfile(nextProfile);
      saveRegistration(nextProfile, defaultPreferences);
      syncProfile(deviceId, nextProfile, defaultPreferences);
    }
    setIsRegistered(true);
    setView("home");
    setStage("app");
  }

  function finishOnboarding(nextProfile: DemoProfile, nextPreferences: Preferences) {
    setProfile(nextProfile);
    setPreferences(nextPreferences);
    setIsRegistered(true);
    saveRegistration(nextProfile, nextPreferences);
    syncProfile(deviceId, nextProfile, nextPreferences);
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
    if (isRegistered) {
      saveRegistration(profile, nextPreferences);
      syncProfile(deviceId, profile, nextPreferences);
    }
  }

  function resetRegistration() {
    if (!window.confirm("¿Quieres borrar el perfil guardado en este dispositivo? La próxima vez podrás registrarte de nuevo.")) return;
    window.localStorage.removeItem(REGISTRATION_KEY);
    window.localStorage.removeItem("kahy.chat-memory.v1");
    deleteRemoteData(deviceId);
    screenings.reset();
    chatHistory.clear();
    setProfile(defaultProfile);
    setPreferences(defaultPreferences);
    setIsRegistered(false);
    setView("home");
    setStage("access");
  }

  if (stage === "splash") return <SplashScreen />;
  if (stage === "access") return <AccessFlow onExplore={() => { setIsRegistered(false); setStage("app"); }} onLogin={login} onRegister={startRegistration} />;
  if (stage === "onboarding") return <Onboarding initialName={pendingName} preferences={preferences} onFinish={finishOnboarding} />;

  return (
    <div className={`kahy-app ${preferences.reducedMotion ? "reduce-motion" : ""} ${preferences.lowStimuli ? "low-stimuli" : ""} ${preferences.simplified ? "simplified" : ""} ${preferences.textScale === "large" ? "large-text" : ""}`}>
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <AppShell currentView={view} onNavigate={setView} onHelp={() => setShowHelp(true)} mascot={profile.mascot} preferences={preferences}>
        {view === "home" && <HomePage profile={profile} preferences={preferences} navigate={setView} notify={notify} screenings={screenings} onHelp={() => setShowHelp(true)} garden={garden} />}
        {view === "chat" && <ChatPage onHelp={() => setShowHelp(true)} navigate={setView} preferences={preferences} screenings={screenings} garden={garden} profile={profile} deviceId={deviceId} chatHistory={chatHistory} />}
        {view === "activities" && <ActivitiesPage preferences={preferences} notify={notify} />}
        {view === "screening" && <ScreeningPage screenings={screenings} onHelp={() => setShowHelp(true)} navigate={setView} />}
        {view === "specialists" && <SpecialistsPage notify={notify} />}
        {view === "resources" && <ResourcesPage />}
        {view === "profile" && <ProfilePage profile={profile} preferences={preferences} setProfile={updateProfile} setPreferences={updatePreferences} navigate={setView} notify={notify} isRegistered={isRegistered} onResetRegistration={resetRegistration} screenings={screenings} deviceId={deviceId} chatHistory={chatHistory} />}
      </AppShell>

      {showHelp && <Modal title="Ayuda inmediata" onClose={() => setShowHelp(false)}><div className="help-modal"><DemoBadge>Información oficial · sin llamada automática</DemoBadge><div className="urgent-note"><ShieldAlert size={28} /><div><h3>Si hay peligro inmediato</h3><p>Contacta al 911 o acude al servicio de urgencias más cercano. Este prototipo no puede detectar, atender ni monitorear una emergencia.</p></div></div><div className="help-option"><Phone size={22} /><div><strong>Línea de la Vida</strong><p>800 911 2000 · orientación nacional 24 horas, todos los días.</p></div></div><a className="button button--secondary full-width" href="https://www.gob.mx/conasama/es/articulos/linea-de-la-vida-800-911-2000?idiom=es" target="_blank" rel="noreferrer">Ver fuente oficial <ExternalLink size={17} /></a><p className="fine-print">No se realiza ninguna llamada desde KAHY. En una implementación real, este flujo requeriría revisión profesional, pruebas y protocolos operativos.</p><Button className="full-width" onClick={() => setShowHelp(false)}>Entendido</Button></div></Modal>}
      {toast && <div className="toast" role="status" key={toast.id}><CheckCircle2 size={19} />{toast.text}</div>}
    </div>
  );
}
