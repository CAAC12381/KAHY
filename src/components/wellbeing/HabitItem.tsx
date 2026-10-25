import { Check, X } from "lucide-react";
import type { Habit } from "../../lib/habitCatalog";
import { habitIcons } from "./habitIcons";
import { cx } from "./tones";

type Props = {
  habit: Habit;
  done: boolean;
  editable: boolean;
  /** Para animar solo el hábito que se acaba de agregar. */
  isNew?: boolean;
  onToggle: (id: string) => void;
  onRemove?: (id: string) => void;
};

/** Un hábito de la lista. Los personalizados muestran una ✕ para quitarlos (solo hoy). */
export default function HabitItem({ habit, done, editable, isNew, onToggle, onRemove }: Props) {
  const Icon = habitIcons[habit.icon];
  const removable = editable && habit.custom && onRemove;

  return (
    <li className={cx("group relative", isNew && "animate-[habit-in_320ms_ease-out]")}>
      <button
        type="button"
        // aria-disabled en vez de disabled: la regla global button:disabled los deslavaría
        onClick={() => editable && onToggle(habit.id)}
        aria-disabled={!editable}
        aria-pressed={done}
        className={cx(
          "flex min-h-12 w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm font-bold transition-all duration-200",
          removable && "pr-11",
          done ? "border-transparent bg-[var(--sage-soft)] text-[#5c5a40]" : "border-[var(--line)] bg-white text-[var(--ink)]",
          editable && !done && "hover:-translate-y-px hover:border-[var(--purple)] hover:shadow-sm",
          !editable && "!cursor-default",
          !editable && !done && "opacity-70",
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
        <span className="min-w-0 flex-1 break-words">{habit.label}</span>
        <Icon size={17} className={cx("shrink-0 opacity-60 transition-opacity", removable && "group-hover:opacity-0 group-focus-within:opacity-0")} aria-hidden="true" />
      </button>

      {removable && (
        <button
          type="button"
          onClick={() => onRemove(habit.id)}
          aria-label={`Quitar el hábito "${habit.label}"`}
          title="Quitar hábito"
          className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-[var(--muted)] opacity-60 transition-all duration-200 hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] hover:opacity-100 focus-visible:opacity-100"
        >
          <X size={16} />
        </button>
      )}
    </li>
  );
}
