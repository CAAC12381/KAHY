import { Plus, Sparkles, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { AddHabitResult } from "../../hooks/useDailyHabits";
import { MAX_HABIT_LABEL, type HabitIcon, type HabitSuggestion } from "../../lib/habitCatalog";
import { habitIcons } from "./habitIcons";
import { cx } from "./tones";

type Props = {
  suggestions: HabitSuggestion[];
  canAddMore: boolean;
  remaining: number;
  onAdd: (label: string, icon?: HabitIcon) => AddHabitResult;
};

const VISIBLE_SUGGESTIONS = 4;

const errorText: Record<"empty" | "duplicate" | "limit", string> = {
  empty: "Escribe un hábito antes de añadirlo.",
  duplicate: "Ese hábito ya está en tu lista de hoy.",
  limit: "Llegaste al máximo de hábitos personalizados. Quita uno para añadir otro.",
};

/**
 * Botón "+ Añadir hábito" que despliega, dentro de la misma tarjeta,
 * un campo para escribir uno propio y chips con sugerencias de un clic.
 */
export default function AddHabitForm({ suggestions, canAddMore, remaining, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelId = useId();
  const inputId = useId();

  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  function add(label: string, icon?: HabitIcon) {
    const result = onAdd(label, icon);
    if (result.ok) {
      setStatus({ tone: "ok", message: `Añadido: ${result.habit.label}` });
      return true;
    }
    setStatus({ tone: "error", message: errorText[result.reason] });
    return false;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (add(text)) setText("");
    inputRef.current?.focus();
  }

  function close() {
    setOpen(false);
    setText("");
    setStatus(null);
    setShowAll(false);
  }

  const visibleSuggestions = showAll ? suggestions : suggestions.slice(0, VISIBLE_SUGGESTIONS);
  const hiddenCount = suggestions.length - visibleSuggestions.length;

  return (
    <div className="flex flex-col">
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls={panelId}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--purple)]/50 bg-transparent px-3 text-sm font-bold text-[var(--purple-deep)] transition-all duration-200 hover:border-[var(--purple)] hover:bg-[var(--purple-soft)]"
        >
          <Plus size={17} /> Añadir hábito
        </button>
      )}

      {/* Truco grid-rows 0fr → 1fr: anima la altura sin medirla. */}
      <div
        id={panelId}
        className={cx("grid transition-all duration-300 ease-out", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}
        inert={!open}
      >
        <div className="overflow-hidden">
          <div
            className="flex flex-col gap-3 rounded-2xl border border-[var(--purple-soft)] bg-[#F4F1EA] p-3.5"
            onKeyDown={(event) => event.key === "Escape" && close()}
          >
            <div className="flex items-center justify-between">
              <label htmlFor={inputId} className="text-xs font-extrabold text-[var(--ink)]">
                Crear hábito personalizado
              </label>
              <button
                type="button"
                onClick={close}
                aria-label="Cerrar"
                className="grid size-7 place-items-center rounded-lg text-[var(--muted)] transition-colors hover:bg-white hover:text-[var(--ink)]"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={submit} className="flex gap-2">
              <input
                ref={inputRef}
                id={inputId}
                value={text}
                onChange={(event) => { setText(event.target.value); setStatus(null); }}
                maxLength={MAX_HABIT_LABEL}
                placeholder="Ej. Leer 10 minutos"
                autoComplete="off"
                disabled={!canAddMore}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-white px-3.5 text-sm text-[var(--ink)] outline-none transition-all duration-200 placeholder:text-[var(--muted)]/70 focus:border-[var(--purple)] focus:ring-2 focus:ring-[var(--purple)]/25"
              />
              <button
                type="submit"
                disabled={!canAddMore || !text.trim()}
                aria-label="Añadir hábito escrito"
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--purple)] px-3 text-sm font-bold text-white transition-all duration-200 hover:bg-[var(--purple-deep)] sm:px-4"
              >
                <Plus size={16} aria-hidden="true" /> <span className="hidden sm:inline">Añadir</span>
              </button>
            </form>

            <p
              className={cx("min-h-4 text-xs", status?.tone === "error" ? "text-[var(--danger)]" : "text-[var(--success)]")}
              aria-live="polite"
            >
              {status?.message ?? (canAddMore ? `Puedes añadir ${remaining} más.` : "")}
            </p>

            {suggestions.length > 0 && canAddMore && (
              <div className="flex flex-col gap-2 border-t border-[var(--line)] pt-3">
                <p className="flex items-center gap-1.5 text-xs font-extrabold text-[var(--purple-deep)]">
                  <Sparkles size={14} aria-hidden="true" /> Sugerencias para tu bienestar
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {visibleSuggestions.map((suggestion) => {
                    const Icon = habitIcons[suggestion.icon];
                    return (
                      <li key={suggestion.label}>
                        <button
                          type="button"
                          onClick={() => add(suggestion.label, suggestion.icon)}
                          aria-label={`Añadir "${suggestion.label}"`}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border text-left border-[var(--line)] bg-white px-3 text-[0.78rem] font-semibold text-[var(--ink)] transition-all duration-200 hover:-translate-y-px hover:border-[var(--purple)] hover:bg-[var(--purple-soft)] hover:text-[var(--purple-deep)]"
                        >
                          <Icon size={14} className="opacity-70" aria-hidden="true" />
                          {suggestion.label}
                          <Plus size={13} className="opacity-50" aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                  {hiddenCount > 0 && (
                    <li>
                      <button
                        type="button"
                        onClick={() => setShowAll(true)}
                        className="inline-flex min-h-9 items-center rounded-full px-3 text-[0.78rem] font-bold text-[var(--purple-deep)] underline-offset-2 transition-colors hover:underline"
                      >
                        Ver {hiddenCount} más
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
