import { useEffect, useRef, useState } from "react";
import { useUpdateProfileMutation, type Profile } from "@/store/api/profileApi";
import { resolveStreak } from "@/lib/streak";

/**
 * Advances the day streak from inside the lesson.
 *
 * Previously the streak only moved when the student happened to open
 * /statistics, so studying every day without visiting that page left it at
 * zero. Both columns already exist on `profiles`, so this needs no migration.
 */
export function useStudyStreak({
  profile,
  userId,
  /** Flips true once the student has actually taken a turn this session. */
  hasStudied,
}: {
  profile?: Profile;
  userId?: string;
  hasStudied: boolean;
}) {
  const [updateProfile] = useUpdateProfileMutation();
  const persistedRef = useRef(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!profile) return;

    const result = resolveStreak({
      currentStreak: profile.current_streak ?? 0,
      lastChatDate: profile.last_chat_date,
      studiedToday: hasStudied,
    });

    setStreak(result.streak);

    if (!result.shouldPersist || !userId || persistedRef.current) return;
    persistedRef.current = true;
    void updateProfile({
      userId,
      updates: {
        current_streak: result.streak,
        last_chat_date: result.todayKey,
      },
    });
  }, [profile, userId, hasStudied, updateProfile]);

  return streak;
}

/**
 * Increments `profiles.lessons_completed` once per conversation.
 *
 * The column exists but nothing has ever written it. A localStorage guard
 * prevents double-counting across remounts. Not transactional -- acceptable
 * for a motivational counter, and the only option without a migration.
 */
export function useLessonCompletion({
  isComplete,
  conversationId,
  userId,
  profile,
}: {
  isComplete: boolean;
  conversationId?: string;
  userId?: string;
  profile?: Profile;
}) {
  const [updateProfile] = useUpdateProfileMutation();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!isComplete || firedRef.current) return;
    if (!conversationId || !userId || !profile) return;

    const key = `lessonCompleted:${conversationId}`;
    if (localStorage.getItem(key)) {
      firedRef.current = true;
      return;
    }

    firedRef.current = true;
    localStorage.setItem(key, "1");
    void updateProfile({
      userId,
      updates: { lessons_completed: (profile.lessons_completed ?? 0) + 1 },
    });
  }, [isComplete, conversationId, userId, profile, updateProfile]);
}
