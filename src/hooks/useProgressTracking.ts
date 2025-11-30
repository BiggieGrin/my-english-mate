import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProgressData {
  sessionProgress: number; // Continuous value 0-100, e.g., 68.43, 73.1, 91.85
  questionsAnswered: number;
  correctAnswers: number;
  mode: string;
}

export const useProgressTracking = (conversationId: string | undefined) => {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) {
      setIsLoading(false);
      return;
    }

    const fetchProgress = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch the current active session for this conversation
        const { data, error } = await supabase
          .from('lesson_sessions')
          .select('session_progress, questions_answered, correct_answers, mode')
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id)
          .is('completed_at', null)
          .maybeSingle();

        if (error) {
          console.error('Error fetching progress:', error);
          return;
        }

        if (data) {
          setProgress({
            sessionProgress: parseFloat((data.session_progress || 0).toFixed(2)),
            questionsAnswered: data.questions_answered || 0,
            correctAnswers: data.correct_answers || 0,
            mode: data.mode || '',
          });
        }
      } catch (error) {
        console.error('Error in progress tracking:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();

    // Subscribe to real-time updates on lesson_sessions
    const channel = supabase
      .channel(`session-progress-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lesson_sessions',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const data = payload.new;
          setProgress({
            sessionProgress: parseFloat((data.session_progress || 0).toFixed(2)),
            questionsAnswered: data.questions_answered || 0,
            correctAnswers: data.correct_answers || 0,
            mode: data.mode || '',
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId]);

  const recalculateProgress = async (sessionId: string) => {
    if (!sessionId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.functions.invoke('calculate-progress', {
        body: { sessionId },
      });
    } catch (error) {
      console.error('Error recalculating progress:', error);
    }
  };

  return { progress, isLoading, recalculateProgress };
};