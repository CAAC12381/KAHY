import { BookOpen, Brain, ClipboardList, Database, Eye, Info, Leaf, Palette, PawPrint, RotateCcw, ShieldCheck, Sparkles, Type, UserRound } from "lucide-react";
import { useState } from "react";
import Mascot, { Flower } from "../components/Mascot";
import { Button, Card, DemoBadge, Toggle } from "../components/ui";
import { useChatMemory } from "../hooks/useChatMemory";
import type { ScreeningsState } from "../hooks/useScreenings";
import { flowers, mascots } from "../mock/data";
import type { DemoProfile, FlowerId, MainView, MascotId, Preferences } from "../types";

export default function ProfilePage({ profile, preferences, setProfile, setPreferences, navigate, notify, isRegistered, onResetRegistration, screenings }: { profile: DemoProfile; preferences: Preferences; setProfile: (profile: DemoProfile) => void; setPreferences: (value: Preferences) => void; navigate: (view: MainView) => void; notify: (text: string) => void; isRegistered: boolean; onResetRegistration: () => void; screenings: ScreeningsState }) {
  const [changingCompanion, setChangingCompanion] = useState(false);
  const memory = useChatMemory(preferences.rememberConversations);
  function update(key: keyof Preferences, value: boolean | string) { setPreferences({ ...preferences, [key]: value }); notify(isRegistered ? "Ajuste guardado en este dispositivo." : "Ajuste aplicado durante esta sesión."); }
  function setCompanionType(companionType: DemoProfile["companionType"]) { setProfile({ ...profile, companionType }); notify(companionType === "mascota" ? "Ahora tu compañero es una mascota. Tu progreso se conserva." : "Ahora tu compañero es una planta. Tu progreso se conserva."); }
  const currentMascot = mascots.find((item) => item.id === profile.mascot);
  const currentFlower = flowers.find((item) => item.id === profile.flower);
  const currentCompanionName = profile.companionType === "mascota" ? currentMascot?.name : currentFlower?.name;
  return <div className="page profile-page">
    <div className="page-heading"><div><span className="eyebrow">Tu experiencia</span><h1>Perfil y ajustes</h1><p>Personaliza la interfaz sin crear un expediente clínico.</p></div><DemoBadge>{isRegistered ? "Perfil recordado" : "Sesión de invitado"}</DemoBadge></div>
    <div className="profile-layout"><aside><Card className="profile-card"><Mascot id={profile.mascot} size="medium" /><h2>{profile.name}</h2><p>{profile.city}</p><span className="profile-status"><span /> {isRegistered ? "Registro completado" : "Modo invitado"}</span></Card><Card className="privacy-card"><ShieldCheck size={24} /><h3>Estado de los datos</h3><ul><li><span>Correo y contraseña</span><strong>No se guardan</strong></li><li><span>Expediente clínico</span><strong>No existe</strong></li><li><span>Conversaciones</span><strong>{preferences.rememberConversations ? "Solo temas, en este dispositivo" : "No se guardan"}</strong></li><li><span>Resultados de tamizaje</span><strong>{screenings.results.length > 0 ? "En este dispositivo" : "Sin resultados guardados"}</strong></li><li><span>Perfil y ajustes</span><strong>{isRegistered ? "En este dispositivo" : "Solo esta sesión"}</strong></li></ul></Card></aside><div className="settings-stack">
      <Card><div className="settings-title"><Palette size={21} /><div><h2>Comodidad de la interfaz</h2><p>Los cambios se aplican inmediatamente.</p></div></div><Toggle checked={preferences.lowStimuli} onChange={(value) => update("lowStimuli", value)} label="Modo de bajo estímulo" description="Fondo más uniforme y menos decoración." /><Toggle checked={preferences.reducedMotion} onChange={(value) => update("reducedMotion", value)} label="Reducir movimiento" description="Detiene animaciones no esenciales." /><Toggle checked={preferences.simplified} onChange={(value) => update("simplified", value)} label="Interfaz simplificada" description="Oculta detalles secundarios." /><Toggle checked={preferences.showMascot} onChange={(value) => update("showMascot", value)} label="Mostrar mascota" description="Puedes usar KAHY sin acompañante visual." /><div className="text-scale-row"><span><Type size={19} /><span><strong>Tamaño del texto</strong><small>Ajusta la lectura general.</small></span></span><div><button className={preferences.textScale === "normal" ? "active" : ""} onClick={() => update("textScale", "normal")}>Normal</button><button className={preferences.textScale === "large" ? "active" : ""} onClick={() => update("textScale", "large")}>Grande</button></div></div></Card>
      <Card><div className="settings-title"><Brain size={21} /><div><h2>Memoria de conversación</h2><p>Le da continuidad al chat entre sesiones, guardando solo los temas tratados.</p></div></div><Toggle checked={preferences.rememberConversations} onChange={(value) => { update("rememberConversations", value); if (!value) memory.clear(); }} label="Recordar temas de mis conversaciones" description="Guarda solo el tema (ej. 'estrés'), nunca el texto que escribes. Puedes desactivarlo cuando quieras." />{preferences.rememberConversations && memory.entries.length > 0 && <Button variant="ghost" onClick={() => { memory.clear(); notify("Se borró el historial de temas guardado."); }}><RotateCcw size={16} /> Borrar historial de temas guardado</Button>}</Card>
      <Card>
        <div className="settings-title"><Sparkles size={21} /><div><h2>Tu compañero</h2><p>Puedes cambiar entre mascota o planta, o elegir otra, cuando quieras. Tu progreso se conserva.</p></div></div>
        {!changingCompanion ? (
          <div className="companion-current">
            {profile.companionType === "mascota" ? <Mascot id={profile.mascot} size="small" /> : <Flower id={profile.flower} stage={3} size="small" />}
            <div className="companion-current-info">
              <strong>{currentCompanionName}</strong>
              <small>{profile.companionType === "mascota" ? "Mascota" : "Planta"}</small>
            </div>
            <Button variant="secondary" onClick={() => setChangingCompanion(true)}>Cambiar</Button>
          </div>
        ) : (
          <>
            <div className="companion-type-row" role="group" aria-label="Tipo de compañero">
              <button type="button" className={profile.companionType === "mascota" ? "active" : ""} onClick={() => setCompanionType("mascota")}><PawPrint size={17} /> Mascota</button>
              <button type="button" className={profile.companionType === "planta" ? "active" : ""} onClick={() => setCompanionType("planta")}><Leaf size={17} /> Planta</button>
            </div>
            {profile.companionType === "mascota" ? (
              <div className="mini-mascot-grid">{mascots.map((item) => <button key={item.id} className={profile.mascot === item.id ? "active" : ""} onClick={() => { setProfile({ ...profile, mascot: item.id as MascotId }); notify(isRegistered ? `${item.name} quedó guardado como tu acompañante.` : `${item.name} es tu acompañante durante esta sesión.`); setChangingCompanion(false); }}><Mascot id={item.id} size="small" /><span>{item.name}</span></button>)}</div>
            ) : (
              <div className="mini-mascot-grid">{flowers.map((item) => <button key={item.id} className={profile.flower === item.id ? "active" : ""} onClick={() => { setProfile({ ...profile, flower: item.id as FlowerId }); notify(isRegistered ? `${item.name} quedó guardada como tu planta acompañante.` : `${item.name} es tu planta acompañante durante esta sesión.`); setChangingCompanion(false); }}><Flower id={item.id} stage={3} size="small" /><span>{item.name}</span></button>)}</div>
            )}
            <button type="button" className="companion-cancel" onClick={() => setChangingCompanion(false)}>Cancelar</button>
          </>
        )}
      </Card>
      <Card className="about-card"><div className="settings-title"><Info size={21} /><div><h2>Control de tu información</h2><p>Puedes consultar las fuentes o borrar el perfil local para comenzar de nuevo.</p></div></div><div className="about-links"><button onClick={() => navigate("resources")}><Database size={18} /> Ver base de fuentes</button><button onClick={() => navigate("resources")}><BookOpen size={18} /> Leer recursos generales</button><button onClick={() => navigate("screening")}><ClipboardList size={18} /> Ir a Tamizaje</button></div>{screenings.results.length > 0 && <Button variant="ghost" onClick={() => { screenings.reset(); notify("Se borró tu historial de tamizaje guardado."); }}><RotateCcw size={16} /> Borrar historial de tamizaje</Button>}{isRegistered && <Button variant="ghost" onClick={onResetRegistration}><RotateCcw size={18} /> Borrar perfil local</Button>}</Card>
    </div></div>
  </div>;
}
