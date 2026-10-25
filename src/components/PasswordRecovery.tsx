import { ArrowLeft, Check, Eye, EyeOff, LockKeyhole, Mail, MailCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui";
import { PRIVACY_HASH } from "../data/privacy";
import { MIN_PASSWORD_LENGTH, requestPasswordReset, resetPassword, type Session } from "../services/authApi";

/**
 * Recuperar la contraseña, en dos partes:
 * - ForgotPassword: pide el correo y manda el enlace (en Iniciar sesión y en Perfil).
 * - ResetPasswordForm: lo que se ve al abrir el enlace del correo (#restablecer=…).
 */

export function ForgotPassword({ initialEmail = "", onBack }: { initialEmail?: string; onBack: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Escribe un correo con formato válido.");
    setError("");
    setBusy(true);
    const result = await requestPasswordReset(email.trim());
    setBusy(false);
    if (result.ok) return setSent(result.message);
    setError(result.code === "MAIL_NOT_CONFIGURED"
      ? "La recuperación por correo todavía no está activada en este sitio. Intenta más tarde."
      : result.message);
  }

  if (sent) {
    return (
      <div className="recovery-panel" role="status">
        <span className="recovery-icon"><MailCheck size={24} /></span>
        <h2>Revisa tu correo</h2>
        <p>{sent} El enlace vence en 30 minutos y solo funciona una vez.</p>
        <p className="fine-print">Si no llega en unos minutos, revisa la carpeta de spam o de promociones. KAHY nunca te pedirá tu contraseña por correo ni dentro del chat.</p>
        <Button variant="secondary" className="full-width" onClick={onBack}><ArrowLeft size={17} /> Volver a iniciar sesión</Button>
      </div>
    );
  }

  return (
    <form className="recovery-panel" onSubmit={submit} noValidate>
      <h2>¿Olvidaste tu contraseña?</h2>
      <p>Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una nueva.</p>
      <label className="field"><span>Correo de tu cuenta</span><div><Mail size={18} /><input value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} autoFocus disabled={busy} placeholder="tu@ejemplo.mx" /></div></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button type="submit" className="full-width" disabled={busy}>{busy ? "Enviando…" : "Enviarme el enlace"}</Button>
      <button type="button" className="recovery-back" onClick={onBack} disabled={busy}><ArrowLeft size={16} /> Volver</button>
    </form>
  );
}

export function ResetPasswordForm({ token, onDone, onCancel }: {
  token: string;
  onDone: (session: Session, dataId: string) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (password.length < MIN_PASSWORD_LENGTH) return setError(`Elige una contraseña de al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    if (password !== confirm) return setError("Las dos contraseñas no coinciden.");
    setError("");
    setBusy(true);
    const result = await resetPassword(token, password);
    if (result.ok) return onDone(result.session, result.dataId);
    setBusy(false);
    if (result.code === "INVALID_RESET_LINK") return setExpired(true);
    setError(result.code === "UNAVAILABLE" ? "El servicio de cuentas no está disponible en este momento. Intenta más tarde." : result.message);
  }

  if (expired) {
    return <ForgotPassword onBack={onCancel} />;
  }

  return (
    <form className="recovery-panel" onSubmit={submit} noValidate>
      <h2>Elige una contraseña nueva</h2>
      <p>Al guardarla se cierra la sesión en tus otros dispositivos y entras aquí con la nueva.</p>
      <label className="field"><span>Contraseña nueva</span><div><LockKeyhole size={18} /><input value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} type={show ? "text" : "password"} autoComplete="new-password" autoFocus disabled={busy} placeholder={`${MIN_PASSWORD_LENGTH} caracteres o más`} /><button type="button" className="field-action" onClick={() => setShow((value) => !value)} disabled={busy} aria-label={show ? "Ocultar contraseñas" : "Mostrar contraseñas"}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
      <label className="field"><span>Repite la contraseña</span><div><Check size={18} /><input value={confirm} onChange={(event) => { setConfirm(event.target.value); setError(""); }} type={show ? "text" : "password"} autoComplete="new-password" disabled={busy} placeholder="La misma contraseña" /></div></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button type="submit" className="full-width" disabled={busy}>{busy ? "Guardando…" : "Guardar y entrar"}</Button>
      <button type="button" className="recovery-back" onClick={onCancel} disabled={busy}>Ahora no</button>
      <p className="fine-print">Consulta nuestro <a href={PRIVACY_HASH}>aviso de privacidad</a>.</p>
    </form>
  );
}
