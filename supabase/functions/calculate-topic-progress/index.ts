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

    const { topicId, conversationId } = await req.json();

    if (!topicId) {
      return new Response(JSON.stringify({ error: 'Missing topicId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Calculating topic progress for user ${user.id}, topic ${topicId}, conversation ${conversationId || 'N/A'}`);

    // Fetch the topic name
    const { data: topicData } = await supabase
      .from('curriculum_topics')
      .select('title')
      .eq('id', topicId)
      .single();
    
    const topicName = topicData?.title || 'Unknown Topic';

    // Fetch existing user_topics record
    const { data: existingTopic } = await supabase
      .from('user_topics')
      .select('overall_progress')
      .eq('user_id', user.id)
      .eq('topic_id', topicId)
      .maybeSingle();

    // Fetch the latest session for this topic
    let latestSession = null;
    if (conversationId) {
      const { data: session } = await supabase
        .from('lesson_sessions')
        .select('questions_answered, correct_answers, hints_used, fluent_answers, correct_after_hint, difficulty_level, subskills_practiced')
        .eq('user_id', user.id)
        .eq('topic_id', topicId)
        .eq('conversation_id', conversationId)
        .maybeSingle();
      latestSession = session;
    }

    if (!latestSession) {
      const { data: sessions } = await supabase
        .from('lesson_sessions')
        .select('questions_answered, correct_answers, hints_used, fluent_answers, correct_after_hint, difficulty_level, subskills_practiced')
        .eq('user_id', user.id)
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false })
        .limit(1);
      latestSession = sessions?.[0] || null;
    }

    if (!latestSession) {
      console.log('No session found, returning 0 progress');
      return new Response(JSON.stringify({
        topic: topicName,
        session_progress: 0,
        previous_total_progress: existingTopic?.overall_progress || 0,
        new_total_progress: existingTopic?.overall_progress || 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== CALCULATE SESSION PROGRESS =====
    const questionsAnswered = latestSession.questions_answered || 0;
    const correctAnswers = latestSession.correct_answers || 0;
    const hintsUsed = latestSession.hints_used || 0;
    const fluentAnswers = latestSession.fluent_answers || 0;
    const correctAfterHint = latestSession.correct_after_hint || 0;
    const subskillsPracticed = Array.isArray(latestSession.subskills_practiced) 
      ? latestSession.subskills_practiced 
      : [];
    const difficultyLevel = latestSession.difficulty_level || 'medium';

    // Accuracy (0-1)
    const accuracy = questionsAnswered > 0 ? correctAnswers / questionsAnswered : 0;

    // Hint penalty (max 0.25)
    const hintPenalty = Math.min(0.25, hintsUsed * 0.05);

    // Fluency bonus (max 0.15)
    const fluencyBonus = Math.min(0.15, fluentAnswers * 0.03);

    // Correct after hint factor
    const correctAfterHintFactor = correctAfterHint * 0.02;

    // Coverage (max 1.0)
    const coverage = Math.min(1.0, subskillsPracticed.length * 0.1);

    // Difficulty weight
    const difficultyWeights: Record<string, number> = { easy: 0.9, medium: 1.0, hard: 1.1 };
    const difficultyWeight = difficultyWeights[difficultyLevel] || 1.0;

    // Session score (0-1)
    let sessionScore = (accuracy - hintPenalty + fluencyBonus + correctAfterHintFactor + coverage) * difficultyWeight;
    sessionScore = Math.max(0, Math.min(1, sessionScore));

    // Convert to percentage (0-100)
    const sessionProgress = Math.round(sessionScore * 100);

    console.log(`Session Progress: ${sessionProgress}% (accuracy: ${accuracy.toFixed(2)}, hints: -${hintPenalty.toFixed(2)}, fluency: +${fluencyBonus.toFixed(2)})`);

    // ===== ADDITIVE PROGRESS UPDATE =====
    const previousTotalProgress = existingTopic?.overall_progress || 0;
    const newTotalProgress = Math.min(100, previousTotalProgress + sessionProgress);

    console.log(`Progress Update: ${previousTotalProgress}% + ${sessionProgress}% = ${newTotalProgress}%`);

    // Update database
    const { error: updateError } = await supabase
      .from('user_topics')
      .upsert({
        user_id: user.id,
        topic_id: topicId,
        overall_progress: newTotalProgress,
        last_accessed_at: new Date().toISOString(),
        last_session_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,topic_id'
      });

    if (updateError) {
      console.error('Error updating user_topics:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update progress' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return structured JSON response
    return new Response(JSON.stringify({
      topic: topicName,
      session_progress: sessionProgress,
      previous_total_progress: previousTotalProgress,
      new_total_progress: newTotalProgress,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in calculate-topic-progress:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
