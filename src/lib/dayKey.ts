/**
 * Claves de día en hora LOCAL ("2026-10-24").
 * No usar toISOString(): en México (UTC-6) cambia de día a las 6 pm.
 */
export function toDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function fromDayKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isDayKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** "sábado, 24 de octubre" → "Sábado, 24 de octubre" (CSS capitalize pondría "De"). */
export function capitalizeFirst(text: string): string {
  return text.charAt(0).toLocaleUpperCase("es-MX") + text.slice(1);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
