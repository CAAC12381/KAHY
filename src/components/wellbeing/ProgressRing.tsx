const RADIUS = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Anillo de progreso "2/4" para los hábitos del día. */
export default function ProgressRing({ value, total }: { value: number; total: number }) {
  const ratio = total > 0 ? Math.min(1, value / total) : 0;
  const complete = total > 0 && value >= total;

  return (
    <div
      className="relative grid size-16 shrink-0 place-items-center"
      role="img"
      aria-label={`${value} de ${total} hábitos completados`}
    >
      <svg viewBox="0 0 56 56" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <circle cx="28" cy="28" r={RADIUS} fill="none" strokeWidth="6" className="stroke-[var(--purple-soft)]" />
        <circle
          cx="28"
          cy="28"
          r={RADIUS}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
          className={`transition-all duration-500 ease-out ${complete ? "stroke-[var(--sage-deep)]" : "stroke-[var(--purple)]"}`}
        />
      </svg>
      <span className="relative text-sm font-extrabold tabular-nums text-[var(--ink)]">
        {value}/{total}
      </span>
    </div>
  );
}
