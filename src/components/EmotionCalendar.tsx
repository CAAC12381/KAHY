import { ChevronLeft, ChevronRight, MessageCircleHeart, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { emotionLabels, emotionTone } from "../lib/emotionLexicon";
import type { EmotionEntry } from "../types";

const weekdays = ["L", "M", "M", "J", "V", "S", "D"];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function sameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

export default function EmotionCalendar({ entries }: { entries: EmotionEntry[] }) {
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
  const firstOffset = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: firstOffset + days }, (_, index) => index < firstOffset ? null : index - firstOffset + 1);
  const selected = selectedKey ? grouped.get(selectedKey) || [] : [];
  const daysWithEntries = [...grouped.entries()].filter(([key]) => {
    const [year, monthIndex] = key.split("-").map(Number);
    return year === month.getFullYear() && monthIndex === month.getMonth();
  }).length;

  function moveMonth(amount: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
    setSelectedKey(null);
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
          return (
            <button
              key={key}
              className={`emotion-day ${latest ? `has-emotion tone-${emotionTone(latest.primary)}` : ""} ${selectedKey === key ? "selected" : ""}`}
              onClick={() => latest && setSelectedKey(selectedKey === key ? null : key)}
              disabled={!latest}
              aria-label={latest ? `${day}: ${emotionLabels[latest.primary]}, ${dayEntries.length} registro${dayEntries.length === 1 ? "" : "s"}` : `${day}: sin registro`}
            >
              <span>{day}</span>{today && <i className="today-dot" />}{latest && <i className="emotion-dot" />}
            </button>
          );
        })}
      </div>
      {selected.length > 0 ? (
        <div className="emotion-day-detail">
          <MessageCircleHeart size={19} />
          <div><strong>{new Date(selected[0].at).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</strong><p>{selected.map((entry) => `${emotionLabels[entry.primary]} · ${entry.progress.replace("_", " ")}`).join("  ·  ")}</p><small>Lecturas tentativas del lenguaje, no diagnósticos.</small></div>
        </div>
      ) : (
        <div className="emotion-calendar-empty"><Sparkles size={18} /><span>{entries.length ? "Selecciona un día con color para ver el registro." : "Cuando expreses una emoción en el chat, aparecerá aquí automáticamente."}</span></div>
      )}
      <div className="emotion-legend"><span className="tone-sun">Energía agradable</span><span className="tone-calm">Calma o neutral</span><span className="tone-heavy">Emoción difícil</span><span className="tone-alert">Tensión o agobio</span></div>
    </div>
  );
}
