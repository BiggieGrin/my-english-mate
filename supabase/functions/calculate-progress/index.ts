import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Missing sessionId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Calculating progress for session ${sessionId}`);

    // Fetch the current session
    const { data: session, error: sessionError } = await supabase
      .from('lesson_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      console.error('Error fetching session:', sessionError);
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate session progress based on actual work completed
    // Progress is a continuous value from 0-100 based on real metrics
    
    const questionsAnswered = session.questions_answered || 0;
    const correctAnswers = session.correct_answers || 0;
    const totalMessages = session.total_messages || 0;
    const mode = session.mode;

    let sessionProgress = 0;

    // Different progress calculation based on mode
    if (mode === 'exam_prep') {
      // Test mode: Progress based on questions answered
      // Assuming 15-20 questions for a full test
      const expectedQuestions = 15;
      const questionProgress = Math.min((questionsAnswered / expectedQuestions) * 100, 100);
      
      // Factor in accuracy for quality
      const accuracyMultiplier = questionsAnswered > 0 
        ? (correctAnswers / questionsAnswered) 
        : 0;
      
      sessionProgress = questionProgress * (0.7 + (accuracyMultiplier * 0.3));
      
    } else if (mode === 'homework') {
      // Homework mode: More sophisticated - based on understanding demonstrated
      // Progress increases with correct answers and decreases with hints
      const correctAfterHint = session.correct_after_hint || 0;
      const hintsUsed = session.hints_used || 0;
      
      // Base progress on interactions
      const interactionProgress = Math.min((totalMessages / 30) * 100, 100);
      
      // Quality factor based on correctness
      const qualityFactor = questionsAnswered > 0
        ? ((correctAnswers * 1.0 + correctAfterHint * 0.5) / questionsAnswered)
        : 0;
      
      // Penalty for excessive hints
      const hintPenalty = hintsUsed > 5 ? Math.min((hintsUsed - 5) * 2, 20) : 0;
      
      sessionProgress = Math.max(
        (interactionProgress * qualityFactor) - hintPenalty,
        0
      );
      
    } else if (mode === 'learn') {
      // Practice mode: Progress based on coverage and mastery
      const fluentAnswers = session.fluent_answers || 0;
      
      // Coverage progress (interactions)
      const coverageProgress = Math.min((totalMessages / 40) * 50, 50);
      
      // Mastery progress (quality of answers)
      const masteryProgress = questionsAnswered > 0
        ? ((correctAnswers / questionsAnswered) * 30)
        : 0;
      
      // Fluency bonus
      const fluencyBonus = questionsAnswered > 0
        ? ((fluentAnswers / questionsAnswered) * 20)
        : 0;
      
      sessionProgress = coverageProgress + masteryProgress + fluencyBonus;
    }

    // Ensure progress is between 0 and 100
    sessionProgress = Math.max(0, Math.min(sessionProgress, 100));

    // Round to 2 decimal places for precision
    sessionProgress = parseFloat(sessionProgress.toFixed(2));

    // Update session with calculated progress
    const { error: updateError } = await supabase
      .from('lesson_sessions')
      .update({
        session_progress: sessionProgress,
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update progress' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Session progress calculated: ${sessionProgress}% (Mode: ${mode}, Questions: ${questionsAnswered}, Correct: ${correctAnswers})`);

    return new Response(JSON.stringify({
      success: true,
      sessionProgress,
      sessionStats: {
        questionsAnswered,
        correctAnswers,
        totalMessages,
        mode,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in calculate-progress:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});