import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSessionTracking = (
  conversationId: string | undefined,
  topicId: string | undefined,
  mode: string
) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Map Hebrew mode to English
  const getModeKey = (modeStr: string): 'learn' | 'homework' | 'exam_prep' => {
    const modeMap: Record<string, 'learn' | 'homework' | 'exam_prep'> = {
      "שיעורי בית": "homework",
      "הכנה למבחן": "exam_prep",
      "לימוד": "learn",
      "למידה": "learn",
      homework: "homework",
      exam_prep: "exam_prep",
      learn: "learn",
    };
    return modeMap[modeStr] || 'learn';
  };

  // Create or get session
  useEffect(() => {
    if (!conversationId || !topicId) return;

    const initSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if session already exists for this conversation
        const { data: existingSession } = await supabase
          .from('lesson_sessions')
          .select('id')
          .eq('conversation_id', conversationId)
          .is('completed_at', null)
          .maybeSingle();

        if (existingSession) {
          setSessionId(existingSession.id);
          console.log('Using existing session:', existingSession.id);
        } else {
          // Create new session
          const { data: newSession, error } = await supabase
            .from('lesson_sessions')
            .insert({
              user_id: user.id,
              topic_id: topicId,
              conversation_id: conversationId,
              mode: getModeKey(mode),
            })
            .select('id')
            .single();

          if (error) {
            console.error('Error creating session:', error);
            return;
          }

          setSessionId(newSession.id);
          console.log('Created new session:', newSession.id);
        }
      } catch (error) {
        console.error('Error initializing session:', error);
      }
    };

    initSession();
  }, [conversationId, topicId, mode]);

  // Track messages and questions
  const trackMessage = async (isQuestion: boolean, isCorrect?: boolean) => {
    if (!sessionId) return;

    try {
      const newTotalMessages = totalMessages + 1;
      const newQuestionsAnswered = isQuestion ? questionsAnswered + 1 : questionsAnswered;
      const newCorrectAnswers = (isQuestion && isCorrect) ? correctAnswers + 1 : correctAnswers;

      setTotalMessages(newTotalMessages);
      setQuestionsAnswered(newQuestionsAnswered);
      setCorrectAnswers(newCorrectAnswers);

      // Update session in database
      await supabase
        .from('lesson_sessions')
        .update({
          total_messages: newTotalMessages,
          questions_answered: newQuestionsAnswered,
          correct_answers: newCorrectAnswers,
        })
        .eq('id', sessionId);

      // Trigger real-time progress calculation
      await supabase.functions.invoke('calculate-progress', {
        body: { sessionId },
      });
    } catch (error) {
      console.error('Error tracking message:', error);
    }
  };

  // Check for completion periodically
  useEffect(() => {
    if (!sessionId || !topicId) return;

    const checkCompletion = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        await supabase.functions.invoke('ai-teacher-chat-completion', {
          body: {
            sessionId,
            conversationId,
            mode: getModeKey(mode),
            topicId,
          },
        });
      } catch (error) {
        console.error('Error checking completion:', error);
      }
    };

    // Check every 30 seconds
    checkIntervalRef.current = setInterval(checkCompletion, 30000);

    // Also check immediately after 10 messages
    if (totalMessages > 0 && totalMessages % 10 === 0) {
      checkCompletion();
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [sessionId, conversationId, topicId, mode, totalMessages]);

  return {
    sessionId,
    trackMessage,
    stats: {
      questionsAnswered,
      correctAnswers,
      totalMessages,
    },
  };
};