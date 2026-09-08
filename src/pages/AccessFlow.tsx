import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, MapPin, UserRound } from "lucide-react";
import { useState } from "react";
import Mascot, { Flower } from "../components/Mascot";
import { Button, Card, DemoBadge, Progress } from "../components/ui";
import { flowers, goals, informationStyles, locations, mascots } from "../mock/data";
import type { CompanionType, DemoProfile, FlowerId, MascotId, Preferences } from "../types";
import BrandMark from "../components/BrandMark";

type AccessMode = "welcome" | "login" | "register";

export function SplashScreen() {
  return (
    <div className="splash-screen">
      <div className="splash-logo"><BrandMark size="medium" /><span>KAHY</span></div>
      <p>Un espacio para hacer una pausa.</p>
    </div>
  );
}

export function AccessFlow({
  onExplore,
  onLogin,
  onRegister,
}: {
  onExplore: () => void;
  onLogin: (name: string) => void;
  onRegister: (name: string) => void;
}) {
  const [mode, setMode] = useState<AccessMode>("welcome");

  if (mode === "login") return <Login onBack={() => setMode("welcome")} onContinue={onLogin} />;
  if (mode === "register") return <Register onBack={() => setMode("welcome")} onContinue={onRegister} />;

  return (
    <main className="access-page">
      <section className="welcome-copy">
        <DemoBadge>Prototipo de interfaz</DemoBadge>
        <div className="access-brand"><BrandMark size="small" />KAHY</div>
        <h1>Tu ritmo también es una forma de avanzar.</h1>
        <p>Explora prácticas breves, organiza lo que necesitas y conoce cómo podría funcionar una red de orientación accesible.</p>
        <div className="access-actions">
          <Button onClick={() => setMode("register")}>Crear cuenta de prueba <ArrowRight size={18} /></Button>
          <Button variant="secondary" onClick={() => setMode("login")}>Iniciar sesión</Button>
          <Button variant="ghost" onClick={onExplore}>Explorar KAHY sin cuenta</Button>
        </div>
        <p className="fine-print">Al completar el registro, solo se conservan en este dispositivo tu perfil y preferencias. KAHY no guarda el chat ni crea un expediente clínico.</p>
      </section>
      <section className="welcome-art" aria-label="Mascotas de KAHY">
        <div className="mascot-row">
          <Mascot id="vaca" size="medium" />
          <Mascot id="pollito" size="medium" />
          <Mascot id="camaleon" size="medium" />
          <Mascot id="tortuga" size="medium" />
        </div>
        <p className="mascot-row-caption">Elige un acompañante y cuida también una plantita a tu ritmo.</p>
        <div className="nature-line"><span>hojas</span><i /><i /><i /></div>
      </section>
    </main>
  );
}

function Login({ onBack, onContinue }: { onBack: () => void; onContinue: (name: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Escribe un correo con formato válido.";
    if (password.length < 6) next.password = "Usa al menos 6 caracteres para la demostración.";
    setErrors(next);
    if (!Object.keys(next).length) onContinue(email.split("@")[0] || "Invitado");
  }

  return (
    <main className="form-page">
      <button className="back-link" onClick={onBack}><ArrowLeft size={18} /> Volver</button>
      <Card className="auth-card">
        <DemoBadge>Acceso simulado</DemoBadge>
        <h1>Qué gusto verte</h1>
        <p>La demostración no envía ni guarda el correo o la contraseña. Si ya completaste tu perfil, entrarás sin repetir la encuesta.</p>
        <form onSubmit={submit} noValidate>
          <label className="field"><span>Correo de prueba</span><div><Mail size={18} /><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@ejemplo.mx" aria-invalid={Boolean(errors.email)} /></div>{errors.email && <small className="field-error">{errors.email}</small>}</label>
          <label className="field"><span>Contraseña de prueba</span><div><LockKeyhole size={18} /><input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} placeholder="6 caracteres o más" aria-invalid={Boolean(errors.password)} /><button type="button" className="field-action" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{errors.password && <small className="field-error">{errors.password}</small>}</label>
          <Button type="submit" className="full-width">Entrar a KAHY</Button>
        </form>
      </Card>
    </main>
  );
}

