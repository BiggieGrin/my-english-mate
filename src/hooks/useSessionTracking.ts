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

  // Track messages and questions with detailed metrics
  const trackMessage = async (
    isQuestion: boolean, 
    isCorrect?: boolean, 
    isFluent?: boolean, 
    usedHint?: boolean
  ) => {
    if (!sessionId) return;

    try {
      const newTotalMessages = totalMessages + 1;
      const newQuestionsAnswered = isQuestion ? questionsAnswered + 1 : questionsAnswered;
      const newCorrectAnswers = (isQuestion && isCorrect) ? correctAnswers + 1 : correctAnswers;

      setTotalMessages(newTotalMessages);
      setQuestionsAnswered(newQuestionsAnswered);
      setCorrectAnswers(newCorrectAnswers);

      // Build update object with all metrics
      const updateData: any = {
        total_messages: newTotalMessages,
        questions_answered: newQuestionsAnswered,
        correct_answers: newCorrectAnswers,
      };

      // Track fluent answers (correct without hints)
      if (isQuestion && isFluent) {
        const { data: currentSession } = await supabase
          .from('lesson_sessions')
          .select('fluent_answers')
          .eq('id', sessionId)
          .single();
        
        updateData.fluent_answers = (currentSession?.fluent_answers || 0) + 1;
      }

      // Track hints used
      if (isQuestion && usedHint) {
        const { data: currentSession } = await supabase
          .from('lesson_sessions')
          .select('hints_used, correct_after_hint')
          .eq('id', sessionId)
          .single();
        
        updateData.hints_used = (currentSession?.hints_used || 0) + 1;
        
        // If they got it correct after a hint
        if (isCorrect) {
          updateData.correct_after_hint = (currentSession?.correct_after_hint || 0) + 1;
        }
      }

      // Update session in database (but don't recalculate progress yet)
      await supabase
        .from('lesson_sessions')
        .update(updateData)
        .eq('id', sessionId);
    } catch (error) {
      console.error('Error tracking message:', error);
    }
  };

  // Recalculate progress manually (called on inactivity or unmount)
  const recalculateProgress = async () => {
    if (!topicId) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.functions.invoke('calculate-topic-progress', {
        body: { topicId },
      });
      
      console.log('Progress recalculated for topic:', topicId);
    } catch (error) {
      console.error('Error recalculating progress:', error);
    }
  };

  // Debounced progress recalculation after inactivity
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Set new timer: recalculate after 30 seconds of inactivity
    if (totalMessages > 0) {
      inactivityTimerRef.current = setTimeout(() => {
        recalculateProgress();
      }, 30000); // 30 seconds of inactivity
    }

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [totalMessages, topicId]);

  // Cleanup: recalculate progress when component unmounts (user leaves)
  useEffect(() => {
    return () => {
      if (totalMessages > 0) {
        recalculateProgress();
      }
    };
  }, [totalMessages, topicId]);

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
    recalculateProgress,
    stats: {
      questionsAnswered,
      correctAnswers,
      totalMessages,
    },
  };
};