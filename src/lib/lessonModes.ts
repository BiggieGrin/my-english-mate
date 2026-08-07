/**
 * Single source of truth for lesson modes.
 *
 * Previously the same concept existed in four incompatible forms: the URL used
 * `learn|practice|homework`, Lesson.tsx mapped those to Hebrew, the DB stored
 * the Hebrew string, and the edge function mapped Hebrew back to
 * `learn|homework|exam_prep`. `הכנה למבחן` was produced by Topic.tsx and
 * handled by the edge function but had no entry in Lesson's map, so exam prep
 * silently ran as a normal lesson.
 */

export type LessonMode = "learn" | "homework" | "exam_prep";

/** The tutor persona. One consistent identity across every turn. */
export const TEACHER_NAME = "מאיה";
export const TEACHER_AVATAR = "👩‍🏫";

export interface ModeConfig {
  readonly slug: LessonMode;
  /** The value persisted in `conversations.mode` and understood by the edge function. */
  readonly hebrew: string;
  /** Shown under the topic title in the lesson header. */
  readonly label: string;
  /**
   * Student turns that constitute a full session.
   * Roughly matched to the durations Topic.tsx already advertises.
   */
  readonly sessionGoal: number;
  /**
   * Autonomy levers. Each chip sends its own text as an ordinary user message,
   * so these require no change to the edge function.
   */
  readonly quickReplies: readonly string[];
}

export const LESSON_MODES = {
  learn: {
    slug: "learn",
    hebrew: "לימוד",
    label: "לימוד הנושא",
    sessionGoal: 8,
    quickReplies: [
      "הבנתי, בוא נתרגל",
      "אפשר עוד דוגמה?",
      "לא הבנתי, תסביר שוב",
      "אפשר קצת יותר קל?",
    ],
  },
  homework: {
    slug: "homework",
    hebrew: "שיעורי בית",
    label: "שיעורי בית",
    sessionGoal: 6,
    quickReplies: [
      "בוא נעבור לשאלה הבאה",
      "תן לי רמז",
      "אפשר להסביר את הכלל?",
    ],
  },
  exam_prep: {
    slug: "exam_prep",
    hebrew: "הכנה למבחן",
    label: "הכנה למבחן",
    sessionGoal: 10,
    quickReplies: ["עוד שאלה", "תן לי רמז", "בוא נעבור על הטעויות שלי"],
  },
} as const satisfies Record<LessonMode, ModeConfig>;

const HEBREW_TO_MODE: Record<string, LessonMode> = {
  לימוד: "learn",
  "שיעורי בית": "homework",
  "הכנה למבחן": "exam_prep",
  // Legacy rows only. Nothing produces `תרגול` any more, and the edge function
  // never had a branch for it -- it always fell through to `learn`.
  תרגול: "learn",
};

export const modeFromSlug = (slug?: string | null): LessonMode | null =>
  slug && slug in LESSON_MODES ? (slug as LessonMode) : null;

export const modeFromHebrew = (hebrew?: string | null): LessonMode | null =>
  (hebrew && HEBREW_TO_MODE[hebrew]) ?? null;

export const hebrewForMode = (mode: LessonMode): string =>
  LESSON_MODES[mode].hebrew;

/**
 * Resolve the active mode. Precedence: URL -> navigation state -> DB row -> learn.
 *
 * The DB fallback is what makes a bare `/lesson/:id` deep link or a hard
 * refresh recover the right mode instead of silently reverting to `לימוד`.
 */
export const resolveMode = (
  slug?: string | null,
  stateMode?: string | null,
  dbMode?: string | null
): LessonMode =>
  modeFromSlug(slug) ??
  modeFromHebrew(stateMode) ??
  modeFromSlug(stateMode) ??
  modeFromHebrew(dbMode) ??
  "learn";
