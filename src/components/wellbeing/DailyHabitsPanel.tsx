import { HeartHandshake, Sparkles } from "lucide-react";
import { useState } from "react";
import { mirrorCompanions, mirrorThemes, type MirrorTheme } from "../../data/companionMirror";
import type { AddHabitResult } from "../../hooks/useDailyHabits";
import type { Habit, HabitIcon, HabitSuggestion } from "../../lib/habitCatalog";
import { emotionLabels } from "../../lib/emotionLexicon";
import { capitalizeFirst, fromDayKey } from "../../lib/dayKey";
import type { EmotionEntry } from "../../types";
import AddHabitForm from "./AddHabitForm";
import HabitItem from "./HabitItem";
import ProgressRing from "./ProgressRing";
import { cx, toneFor, toneStyles } from "./tones";

type Props = {
  dayKey: string;
  isToday: boolean;
  habits: Habit[];
  completed: string[];
  onToggle: (id: string) => void;
  /** Solo se usan cuando la fecha es hoy. */
  onAdd?: (label: string, icon?: HabitIcon) => AddHabitResult;
  onRemove?: (id: string) => void;
  suggestions?: HabitSuggestion[];
  canAddMore?: boolean;
  customRemaining?: number;
  emotions: EmotionEntry[];
  /** Temas de lo que se contó ese día ("escuela"…). */
  themes: MirrorTheme[];
  /** Con quién se practicó ese día "Lo que le dirías a alguien que quieres" (nombres). */
  practicedWith: string[];
  onPracticeWithCompanion?: (theme: MirrorTheme) => void;
  /** Nombre del compañero (mascota o flor). null si el usuario ocultó la mascota. */
  companionName?: string | null;
};

/** Columna derecha: hábitos de la fecha seleccionada en el calendario. */
export default function DailyHabitsPanel({
  dayKey,
  isToday,
  habits,
  completed,
  onToggle,
  onAdd,
  onRemove,
  suggestions = [],
  canAddMore = false,
  customRemaining = 0,
  emotions,
  themes,
  practicedWith,
  onPracticeWithCompanion,
  companionName,
}: Props) {
  const [newHabitId, setNewHabitId] = useState<string | null>(null);
  const date = fromDayKey(dayKey);
  const doneCount = habits.filter((habit) => completed.includes(habit.id)).length;
  const dateLabel = capitalizeFirst(date.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }));
  const uniqueEmotions = [...new Set(emotions.map((entry) => entry.primary))];
  const lastTheme = themes[themes.length - 1];

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

      {(uniqueEmotions.length > 0 || themes.length > 0 || practicedWith.length > 0) && (
        <div className="rounded-xl bg-white/70 px-3 py-2.5">
          <p className="text-xs font-bold text-[var(--ink)]">Lo que apareció ese día</p>
          {uniqueEmotions.length > 0 && (
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
          )}
          {themes.length > 0 && (
            <p className="mt-1.5 text-xs text-[var(--ink)]">
              Lo que contaste: {themes.map((theme) => mirrorThemes[theme].label.toLowerCase()).join(", ")}
            </p>
          )}
          {practicedWith.length > 0 && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-[var(--purple-deep)]">
              <HeartHandshake size={14} aria-hidden="true" /> Practicaste con {practicedWith.join(" y ")}
            </p>
          )}
          {lastTheme && onPracticeWithCompanion && (
            <button
              type="button"
              onClick={() => onPracticeWithCompanion(lastTheme)}
              className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#cdbed2] bg-white px-3 py-1.5 text-xs font-bold text-[var(--purple-deep)] transition-colors duration-200 hover:border-[var(--purple)]"
            >
              <HeartHandshake size={16} aria-hidden="true" /> Practicarlo con {mirrorCompanions[mirrorThemes[lastTheme].companion].name}
            </button>
          )}
          {uniqueEmotions.length > 0 && (
            <small className="mt-1.5 block text-[0.68rem] text-[var(--muted)]">Lecturas tentativas del lenguaje, no diagnósticos.</small>
          )}
        </div>
      )}

      {habits.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {habits.map((habit) => (
            <HabitItem
              key={habit.id}
              habit={habit}
              done={completed.includes(habit.id)}
              editable={isToday}
              isNew={habit.id === newHabitId}
              onToggle={onToggle}
              onRemove={onRemove}
            />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl bg-white/70 px-3.5 py-3 text-sm text-[var(--muted)]">Ese día no había hábitos en tu lista.</p>
      )}

      {isToday && onAdd && (
        <AddHabitForm
          suggestions={suggestions}
          canAddMore={canAddMore}
          remaining={customRemaining}
          onAdd={(label, icon) => {
            const result = onAdd(label, icon);
            if (result.ok) setNewHabitId(result.habit.id);
            return result;
          }}
        />
      )}

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
  if (total === 0) {
    message = "Añade un hábito pequeño para empezar.";
  } else if (!isToday) {
    message = done > 0 ? `Ese día completaste ${done} de ${total} hábitos.` : "Ese día no hubo hábitos marcados, y está bien.";
  } else if (done === 0) {
    message = "Empieza por el que se sienta más fácil. Uno ya cuenta.";
  } else if (done < total) {
    message = `Vas ${done} de ${total}. Sin prisa: cada paso suma.`;
  } else {
    message = "¡Completaste todos los hábitos de hoy!";
  }

  const complete = total > 0 && done >= total;

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
