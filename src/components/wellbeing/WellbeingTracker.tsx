import { useMemo, useState } from "react";
import type { MirrorTheme } from "../../data/mokaMirror";
import type { DailyHabitsApi } from "../../hooks/useDailyHabits";
import type { MirrorMoment } from "../../hooks/useMirrorJournal";
import { fromDayKey, startOfMonth, toDayKey } from "../../lib/dayKey";
import type { EmotionEntry } from "../../types";
import DailyHabitsPanel from "./DailyHabitsPanel";
import EmotionMonthCalendar from "./EmotionMonthCalendar";

type Props = {
  entries: EmotionEntry[];
  habits: DailyHabitsApi;
  companionName?: string | null;
  /** Días ("AAAA-MM-DD") en que se acompañó a Moka. Vienen de useMirrorJournal. */
  practicedDays?: string[];
  /** Tema de lo que se contó cada día ("escuela"…). Vienen de useMirrorJournal. */
  moments?: MirrorMoment[];
  onPracticeWithMoka?: (theme: MirrorTheme) => void;
};

/**
 * Calendario emocional + hábitos del día en un solo contenedor.
 * El día que eliges en el calendario controla el panel de hábitos.
 * También marca los días con Moka y permite practicar lo que se contó.
 */
export default function WellbeingTracker({ entries, habits, companionName, practicedDays = [], moments = [], onPracticeWithMoka }: Props) {
  const [selectedKey, setSelectedKey] = useState(habits.todayKey);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const emotionsByDay = useMemo(() => {
    const grouped = new Map<string, EmotionEntry[]>();
    entries.forEach((entry) => {
      const key = toDayKey(new Date(entry.at));
      grouped.set(key, [...(grouped.get(key) ?? []), entry]);
    });
    return grouped;
  }, [entries]);

  const practiced = useMemo(() => new Set(practicedDays), [practicedDays]);

  const themesByDay = useMemo(() => {
    const grouped = new Map<string, MirrorTheme[]>();
    moments.forEach((moment) => {
      const themes = grouped.get(moment.day) ?? [];
      if (!themes.includes(moment.theme)) grouped.set(moment.day, [...themes, moment.theme]);
    });
    return grouped;
  }, [moments]);

  const recordedDays = useMemo(
    () => new Set([...emotionsByDay.keys(), ...practiced, ...themesByDay.keys()]),
    [emotionsByDay, practiced, themesByDay],
  );

  function selectDay(key: string) {
    if (key > habits.todayKey) return;
    setSelectedKey(key);
    setMonth(startOfMonth(fromDayKey(key)));
  }

  function goToToday() {
    setSelectedKey(habits.todayKey);
    setMonth(startOfMonth(new Date()));
  }

  return (
    // @container: las columnas dependen del ancho real de la tarjeta (la app tiene sidebar),
    // no del viewport. @4xl = 56rem de contenedor.
    <section className="@container card overflow-hidden p-3 sm:p-5 @4xl:p-6" aria-label="Calendario emocional y hábitos">
      <div className="grid grid-cols-1 gap-5 @4xl:grid-cols-12 @4xl:gap-6">
        <div className="@4xl:col-span-7">
          <EmotionMonthCalendar
            month={month}
            onMonthChange={setMonth}
            onToday={goToToday}
            selectedKey={selectedKey}
            todayKey={habits.todayKey}
            onSelect={selectDay}
            emotionsByDay={emotionsByDay}
            practicedDays={practiced}
            recordedDays={recordedDays}
            habitsDoneOn={(key) => habits.habits.filter((habit) => habits.completedOn(key).includes(habit.id)).length}
            habitTotal={habits.habits.length}
          />
        </div>
        <div className="@4xl:col-span-5">
          <DailyHabitsPanel
            dayKey={selectedKey}
            isToday={selectedKey === habits.todayKey}
            habits={habits.habits}
            completed={habits.completedOn(selectedKey)}
            onToggle={habits.toggle}
            emotions={emotionsByDay.get(selectedKey) ?? []}
            themes={themesByDay.get(selectedKey) ?? []}
            practicedWithMoka={practiced.has(selectedKey)}
            onPracticeWithMoka={onPracticeWithMoka}
            companionName={companionName}
          />
        </div>
      </div>
    </section>
  );
}
