import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProgressData {
  overall: number;
  concept: number;
  practice: number;
  assessment: number;
  totalQuestions: number;
  totalCorrect: number;
}

export const useProgressTracking = (topicId: string | undefined) => {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!topicId) {
      setIsLoading(false);
      return;
    }

    const fetchProgress = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('user_topics')
          .select('concept_score, practice_score, assessment_score, overall_progress, total_questions_answered, correct_answers')
          .eq('user_id', user.id)
          .eq('topic_id', topicId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching progress:', error);
          return;
        }

        if (data) {
          setProgress({
            overall: data.overall_progress || 0,
            concept: data.concept_score || 0,
            practice: data.practice_score || 0,
            assessment: data.assessment_score || 0,
            totalQuestions: data.total_questions_answered || 0,
            totalCorrect: data.correct_answers || 0,
          });
        }
      } catch (error) {
        console.error('Error in progress tracking:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`progress-${topicId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_topics',
          filter: `topic_id=eq.${topicId}`,
        },
        (payload) => {
          const data = payload.new;
          setProgress({
            overall: data.overall_progress || 0,
            concept: data.concept_score || 0,
            practice: data.practice_score || 0,
            assessment: data.assessment_score || 0,
            totalQuestions: data.total_questions_answered || 0,
            totalCorrect: data.correct_answers || 0,
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [topicId]);

  const recalculateProgress = async () => {
    if (!topicId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.functions.invoke('calculate-progress', {
        body: { topicId },
      });
    } catch (error) {
      console.error('Error recalculating progress:', error);
    }
  };

  return { progress, isLoading, recalculateProgress };
};