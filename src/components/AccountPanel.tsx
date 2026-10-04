import { CloudOff, LockKeyhole, LogOut, Mail, ShieldCheck, UserRoundCheck } from "lucide-react";
import { useState } from "react";
import { Button, Card } from "./ui";
import { loginAccount, MIN_PASSWORD_LENGTH, registerAccount, type Session } from "../services/authApi";

type Mode = "idle" | "register" | "login";

/**
 * Tarjeta "Tu cuenta" del Perfil: muestra la sesión activa y permite
 * cerrarla, o bien crear una cuenta / iniciar sesión a quien usa KAHY solo
 * en este dispositivo (perfil local o modo invitado).
 */
export default function AccountPanel({ account, deviceId, onLogout, onLoggedIn, onAccountCreated }: {
  account: Session | null;
  deviceId: string;
  onLogout: () => void;
  onLoggedIn: (session: Session, dataId: string) => Promise<void> | void;
  onAccountCreated: (session: Session, dataId: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function open(next: Mode) {
    setMode(next);
    setError("");
    setPassword("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Escribe un correo con formato válido.");
    if (mode === "register" && password.length < MIN_PASSWORD_LENGTH) return setError(`Elige una contraseña de al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    if (mode === "register" && !accepted) return setError("Confirma tu edad y que aceptas lo que se guarda.");
    if (mode === "login" && !password) return setError("Escribe tu contraseña.");
    setError("");
    setBusy(true);
    const result = mode === "register" ? await registerAccount(email.trim(), password, deviceId) : await loginAccount(email.trim(), password);
    setBusy(false);
    if (!result.ok) return setError(result.code === "UNAVAILABLE" ? "El servicio de cuentas no está disponible en este momento. Intenta más tarde." : result.message);
    setMode("idle");
    setPassword("");
    if (mode === "register") onAccountCreated(result.session, result.dataId);
    else await onLoggedIn(result.session, result.dataId);
  }

  function confirmLogout() {
    if (window.confirm("Al cerrar sesión se quitan tus datos de este dispositivo; siguen guardados en tu cuenta. El historial completo del chat solo vive en este navegador y se borrará. ¿Cerrar sesión?")) onLogout();
  }

  if (account) {
    return (
      <Card className="account-card">
        <div className="settings-title"><UserRoundCheck size={21} /><div><h2>Tu cuenta</h2><p>Sesión iniciada como <strong>{account.email}</strong>. Tu perfil y tu avance se respaldan, y puedes entrar desde otro dispositivo con este correo y tu contraseña.</p></div></div>
        <Button variant="secondary" onClick={confirmLogout}><LogOut size={17} /> Cerrar sesión</Button>
      </Card>
    );
  }

  return (
    <Card className="account-card">
      <div className="settings-title"><CloudOff size={21} /><div><h2>Tu cuenta</h2><p>Ahora mismo tu avance vive solo en este navegador. Con una cuenta se respalda y puedes recuperarlo desde otro dispositivo.</p></div></div>
      {mode === "idle"
        ? <div className="account-actions"><Button onClick={() => open("register")}>Crear cuenta</Button><Button variant="secondary" onClick={() => open("login")}>Ya tengo cuenta</Button></div>
        : <form className="account-form" onSubmit={submit} noValidate>
          <label className="field"><span>Correo</span><div><Mail size={18} /><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="tu@ejemplo.mx" /></div></label>
          <label className="field"><span>Contraseña</span><div><LockKeyhole size={18} /><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} placeholder={mode === "register" ? `${MIN_PASSWORD_LENGTH} caracteres o más` : "Tu contraseña"} /></div></label>
          {mode === "register" && <>
            <div className="notice-box"><ShieldCheck size={20} /><p>Se guardan tu correo, tu contraseña protegida (nunca en texto legible), tu perfil y tu avance: hábitos, tareas, etiquetas emocionales y resultados de tamizaje. KAHY no guarda en su servidor el texto del chat. Lo anterior a hoy que solo esté en este navegador se irá respaldando conforme lo uses.</p></div>
            <label className="check-row"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>Tengo 18 años o más y acepto que se guarde lo anterior.</span></label>
          </>}
          {mode === "login" && <p className="fine-print">Al entrar se carga el perfil de tu cuenta en este dispositivo.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="account-actions"><Button type="submit" disabled={busy}>{busy ? "Un momento…" : mode === "register" ? "Crear mi cuenta" : "Iniciar sesión"}</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => open("idle")}>Cancelar</Button></div>
        </form>}
    </Card>
  );
}
