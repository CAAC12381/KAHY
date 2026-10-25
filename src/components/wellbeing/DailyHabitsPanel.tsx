import { Check, Droplet, Footprints, MonitorOff, NotebookPen, Sparkles, type LucideIcon } from "lucide-react";
import type { Habit } from "../../hooks/useDailyHabits";
import { emotionLabels } from "../../lib/emotionLexicon";
import { capitalizeFirst, fromDayKey } from "../../lib/dayKey";
import type { EmotionEntry } from "../../types";
import ProgressRing from "./ProgressRing";
import { cx, toneFor, toneStyles } from "./tones";

const habitIcons: Record<string, LucideIcon> = {
  water: Droplet,
  move: Footprints,
  "screen-break": MonitorOff,
  "mood-note": NotebookPen,
};

type Props = {
  dayKey: string;
  isToday: boolean;
  habits: Habit[];
  completed: string[];
  onToggle: (id: string) => void;
  emotions: EmotionEntry[];
  /** Nombre del compañero (mascota o flor). null si el usuario ocultó la mascota. */
  companionName?: string | null;
};

/** Columna derecha: hábitos de la fecha seleccionada en el calendario. */
export default function DailyHabitsPanel({ dayKey, isToday, habits, completed, onToggle, emotions, companionName }: Props) {
  const date = fromDayKey(dayKey);
  const doneCount = habits.filter((habit) => completed.includes(habit.id)).length;
  const dateLabel = capitalizeFirst(date.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }));
  const uniqueEmotions = [...new Set(emotions.map((entry) => entry.primary))];

  return (
    <aside
      className="flex h-full flex-col gap-4 rounded-2xl border border-[var(--line)] bg-[var(--cream)] p-4 sm:p-5"
      aria-label={`Hábitos del ${dateLabel}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[0.7rem] font-extrabold uppercase tracking-wider text-[var(--purple-deep)]">
            Hábitos del día
          </span>
          <h3 className="mt-0.5 flex flex-wrap items-center gap-2 text-lg font-extrabold leading-tight text-[var(--ink)] [font-family:var(--font-display)]">
            {dateLabel}
            {isToday && (
              <span className="rounded-full bg-[var(--purple-soft)] px-2 py-0.5 text-[0.68rem] font-bold normal-case text-[var(--purple-deep)]">
                Hoy
              </span>
            )}
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Pequeñas acciones que también cuentan</p>
        </div>
        <ProgressRing value={doneCount} total={habits.length} />
      </header>

      {uniqueEmotions.length > 0 && (
        <div className="rounded-xl bg-white/70 px-3 py-2.5">
          <p className="text-xs font-bold text-[var(--ink)]">Lo que apareció ese día</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {uniqueEmotions.map((emotion) => {
              const tone = toneFor(emotion);
              return (
                <span
                  key={emotion}
                  className={cx(
                    "rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold text-[#4f504a]",
                    tone ? toneStyles[tone].swatch : "bg-[var(--sage-soft)]",
                  )}
                >
                  {emotionLabels[emotion]}
                </span>
              );
            })}
          </div>
          <small className="mt-1.5 block text-[0.68rem] text-[var(--muted)]">Lecturas tentativas del lenguaje, no diagnósticos.</small>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {habits.map((habit) => {
          const done = completed.includes(habit.id);
          const Icon = habitIcons[habit.id] ?? Sparkles;
          return (
            <li key={habit.id}>
              <button
                type="button"
                // aria-disabled en vez de disabled: la regla global button:disabled los deslavaría
                onClick={() => isToday && onToggle(habit.id)}
                aria-disabled={!isToday}
                aria-pressed={done}
                className={cx(
                  "flex min-h-12 w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm font-bold transition-all duration-200",
                  done
                    ? "border-transparent bg-[var(--sage-soft)] text-[var(--sage-deep)]"
                    : "border-[var(--line)] bg-white text-[var(--ink)]",
                  isToday && !done && "hover:-translate-y-px hover:border-[var(--purple)] hover:shadow-sm",
                  !isToday && "!cursor-default",
                  !isToday && !done && "opacity-70",
                )}
              >
                <span
                  className={cx(
                    "grid size-6 shrink-0 place-items-center rounded-full border-[1.5px] transition-all duration-200",
                    done ? "border-[var(--sage-deep)] bg-[var(--sage-deep)] text-white" : "border-[var(--line)] text-transparent",
                  )}
                  aria-hidden="true"
                >
                  <Check size={14} strokeWidth={3} />
                </span>
                <span className="flex-1">{habit.label}</span>
                <Icon size={17} className="shrink-0 opacity-60" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      {!isToday && (
        <p className="text-xs text-[var(--muted)]">Los hábitos se marcan el mismo día. Los días anteriores son solo para consultar.</p>
      )}

      <FeedbackNote isToday={isToday} done={doneCount} total={habits.length} companionName={companionName} />
    </aside>
  );
}

function FeedbackNote({
  isToday,
  done,
  total,
  companionName,
}: {
  isToday: boolean;
  done: number;
  total: number;
  companionName?: string | null;
}) {
  let message: string;
  if (!isToday) {
    message = done > 0 ? `Ese día completaste ${done} de ${total} hábitos.` : "Ese día no hubo hábitos marcados, y está bien.";
  } else if (done === 0) {
    message = "Empieza por el que se sienta más fácil. Uno ya cuenta.";
  } else if (done < total) {
    message = `Vas ${done} de ${total}. Sin prisa: cada paso suma.`;
  } else {
    message = "¡Completaste todos los hábitos de hoy!";
  }

  const complete = done >= total;

  return (
    <div
      className={cx(
        "mt-auto flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[0.8rem] transition-colors duration-200",
        complete ? "bg-[var(--sage-soft)] text-[var(--sage-deep)]" : "bg-[var(--yellow-soft)] text-[var(--yellow-deep)]",
      )}
      aria-live="polite"
    >
      <Sparkles size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p className="font-semibold leading-snug">
        {message}
        {isToday && companionName && (
          <span className="block font-normal opacity-90">Cada hábito que marcas ayuda a {companionName} a crecer.</span>
        )}
      </p>
    </div>
  );
}
