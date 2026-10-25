import {
  BookOpen,
  Coffee,
  Droplet,
  Footprints,
  Heart,
  MessageCircleHeart,
  MonitorOff,
  Moon,
  NotebookPen,
  PersonStanding,
  Sprout,
  Sun,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { HabitIcon } from "../../lib/habitCatalog";

export const habitIcons: Record<HabitIcon, LucideIcon> = {
  water: Droplet,
  move: Footprints,
  screen: MonitorOff,
  note: NotebookPen,
  breath: Wind,
  stretch: PersonStanding,
  gratitude: Heart,
  tea: Coffee,
  sun: Sun,
  read: BookOpen,
  talk: MessageCircleHeart,
  sleep: Moon,
  custom: Sprout,
};
