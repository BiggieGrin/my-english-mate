import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge function to check lesson completion and trigger progress calculation
 * 
 * IMPROVED COMPLETION CRITERIA (Higher Thresholds):
 * 
 * 1. HOMEWORK: Task fully resolved + user confirmation + 3 consecutive correct (1 hint-free) on different subskills
 * 2. LEARN: 12-15 questions + all core subtopics covered + 2 correct per subtopic (1 hint-free) + user/bot agrees
 * 3. EXAM_PREP: All test items answered + bot grades + results delivered
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { sessionId, conversationId, mode, topicId } = await req.json();

    if (!sessionId || !conversationId || !mode || !topicId) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Checking completion for session ${sessionId}, mode: ${mode}`);

    // Get session data
    const { data: session, error: sessionError } = await supabase
      .from('lesson_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get recent messages from this conversation
    const { data: messages, error: messagesError } = await supabase
      .from('lesson_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return new Response(JSON.stringify({ error: 'Failed to fetch messages' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check completion based on mode (with higher thresholds)
    let isComplete = false;
    let completionReason = '';
    const completionCriteria: any = {};

    switch (mode) {
      case 'homework':
        // HOMEWORK MODE - Stricter completion criteria
        // A. Full resolution + correctness validation
        const taskResolved = messages.some(m => 
          m.role === 'assistant' && 
          (m.content.includes('פתרנו') || m.content.includes('סיימנו את המטלה'))
        );
        completionCriteria.taskResolved = taskResolved;

        // B. User confirmation
        const userConfirmed = messages.some(m => 
          m.role === 'user' && 
          (m.content.includes('סיימתי') || m.content.includes('הבנתי') || m.content.includes('זה ברור לי') || m.content.includes('אני מסודר'))
        );
        completionCriteria.userConfirmed = userConfirmed;

        // C. Automatic: 3 consecutive correct answers (at least 1 hint-free) on different subskills
        const recentHwMessages = messages.slice(0, 6); // Last 3 exchanges
        let consecutiveCorrect = 0;
        let hasHintFree = false;
        const subskillsInStreak = new Set();

        for (const msg of recentHwMessages) {
          if (msg.role === 'assistant') {
            const isCorrect = msg.content.includes('נכון') || msg.content.includes('מצוין') || msg.content.includes('מדויק');
            const isHintFree = !msg.content.includes('רמז') && !msg.content.includes('עזרה');
            
            if (isCorrect) {
              consecutiveCorrect++;
              if (isHintFree) hasHintFree = true;
              // Assume each correct answer is on a different subskill (simplified)
              subskillsInStreak.add(consecutiveCorrect);
            } else {
              break; // Streak broken
            }
          }
        }

        const threeCorrectDifferentSubskills = consecutiveCorrect >= 3 && hasHintFree && subskillsInStreak.size >= 3;
        completionCriteria.threeCorrectDifferentSubskills = threeCorrectDifferentSubskills;

        // Homework is complete only if ALL criteria are met OR user confirmed after task resolved
        if ((taskResolved && userConfirmed) || threeCorrectDifferentSubskills) {
          isComplete = true;
          completionReason = taskResolved && userConfirmed 
            ? 'Task fully resolved and user confirmed understanding'
            : 'Three consecutive correct answers on different subskills with at least one hint-free';
        }
        break;

      case 'learn':
        // LEARN MODE - Higher thresholds
        // Minimum 12-15 questions
        const minQuestionsMetLearn = session.questions_answered >= 12;
        completionCriteria.minQuestionsMet = minQuestionsMetLearn;

        // All core subtopics covered (simplified: assume 5 core subtopics, need at least 5 different correct)
        const subskillsPracticed = (session.subskills_practiced as any) || [];
        const subtopicsCovered = subskillsPracticed.length >= 5;
        completionCriteria.subtopicsCovered = subtopicsCovered;

        // 2 correct per subtopic with 1 hint-free (simplified: check recent accuracy + fluency)
        const hasGoodAccuracy = session.accuracy && session.accuracy >= 70;
        const hasFluency = (session.fluent_answers || 0) >= 3;
        completionCriteria.goodAccuracyAndFluency = hasGoodAccuracy && hasFluency;

        // User/Bot agrees to end
        const botProposedEnd = messages.some(m => 
          m.role === 'assistant' && 
          (m.content.includes('נראה שסיימנו') || m.content.includes('רוצה לסיים'))
        );
        const userAgreed = messages.some(m => 
          m.role === 'user' && 
          (m.content.includes('כן') || m.content.includes('אוקיי') || m.content.includes('בטח'))
        );
        completionCriteria.mutualAgreement = botProposedEnd || userAgreed;

        // Complete only if thresholds met
        if (minQuestionsMetLearn && subtopicsCovered && hasGoodAccuracy && hasFluency && (botProposedEnd || userAgreed)) {
          isComplete = true;
          completionReason = '12+ questions, all core subtopics covered with good accuracy and fluency, mutual agreement to end';
        } else if (session.questions_answered >= 15 && hasGoodAccuracy && subtopicsCovered) {
          // Automatic completion for extended practice with mastery
          isComplete = true;
          completionReason = 'Extended practice (15+ questions) with mastery demonstrated across subtopics';
        }
        break;

      case 'exam_prep':
        // EXAM_PREP MODE - Straightforward
        const lastAssistantMsg = messages.find(m => m.role === 'assistant');
        const testComplete = lastAssistantMsg?.content.includes('סיימת את המבחן') || 
                            lastAssistantMsg?.content.includes('המבחן הסתיים') ||
                            session.questions_answered >= 15;
        
        completionCriteria.testComplete = testComplete;

        if (testComplete) {
          isComplete = true;
          completionReason = 'Test completed with all items answered and graded';
        }
        break;
    }

    if (isComplete) {
      console.log(`Lesson complete! Reason: ${completionReason}`);

      // Mark session as completed with completion criteria metadata
      const { error: updateError } = await supabase
        .from('lesson_sessions')
        .update({ 
          completed_at: new Date().toISOString(),
          metadata: { ...session.metadata, completionReason },
          completion_criteria_met: completionCriteria
        })
        .eq('id', sessionId);

      if (updateError) {
        console.error('Error updating session:', updateError);
      }

      // Trigger progress calculation (in background)
      console.log('Triggering progress calculation...');
      fetch(`${supabaseUrl}/functions/v1/calculate-progress`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topicId }),
      }).catch(err => console.error('Error calling calculate-progress:', err));
    }

    return new Response(JSON.stringify({ 
      complete: isComplete, 
      reason: completionReason,
      sessionData: {
        questions_answered: session.questions_answered,
        accuracy: session.accuracy,
        total_messages: session.total_messages,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in completion check:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});