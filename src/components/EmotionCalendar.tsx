import { ChevronLeft, ChevronRight, HeartHandshake, MessageCircleHeart, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { mirrorThemes, type MirrorTheme } from "../data/mokaMirror";
import type { MirrorMoment } from "../hooks/useMirrorJournal";
import { emotionLabels, emotionTone } from "../lib/emotionLexicon";
import type { EmotionEntry } from "../types";

const weekdays = ["L", "M", "M", "J", "V", "S", "D"];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** "AAAA-MM-DD" (como los guarda "Lo que le dirías a alguien que quieres") a la clave de este calendario. */
function keyOfDay(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return dateKey(new Date(year, month - 1, date));
}

/**
 * Calendario emocional. Además de las emociones del chat, marca los días en
 * que se acompañó a Moka y el tema de lo que se contó ese día ("escuela"…),
 * con un botón para practicarlo con ella. Esos dos datos vienen de
 * useMirrorJournal y se quedan solo en este dispositivo.
 */
export default function EmotionCalendar({ entries, practicedDays = [], moments = [], onPracticeWithMoka }: {
  entries: EmotionEntry[];
  practicedDays?: string[];
  moments?: MirrorMoment[];
  onPracticeWithMoka?: (theme: MirrorTheme) => void;
}) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const grouped = useMemo(() => {
    const result = new Map<string, EmotionEntry[]>();
    entries.forEach((entry) => {
      const key = dateKey(new Date(entry.at));
      result.set(key, [...(result.get(key) || []), entry]);
    });
    return result;
  }, [entries]);
  const practiced = useMemo(() => new Set(practicedDays.map(keyOfDay)), [practicedDays]);
  const themesByDay = useMemo(() => {
    const result = new Map<string, MirrorTheme[]>();
    moments.forEach((moment) => {
      const key = keyOfDay(moment.day);
      const themes = result.get(key) || [];
      if (!themes.includes(moment.theme)) result.set(key, [...themes, moment.theme]);
    });
    return result;
  }, [moments]);
  const hasRecord = (key: string) => grouped.has(key) || practiced.has(key) || themesByDay.has(key);
  const firstOffset = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: firstOffset + days }, (_, index) => index < firstOffset ? null : index - firstOffset + 1);
  const selected = selectedKey ? grouped.get(selectedKey) || [] : [];
  const selectedThemes = selectedKey ? themesByDay.get(selectedKey) || [] : [];
  const selectedPracticed = selectedKey ? practiced.has(selectedKey) : false;
  const daysWithEntries = new Set([...grouped.keys(), ...practiced, ...themesByDay.keys()].filter((key) => {
    const [year, monthIndex] = key.split("-").map(Number);
    return year === month.getFullYear() && monthIndex === month.getMonth();
  })).size;

  function moveMonth(amount: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
    setSelectedKey(null);
  }

  function selectedDate() {
    const [year, monthIndex, day] = (selectedKey ?? "").split("-").map(Number);
    return new Date(year, monthIndex, day).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  }

  return (
    <div className="emotion-calendar">
      <div className="emotion-calendar-top">
        <div><strong>{month.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}</strong><small>{daysWithEntries} {daysWithEntries === 1 ? "día con registro" : "días con registro"}</small></div>
        <div className="emotion-calendar-nav">
          <button onClick={() => moveMonth(-1)} aria-label="Mes anterior"><ChevronLeft size={18} /></button>
          <button onClick={() => { setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); setSelectedKey(null); }}>Hoy</button>
          <button onClick={() => moveMonth(1)} aria-label="Mes siguiente"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="emotion-weekdays" aria-hidden="true">{weekdays.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
      <div className="emotion-days">
        {cells.map((day, index) => {
          if (!day) return <span className="emotion-day empty" key={`empty-${index}`} />;
          const date = new Date(month.getFullYear(), month.getMonth(), day);
          const key = dateKey(date);
          const dayEntries = grouped.get(key) || [];
          const latest = dayEntries[dayEntries.length - 1];
          const today = dateKey(new Date()) === key;
          const withMoka = practiced.has(key);
          const recorded = hasRecord(key);
          const label = [
            latest ? `${emotionLabels[latest.primary]}, ${dayEntries.length} registro${dayEntries.length === 1 ? "" : "s"}` : "",
            withMoka ? "practicaste con Moka" : "",
          ].filter(Boolean).join(", ");
          return (
            <button
              key={key}
              className={`emotion-day ${latest ? `has-emotion tone-${emotionTone(latest.primary)}` : recorded ? "has-emotion" : ""} ${selectedKey === key ? "selected" : ""}`}
              onClick={() => recorded && setSelectedKey(selectedKey === key ? null : key)}
              disabled={!recorded}
              aria-label={`${day}: ${label || (recorded ? "algo que contaste" : "sin registro")}`}
            >
              <span>{day}</span>{today && <i className="today-dot" />}{latest && <i className="emotion-dot" />}{withMoka && <HeartHandshake className="mirror-mark" size={11} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {selectedKey && hasRecord(selectedKey) ? (
        <div className="emotion-day-detail">
          <MessageCircleHeart size={19} />
          <div>
            <strong>{selectedDate()}</strong>
            {selected.length > 0 && <p>{selected.map((entry) => `${emotionLabels[entry.primary]} · ${entry.progress.replace("_", " ")}`).join("  ·  ")}</p>}
            {selectedThemes.length > 0 && <p>Lo que contaste: {selectedThemes.map((theme) => mirrorThemes[theme].label.toLowerCase()).join(", ")}</p>}
            {selectedPracticed && <p className="emotion-day-moka"><HeartHandshake size={14} /> Practicaste con Moka</p>}
            {selectedThemes.length > 0 && onPracticeWithMoka && (
              <button type="button" className="emotion-day-practice" onClick={() => onPracticeWithMoka(selectedThemes[selectedThemes.length - 1])}>
                <HeartHandshake size={16} /> Practicarlo con Moka
              </button>
            )}
            {selected.length > 0 && <small>Lecturas tentativas del lenguaje, no diagnósticos.</small>}
          </div>
        </div>
      ) : (
        <div className="emotion-calendar-empty"><Sparkles size={18} /><span>{entries.length || practicedDays.length || moments.length ? "Selecciona un día con color para ver el registro." : "Cuando expreses una emoción en el chat, aparecerá aquí automáticamente."}</span></div>
      )}
      <div className="emotion-legend"><span className="tone-sun">Energía agradable</span><span className="tone-calm">Calma o neutral</span><span className="tone-heavy">Emoción difícil</span><span className="tone-alert">Tensión o agobio</span><span className="tone-moka"><HeartHandshake size={11} aria-hidden="true" /> Practicaste con Moka</span></div>
    </div>
  );
}
