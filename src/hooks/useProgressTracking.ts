import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProgressData {
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
          .select('questions_answered, correct_answers, mode')
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

  return { progress, isLoading };
};