import {
  Activity, Award, BatteryCharging, BookOpen, Brain, Briefcase, CalendarCheck, Clapperboard, CloudLightning, Code2, Coins, Compass, Crown,
  Droplet, Dumbbell, Flag, Flame, Footprints, Gem, GraduationCap, Hammer, HandHeart, Handshake, Heart, HeartPulse, Home, Leaf, Lightbulb,
  Medal, Moon, Mountain, Music, Orbit, Palette, PenLine, PiggyBank, Phone, Shield, ShieldCheck, Sparkles, Sprout, Sun, Swords, Target,
  ThumbsUp, TrendingUp, Trophy, Users, Waves, Wind, Zap, type LucideIcon,
} from "lucide-react";
import { REACTION_LABELS } from "@/lib/catalog";
import type { DimId, NotifIcon, ReactionKind } from "@/lib/types";

/** One line icon per life dimension. */
export const AREA_ICON: Record<DimId, LucideIcon> = {
  health: HeartPulse, intellectual: Brain, emotional: Waves, character: ShieldCheck, spiritual: Sun,
  social: Users, financial: Coins, career: Briefcase, quality: Home, vision: Compass,
};

/** Icons a quest can wear (keys in lib/catalog QUEST_ICONS). */
export const QUEST_ICON: Record<string, LucideIcon> = {
  bolt: Zap, dumbbell: Dumbbell, run: Activity, walk: Footprints, water: Droplet, sleep: Moon, book: BookOpen, study: GraduationCap,
  code: Code2, briefcase: Briefcase, brain: Lightbulb, meditate: Leaf, heart: Heart, shield: Shield, users: Users, phone: Phone,
  coins: PiggyBank, home: Home, palette: Palette, music: Music, mountain: Mountain, sun: Sun, pen: PenLine, sprout: Sprout,
};

export const BADGE_ICON: Record<string, LucideIcon> = {
  spark: Sparkles, aura100: Zap, static: BatteryCharging, rod: CloudLightning, lord: Crown, storm30: Orbit, collab: Handshake,
  balanced: Compass, quest: Flag, goal: Target, glue: Users, rival: Swords, aura1000: Gem, lvl5: Wind, lvl8: Crown,
  gym: Dumbbell, worm: BookOpen, ninja: Hammer, scholar: GraduationCap, giver: Sprout,
  hydro: Droplet, saver: PiggyBank, reflect: Moon, honest: Heart,
};

export const NOTIF_ICON: Record<NotifIcon, LucideIcon> = {
  bolt: Zap, trophy: Trophy, level: TrendingUp, badge: Medal, goal: Target, users: Users, rest: CalendarCheck, duel: Swords, quest: Award, react: Zap,
};

/** Positive reactions only, never Aura. */
export const REACTIONS: { id: ReactionKind; label: string; icon: LucideIcon }[] = [
  { id: "clap", label: REACTION_LABELS.clap, icon: ThumbsUp },
  { id: "zap", label: REACTION_LABELS.zap, icon: Zap },
  { id: "heart", label: REACTION_LABELS.heart, icon: HandHeart },
  { id: "fire", label: REACTION_LABELS.fire, icon: Flame },
];

export const FEED_ICON: Record<string, LucideIcon> = {
  quest: Zap, streak: Flame, challenge: Flag, mission: Handshake, meetup: Users, goal: Target, level: TrendingUp,
  badge: Medal, daily: Sun, rivalry: Swords, started: Clapperboard, together: Handshake,
};
