import { Accessibility, Contrast, Eye, Move, Palette, RotateCcw, Type, Underline, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ColorMode, Preferences, TextScale } from "../types";
import { Toggle } from "./ui";

const colorOptions: Array<{ value: ColorMode; label: string; swatches: string[] }> = [
  { value: "standard", label: "Original", swatches: ["#f8f6f0", "#93709e", "#afa781"] },
  { value: "high-contrast", label: "Alto contraste", swatches: ["#ffffff", "#111111", "#4b1763"] },
  { value: "grayscale", label: "Escala de grises", swatches: ["#ffffff", "#555555", "#b8b8b8"] },
  { value: "warm", label: "Tonos cálidos", swatches: ["#fff9ed", "#7c4d35", "#d7b86a"] },
];

const textOptions: Array<{ value: TextScale; label: string }> = [
  { value: "normal", label: "100%" },
  { value: "large", label: "112%" },
  { value: "extra-large", label: "125%" },
];

export default function AccessibilityMenu({ preferences, onChange }: { preferences: Preferences; onChange: (next: Preferences) => void }) {
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  function closeMenu() {
    setOpen(false);
    window.setTimeout(() => launcherRef.current?.focus(), 0);
  }

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function update<K extends keyof Preferences>(key: K, value: Preferences[K], message: string) {
    onChange({ ...preferences, [key]: value });
    setAnnouncement(message);
  }

  function reset() {
    onChange({
      ...preferences,
      reducedMotion: false,
      lowStimuli: false,
      simplified: false,
      textScale: "normal",
      colorMode: "standard",
      readableFont: false,
      underlineLinks: false,
    });
    setAnnouncement("Se restablecieron los ajustes visuales.");
  }

  return (
    <div className={`accessibility-widget ${open ? "is-open" : ""}`}>
      <button ref={launcherRef} className="accessibility-launcher" onClick={() => setOpen(true)} aria-label="Abrir menú de accesibilidad" aria-expanded={open} aria-controls="accessibility-panel">
        <Accessibility size={24} aria-hidden="true" />
        <span>Accesibilidad</span>
      </button>

      {open && (
        <section id="accessibility-panel" className="accessibility-panel" role="dialog" aria-modal="false" aria-labelledby="accessibility-title">
          <header className="accessibility-head">
            <span className="accessibility-head-icon"><Accessibility size={22} /></span>
            <div><h2 id="accessibility-title">Ajustes de accesibilidad</h2><p>Adapta la interfaz a lo que necesitas.</p></div>
            <button ref={closeRef} className="accessibility-close" onClick={closeMenu} aria-label="Cerrar menú de accesibilidad"><X size={21} /></button>
          </header>

          <div className="accessibility-panel-scroll">
            <fieldset className="accessibility-group">
              <legend><Palette size={17} /> Colores</legend>
              <div className="accessibility-color-grid">
                {colorOptions.map((option) => (
                  <button key={option.value} className={preferences.colorMode === option.value ? "active" : ""} onClick={() => update("colorMode", option.value, `Paleta ${option.label} activada.`)} aria-pressed={preferences.colorMode === option.value}>
                    <span className="color-swatches" aria-hidden="true">{option.swatches.map((color) => <i key={color} style={{ background: color }} />)}</span>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="accessibility-group">
              <legend><Type size={17} /> Tamaño del texto</legend>
              <div className="accessibility-text-sizes">
                {textOptions.map((option) => <button key={option.value} className={preferences.textScale === option.value ? "active" : ""} onClick={() => update("textScale", option.value, `Tamaño de texto ${option.label}.`)} aria-pressed={preferences.textScale === option.value}>{option.label}</button>)}
              </div>
            </fieldset>

            <div className="accessibility-toggles">
              <Toggle checked={preferences.readableFont} onChange={(value) => update("readableFont", value, value ? "Tipografía de lectura activada." : "Tipografía original activada.")} label="Tipografía más legible" description="Usa letras sencillas y mayor separación." />
              <Toggle checked={preferences.underlineLinks} onChange={(value) => update("underlineLinks", value, value ? "Enlaces subrayados." : "Subrayado de enlaces desactivado.")} label="Subrayar enlaces" description="Ayuda a distinguir acciones y vínculos." />
              <Toggle checked={preferences.reducedMotion} onChange={(value) => update("reducedMotion", value, value ? "Movimiento reducido." : "Movimiento restaurado.")} label="Reducir movimiento" description="Detiene animaciones no esenciales." />
              <Toggle checked={preferences.lowStimuli} onChange={(value) => update("lowStimuli", value, value ? "Modo de bajo estímulo activado." : "Modo de bajo estímulo desactivado.")} label="Bajo estímulo visual" description="Reduce decoración y contrastes innecesarios." />
              <Toggle checked={preferences.simplified} onChange={(value) => update("simplified", value, value ? "Interfaz simplificada." : "Interfaz completa.")} label="Simplificar la interfaz" description="Oculta elementos secundarios." />
            </div>

            <div className="accessibility-notes">
              <span><Eye size={16} /> Los cambios se aplican al instante.</span>
              <span><Move size={16} /> Puedes cerrar este panel con Escape.</span>
              <span><Contrast size={16} /> El sistema conserva tus ajustes.</span>
            </div>
            <button className="accessibility-reset" onClick={reset}><RotateCcw size={17} /> Restablecer ajustes visuales</button>
          </div>
          <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
        </section>
      )}
    </div>
  );
}
