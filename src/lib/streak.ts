/**
 * Day-streak resolution.
 *
 * Extracted from Statistics.tsx so the lesson can advance the streak where the
 * studying actually happens, instead of only when the student happens to open
 * the statistics page.
 *
 * Dates are handled as local-calendar `YYYY-MM-DD` strings throughout. The
 * previous implementation combined `setHours(0,0,0,0)` with `toISOString()`,
 * which yields the *previous* calendar day for any timezone east of UTC --
 * including Israel (UTC+2/+3). `toLocalDateKey` avoids that entirely.
 */

/** Local calendar day as `YYYY-MM-DD`. Never round-trips through UTC. */
export const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** Whole local days between two `YYYY-MM-DD` keys. Negative if `to` precedes `from`. */
const daysBetween = (from: string, to: string): number => {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const fromUtc = Date.UTC(fy, fm - 1, fd);
  const toUtc = Date.UTC(ty, tm - 1, td);
  return Math.round((toUtc - fromUtc) / 86_400_000);
};

export interface ResolveStreakArgs {
  /** Streak currently persisted on the profile. */
  currentStreak: number;
  /** `profiles.last_chat_date`, a `YYYY-MM-DD` string, or null if never set. */
  lastChatDate: string | null | undefined;
  /** Whether the student has studied today. */
  studiedToday: boolean;
  /** Injectable for testing. Defaults to now. */
  today?: Date;
}

export interface ResolveStreakResult {
  /** The streak that should be displayed. */
  streak: number;
  /** Whether `streak` (and `last_chat_date`) differ from what is persisted. */
  shouldPersist: boolean;
  /** The value to write to `last_chat_date` when persisting. */
  todayKey: string;
}

/**
 * Pure streak resolution.
 *
 * - Studied today, last chat was yesterday  -> increment.
 * - Studied today, last chat was today      -> already counted, no change.
 * - Studied today, gap or never             -> restart at 1.
 * - Not studied today, gap of 2+ days       -> the streak is broken, reset to 0.
 * - Not studied today, last chat yesterday  -> still alive, no change.
 */
export function resolveStreak({
  currentStreak,
  lastChatDate,
  studiedToday,
  today = new Date(),
}: ResolveStreakArgs): ResolveStreakResult {
  const todayKey = toLocalDateKey(today);
  const gap = lastChatDate ? daysBetween(lastChatDate, todayKey) : null;

  if (!studiedToday) {
    // Only a gap of 2+ days actually breaks the streak. A gap of exactly 1
    // means the student studied yesterday and still has today to keep it.
    if (gap !== null && gap > 1) {
      return { streak: 0, shouldPersist: currentStreak !== 0, todayKey };
    }
    return { streak: currentStreak, shouldPersist: false, todayKey };
  }

  if (gap === 0) {
    // Already counted today.
    return { streak: currentStreak, shouldPersist: false, todayKey };
  }

  if (gap === 1) {
    return { streak: currentStreak + 1, shouldPersist: true, todayKey };
  }

  // No previous chat, or a gap large enough that the old streak is gone.
  // Today becomes day 1.
  return { streak: 1, shouldPersist: true, todayKey };
}

/** Whether any of the given timestamps fall on today's local calendar day. */
export function hasActivityToday(
  timestamps: Array<{ created_at: string }>,
  today: Date = new Date()
): boolean {
  const todayKey = toLocalDateKey(today);
  return timestamps.some(
    (row) => toLocalDateKey(new Date(row.created_at)) === todayKey
  );
}