function Register({ onBack, onContinue }: { onBack: () => void; onContinue: (name: string) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [region, setRegion] = useState(locations[0]);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");

  function next() {
    if (step === 0 && (name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(email))) return setError("Completa un nombre y un correo de prueba válido.");
    if (step === 1 && Number(age) < 18) return setError("Este prototipo está diseñado para personas de 18 años o más.");
    if (step === 3 && !accepted) return setError("Confirma que entiendes los límites de esta demostración.");
    setError("");
    if (step === 3) onContinue(name.trim()); else setStep(step + 1);
  }

  return (
    <main className="form-page">
      <button className="back-link" onClick={() => step ? setStep(step - 1) : onBack()}><ArrowLeft size={18} /> {step ? "Paso anterior" : "Volver"}</button>
      <Card className="auth-card register-card">
        <DemoBadge>Registro local · paso {step + 1} de 4</DemoBadge>
        <Progress value={step + 1} max={4} label="Progreso del registro" />
        {step === 0 && <div className="form-step"><h1>Empecemos por lo básico</h1><p>No se creará una cuenta real.</p><label className="field"><span>¿Cómo quieres que te llamemos?</span><div><UserRound size={18} /><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre o apodo" /></div></label><label className="field"><span>Correo de prueba</span><div><Mail size={18} /><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@ejemplo.mx" /></div></label></div>}
        {step === 1 && <div className="form-step"><h1>Confirma el alcance</h1><p>La fase actual está pensada para adultos.</p><label className="field"><span>Edad</span><div><UserRound size={18} /><input value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" placeholder="18 o más" /></div></label></div>}
        {step === 2 && <div className="form-step"><h1>Elige una región de muestra</h1><p>Solo cambia el contenido visible; no accedemos a tu ubicación.</p><label className="field"><span>Ubicación demostrativa</span><div><MapPin size={18} /><select value={region} onChange={(e) => setRegion(e.target.value)}>{locations.map((item) => <option key={item}>{item}</option>)}</select></div></label></div>}
        {step === 3 && <div className="form-step"><h1>Antes de continuar</h1><div className="notice-box"><Check size={20} /><p>KAHY no ofrece diagnóstico, terapia, monitoreo ni respuesta de emergencia. Al finalizar se guardarán localmente tu apodo, región, mascota y preferencias; no la edad exacta, correo, contraseña ni conversación.</p></div><label className="check-row"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} /><span>Entiendo y quiero continuar.</span></label></div>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <Button onClick={next} className="full-width">{step === 3 ? "Personalizar mi recorrido" : "Continuar"} <ArrowRight size={18} /></Button>
      </Card>
    </main>
  );
}

export function Onboarding({
  initialName,
  preferences,
  onFinish,
}: {
  initialName: string;
  preferences: Preferences;
  onFinish: (profile: DemoProfile, preferences: Preferences) => void;
}) {
  const [step, setStep] = useState(0);
  const [city, setCity] = useState(locations[0]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [style, setStyle] = useState("guided");
  const [localPreferences, setLocalPreferences] = useState(preferences);
  const [companionType, setCompanionType] = useState<CompanionType>("mascota");
  const [mascot, setMascot] = useState<MascotId>("vaca");
  const [flower, setFlower] = useState<FlowerId>("Clavel");

  const steps = [
    <div className="onboarding-question" key="location"><span className="step-kicker">Contexto de muestra</span><h1>¿Qué zona quieres usar en la demostración?</h1><p>No solicitamos GPS ni ubicación real.</p><div className="choice-grid">{locations.map((item) => <button className={city === item ? "choice active" : "choice"} onClick={() => setCity(item)} key={item}><MapPin size={20} /><span>{item}</span>{city === item && <Check size={18} />}</button>)}</div></div>,
    <div className="onboarding-question" key="goals"><span className="step-kicker">Tu recorrido</span><h1>¿Qué te gustaría encontrar primero?</h1><p>Elige hasta tres opciones. No se usan para diagnosticar.</p><div className="choice-grid">{goals.map((item) => <button className={selectedGoals.includes(item) ? "choice active" : "choice"} onClick={() => setSelectedGoals(selectedGoals.includes(item) ? selectedGoals.filter((goal) => goal !== item) : selectedGoals.length < 3 ? [...selectedGoals, item] : selectedGoals)} key={item}><span>{item}</span>{selectedGoals.includes(item) && <Check size={18} />}</button>)}</div></div>,
    <div className="onboarding-question" key="style"><span className="step-kicker">Forma de explicar</span><h1>¿Cómo prefieres recibir información?</h1><div className="choice-grid">{informationStyles.map((item) => <button className={style === item.id ? "choice active" : "choice"} onClick={() => setStyle(item.id)} key={item.id}><span><strong>{item.label}</strong><small>{item.description}</small></span>{style === item.id && <Check size={18} />}</button>)}</div></div>,
    <div className="onboarding-question" key="access"><span className="step-kicker">Comodidad visual</span><h1>¿Qué ajustes te harían sentir más cómodo?</h1><div className="choice-grid"><button className={localPreferences.lowStimuli ? "choice active" : "choice"} onClick={() => setLocalPreferences({ ...localPreferences, lowStimuli: !localPreferences.lowStimuli })}><span><strong>Menos estímulos</strong><small>Reduce adornos y color de fondo.</small></span>{localPreferences.lowStimuli && <Check size={18} />}</button><button className={localPreferences.reducedMotion ? "choice active" : "choice"} onClick={() => setLocalPreferences({ ...localPreferences, reducedMotion: !localPreferences.reducedMotion })}><span><strong>Movimiento reducido</strong><small>Evita transiciones y respiración animada.</small></span>{localPreferences.reducedMotion && <Check size={18} />}</button><button className={localPreferences.textScale === "large" ? "choice active" : "choice"} onClick={() => setLocalPreferences({ ...localPreferences, textScale: localPreferences.textScale === "large" ? "normal" : "large" })}><span><strong>Texto grande</strong><small>Aumenta el tamaño base de lectura.</small></span>{localPreferences.textScale === "large" && <Check size={18} />}</button></div></div>,
    <div className="onboarding-question" key="companion">
      <span className="step-kicker">Acompañante</span>
      <h1>Elige tu acompañante</h1>
      <p>Puedes cuidar una mascota o una plantita, pero solo una a la vez. Podrás verla en tu rincón de compañía.</p>
      <div className="choice-grid">
        <button className={companionType === "mascota" ? "choice active" : "choice"} onClick={() => setCompanionType("mascota")}>
          <span><strong>Una mascota</strong><small>Un animalito para alimentar, jugar y mimar.</small></span>
          {companionType === "mascota" && <Check size={18} />}
        </button>
        <button className={companionType === "planta" ? "choice active" : "choice"} onClick={() => setCompanionType("planta")}>
          <span><strong>Una planta</strong><small>Una plantita para regar, dar sol y nutrir.</small></span>
          {companionType === "planta" && <Check size={18} />}
        </button>
      </div>
      {companionType === "mascota" ? (
        <div className="mascot-grid">{mascots.map((item) => <button className={mascot === item.id ? "mascot-choice active" : "mascot-choice"} key={item.id} onClick={() => setMascot(item.id)}><Mascot id={item.id} size="medium" /><strong>{item.name}</strong><small>{item.description}</small>{mascot === item.id && <span className="selected-check"><Check size={17} /></span>}</button>)}</div>
      ) : (
        <div className="mascot-grid">{flowers.map((item) => <button className={flower === item.id ? "mascot-choice active" : "mascot-choice"} key={item.id} onClick={() => setFlower(item.id)}><Flower id={item.id} phase={3} size="medium" /><strong>{item.name}</strong><small>{item.description}</small>{flower === item.id && <span className="selected-check"><Check size={17} /></span>}</button>)}</div>
      )}
    </div>,
  ];

  function finish() {
    onFinish({ name: initialName || "Invitado", companionType, mascot, flower, city, goals: selectedGoals }, localPreferences);
  }

  return (
    <main className="onboarding-page">
      <div className="onboarding-shell">
        <div className="onboarding-top"><div className="access-brand"><BrandMark size="small" />KAHY</div><span>Paso {step + 1} de {steps.length}</span></div>
        <Progress value={step + 1} max={steps.length} label="Progreso de personalización" />
        {steps[step]}
        <div className="onboarding-actions"><Button variant="ghost" onClick={() => step ? setStep(step - 1) : finish()}>{step ? <><ArrowLeft size={18} /> Atrás</> : "Omitir"}</Button><Button onClick={() => step === steps.length - 1 ? finish() : setStep(step + 1)}>{step === steps.length - 1 ? "Entrar a KAHY" : "Continuar"}<ArrowRight size={18} /></Button></div>
      </div>
    </main>
  );
}
