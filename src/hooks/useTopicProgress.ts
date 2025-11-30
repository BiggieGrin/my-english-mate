import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TopicProgressData {
  topicId: string;
  progress: number; // 0-100, continuous (e.g., 64.73)
  totalSessions: number;
  totalQuestions: number;
  totalCorrect: number;
}

export const useTopicProgress = (topicId: string | undefined) => {
  const [progress, setProgress] = useState<TopicProgressData | null>(null);
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

        // Fetch topic progress from user_topics
        const { data: userTopic, error } = await supabase
          .from('user_topics')
          .select('overall_progress, total_questions_answered, correct_answers')
          .eq('user_id', user.id)
          .eq('topic_id', topicId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching topic progress:', error);
          return;
        }

        // Count completed sessions
        const { count: sessionsCount } = await supabase
          .from('lesson_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('topic_id', topicId)
          .not('completed_at', 'is', null);

        if (userTopic) {
          setProgress({
            topicId,
            progress: userTopic.overall_progress || 0,
            totalSessions: sessionsCount || 0,
            totalQuestions: userTopic.total_questions_answered || 0,
            totalCorrect: userTopic.correct_answers || 0,
          });
        } else {
          // Topic not started yet
          setProgress({
            topicId,
            progress: 0,
            totalSessions: 0,
            totalQuestions: 0,
            totalCorrect: 0,
          });
        }
      } catch (error) {
        console.error('Error in topic progress tracking:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();

    // Subscribe to real-time updates on user_topics
    const channel = supabase
      .channel(`topic-progress-${topicId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_topics',
          filter: `topic_id=eq.${topicId}`,
        },
        async (payload) => {
          const data = payload.new;
          
          // Refetch session count
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { count: sessionsCount } = await supabase
            .from('lesson_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('topic_id', topicId)
            .not('completed_at', 'is', null);

          setProgress({
            topicId,
            progress: data.overall_progress || 0,
            totalSessions: sessionsCount || 0,
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

      await supabase.functions.invoke('calculate-topic-progress', {
        body: { topicId },
      });
    } catch (error) {
      console.error('Error recalculating topic progress:', error);
    }
  };

  return { progress, isLoading, recalculateProgress };
};
