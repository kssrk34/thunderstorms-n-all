import {
  Award, BatteryCharging, BookOpen, Brain, Briefcase, CalendarCheck, CloudLightning, Compass, Crown, Droplet, Dumbbell,
  Flag, GraduationCap, Hammer, Heart, HeartHandshake, Home, Leaf, Medal, Moon, Mountain, Palette, PiggyBank, Sparkles, Sprout,
  Swords, Target, TrendingUp, Trophy, Users, Utensils, Waves, Wind, Zap, type LucideIcon,
} from "lucide-react";
import type { DimId, NotifIcon } from "@/lib/types";

export const AREA_ICON: Record<DimId, LucideIcon> = {
  health: Heart, mind: Brain, emotional: Waves, career: Briefcase, money: PiggyBank, family: Home,
  friends: Users, creativity: Palette, giving: Sprout, calm: Leaf, adventure: Mountain, vision: Compass,
};

export const ACTIVITY_ICON: Record<string, LucideIcon> = {
  exercise: Dumbbell, study: GraduationCap, upskill: Hammer, read: BookOpen, save: PiggyBank, volunteer: HeartHandshake,
  hobby: Palette, family: Home, calm: Leaf, cook: Utensils, friends: Users, explore: Compass,
};

export const BADGE_ICON: Record<string, LucideIcon> = {
  spark: Sparkles, static: BatteryCharging, rod: Zap, lord: CloudLightning, hydro: Droplet, worm: BookOpen, ninja: Hammer,
  gym: Dumbbell, scholar: GraduationCap, glue: Users, saver: PiggyBank, reflect: Moon, quest: Flag, goal: Target,
  honest: Heart, lvl5: Wind, lvl8: Crown, giver: Sprout,
};

export const NOTIF_ICON: Record<NotifIcon, LucideIcon> = {
  bolt: Zap, trophy: Trophy, level: TrendingUp, badge: Medal, goal: Target, users: Users, rest: CalendarCheck, duel: Swords, quest: Award,
};
