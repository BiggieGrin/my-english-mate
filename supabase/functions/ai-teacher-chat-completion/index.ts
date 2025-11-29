import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge function to check lesson completion and trigger progress calculation
 * 
 * Completion criteria per mode:
 * 
 * 1. EXAM_PREP: Completed when all test questions answered and feedback provided
 * 2. LEARN: Completed when minimum 12 questions, 6 correct in row, OR subtopics covered
 * 3. HOMEWORK: Completed when task resolved, user confirms, or stable accuracy
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

    // Check completion based on mode
    let isComplete = false;
    let completionReason = '';

    switch (mode) {
      case 'exam_prep':
        // Test complete if bot says completion phrases
        const lastAssistantMsg = messages.find(m => m.role === 'assistant');
        if (lastAssistantMsg?.content.includes('סיימת את המבחן') || 
            lastAssistantMsg?.content.includes('המבחן הסתיים') ||
            session.questions_answered >= 15) {
          isComplete = true;
          completionReason = 'Test completed with feedback';
        }
        break;

      case 'learn':
        // Learn complete based on interaction count and accuracy
        const totalInteractions = session.total_messages / 2; // Divide by 2 for exchanges
        
        // Check for 6 correct in a row from recent messages
        let consecutiveCorrect = 0;
        const recentMessages = messages.slice(0, 12); // Last 6 exchanges
        for (const msg of recentMessages) {
          if (msg.role === 'assistant' && 
              (msg.content.includes('נכון') || msg.content.includes('מצוין') || msg.content.includes('מדויק'))) {
            consecutiveCorrect++;
            if (consecutiveCorrect >= 6) {
              isComplete = true;
              completionReason = '6 correct answers in a row';
              break;
            }
          } else if (msg.role === 'assistant') {
            consecutiveCorrect = 0;
          }
        }

        // Or minimum threshold met
        if (!isComplete && session.questions_answered >= 12 && session.accuracy && session.accuracy >= 60) {
          isComplete = true;
          completionReason = 'Minimum 12 questions with 60%+ accuracy';
        }

        // Or natural completion detected
        if (!isComplete && 
            messages.some(m => m.role === 'assistant' && 
            (m.content.includes('נראה שסיימנו') || m.content.includes('רוצה לסיים')))) {
          isComplete = true;
          completionReason = 'Natural completion proposed by tutor';
        }

        // Automatic completion for fatigue
        if (!isComplete && totalInteractions >= 15 && session.accuracy && session.accuracy >= 50) {
          isComplete = true;
          completionReason = 'Automatic completion due to sufficient practice';
        }
        break;

      case 'homework':
        // Homework complete if task resolved
        const homeworkComplete = messages.some(m => 
          m.role === 'user' && 
          (m.content.includes('סיימתי') || m.content.includes('הבנתי') || m.content.includes('אני מסודר'))
        );

        if (homeworkComplete) {
          isComplete = true;
          completionReason = 'User confirmed task completion';
        }

        // Or tutor detected completion
        if (!isComplete && messages.some(m => 
          m.role === 'assistant' && 
          (m.content.includes('פתרנו') || m.content.includes('סיימנו'))
        )) {
          isComplete = true;
          completionReason = 'Task fully resolved';
        }

        // Or stable accuracy (2 correct without hints)
        const recentHwMessages = messages.slice(0, 4);
        let recentCorrect = 0;
        for (const msg of recentHwMessages) {
          if (msg.role === 'assistant' && 
              (msg.content.includes('נכון') || msg.content.includes('מצוין')) &&
              !msg.content.includes('רמז')) {
            recentCorrect++;
          }
        }
        if (!isComplete && recentCorrect >= 2) {
          isComplete = true;
          completionReason = 'Stable accuracy without hints';
        }
        break;
    }

    if (isComplete) {
      console.log(`Lesson complete! Reason: ${completionReason}`);

      // Mark session as completed
      const { error: updateError } = await supabase
        .from('lesson_sessions')
        .update({ 
          completed_at: new Date().toISOString(),
          metadata: { ...session.metadata, completionReason }
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