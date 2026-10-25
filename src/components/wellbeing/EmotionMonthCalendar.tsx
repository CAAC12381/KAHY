import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { emotionLabels } from "../../lib/emotionLexicon";
import { capitalizeFirst, toDayKey } from "../../lib/dayKey";
import type { EmotionEntry } from "../../types";
import { cx, toneFor, toneOrder, toneStyles } from "./tones";

const weekdays = ["L", "M", "M", "J", "V", "S", "D"];

type Props = {
  month: Date;
  onMonthChange: (month: Date) => void;
  onToday: () => void;
  selectedKey: string;
  todayKey: string;
  onSelect: (dayKey: string) => void;
  emotionsByDay: Map<string, EmotionEntry[]>;
  habitProgressOn: (dayKey: string) => { done: number; total: number };
};

/** Columna izquierda: vista mensual con color emocional + puntos de hábitos por día. */
export default function EmotionMonthCalendar({
  month,
  onMonthChange,
  onToday,
  selectedKey,
  todayKey,
  onSelect,
  emotionsByDay,
  habitProgressOn,
}: Props) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstOffset = (month.getDay() + 6) % 7; // semana inicia en lunes
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = Array.from({ length: firstOffset + daysInMonth }, (_, index) =>
    index < firstOffset ? null : index - firstOffset + 1,
  );

  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && monthIndex === now.getMonth();
  const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}-`;
  const daysWithEmotion = [...emotionsByDay.keys()].filter((key) => key.startsWith(monthPrefix)).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-0.5">
          <strong className="text-lg font-extrabold text-[var(--ink)] [font-family:var(--font-display)]">
            {capitalizeFirst(month.toLocaleDateString("es-MX", { month: "long", year: "numeric" }))}
          </strong>
          <small className="text-xs text-[var(--muted)]">
            {daysWithEmotion} {daysWithEmotion === 1 ? "día con registro emocional" : "días con registro emocional"}
          </small>
        </div>
        <div className="flex items-center gap-1.5">
          <NavButton label="Mes anterior" onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}>
            <ChevronLeft size={18} />
          </NavButton>
          <NavButton label="Ir a hoy" onClick={onToday}>
            <span className="px-1 text-xs font-bold">Hoy</span>
          </NavButton>
          <NavButton
            label="Mes siguiente"
            onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
            disabled={isCurrentMonth}
          >
            <ChevronRight size={18} />
          </NavButton>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2" aria-hidden="true">
        {weekdays.map((day, index) => (
          <span key={`${day}-${index}`} className="text-center text-[0.68rem] font-extrabold text-[var(--muted)]">
            {day}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {cells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} aria-hidden="true" />;

          const date = new Date(year, monthIndex, day);
          const key = toDayKey(date);
          const entries = emotionsByDay.get(key) ?? [];
          const latest = entries[entries.length - 1];
          const tone = latest ? toneFor(latest.primary) : null;
          const { done: habitsDone, total: habitTotal } = habitProgressOn(key);
          const isToday = key === todayKey;
          const isFuture = key > todayKey;
          const isSelected = key === selectedKey;

          const label = [
            date.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }),
            latest ? emotionLabels[latest.primary] : "sin registro emocional",
            `${habitsDone} de ${habitTotal} hábitos`,
          ].join(", ");

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              disabled={isFuture}
              aria-pressed={isSelected}
              aria-current={isToday ? "date" : undefined}
              aria-label={label}
              className={cx(
                "relative flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border text-[0.8rem] transition-all duration-200 sm:min-h-[60px]",
                tone ? `${toneStyles[tone].cell} font-extrabold text-[var(--ink)]` : "border-[#ebe7dc] bg-[#fbfaf6] text-[var(--muted)]",
                isFuture ? "cursor-default opacity-40" : "hover:-translate-y-0.5 hover:border-[var(--purple)] hover:shadow-[0_7px_18px_rgba(63,65,57,0.08)]",
                isSelected && "-translate-y-0.5 border-[var(--purple)] shadow-[0_7px_18px_rgba(63,65,57,0.1)] ring-2 ring-[var(--purple)]/35",
                isToday && !tone && "font-extrabold text-[var(--purple-deep)]",
              )}
            >
              <span className="leading-none">{day}</span>
              {isToday && (
                <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[var(--purple)]" aria-hidden="true" />
              )}
              <HabitDots done={habitsDone} total={habitTotal} />
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {toneOrder.map((tone) => (
          <span
            key={tone}
            className={cx("rounded-full px-2.5 py-1 text-[0.66rem] font-bold text-[#4f504a]", toneStyles[tone].swatch)}
          >
            {toneStyles[tone].label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-2.5 py-1 text-[0.66rem] font-bold text-[var(--muted)]">
          <span className="size-1.5 rounded-full bg-[var(--sage-deep)]" aria-hidden="true" />
          Hábitos completados
        </span>
      </div>
    </div>
  );
}

const MAX_DOTS = 5;

/** Minipuntos bajo el número: uno por hábito, rellenos los completados. Con más de 5 hábitos, "3/7". */
function HabitDots({ done, total }: { done: number; total: number }) {
  if (done === 0) return <span className="h-1.5" aria-hidden="true" />;
  if (total > MAX_DOTS) {
    return (
      <span className="text-[0.6rem] font-extrabold leading-none tabular-nums text-[var(--sage-deep)]" aria-hidden="true">
        {done}/{total}
      </span>
    );
  }
  return (
    <span className="flex gap-0.5" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cx(
            "size-1.5 rounded-full transition-colors duration-200",
            index < done ? "bg-[var(--sage-deep)]" : "bg-[var(--sage-deep)]/20",
          )}
        />
      ))}
    </span>
  );
}

function NavButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-9 min-w-9 place-items-center rounded-[10px] border border-[var(--line)] bg-[var(--cream)] px-2 text-[var(--ink)] transition-all duration-200 hover:border-[var(--purple)] disabled:hover:border-[var(--line)]"
    >
      {children}
    </button>
  );
}
