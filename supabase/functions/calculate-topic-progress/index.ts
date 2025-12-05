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
      .select('*')
      .eq('user_id', user.id)
      .eq('topic_id', topicId)
      .maybeSingle();

    // Fetch the latest session for this topic (current session)
    let latestSession = null;
    if (conversationId) {
      const { data: session } = await supabase
        .from('lesson_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('topic_id', topicId)
        .eq('conversation_id', conversationId)
        .maybeSingle();
      latestSession = session;
    }

    // If no conversation provided, get the most recent session
    if (!latestSession) {
      const { data: sessions } = await supabase
        .from('lesson_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false })
        .limit(1);
      latestSession = sessions?.[0] || null;
    }

    // If no session found, return early with 0 progress
    if (!latestSession) {
      console.log('No session found, returning 0 progress');
      return new Response(JSON.stringify({
        topic_id: topicId,
        topic_name: topicName,
        overall_progress: 0,
        status: 'no_session',
        message: 'No session data found for this topic.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== 1. COMPUTE SESSION-LEVEL SCORES =====
    const sessionQuestionsAnswered = latestSession.questions_answered || 0;
    const sessionCorrectAnswers = latestSession.correct_answers || 0;
    const sessionHintsUsed = latestSession.hints_used || 0;
    const sessionFluentAnswers = latestSession.fluent_answers || 0;
    const sessionCorrectAfterHint = latestSession.correct_after_hint || 0;
    const sessionSubskillsPracticed = Array.isArray(latestSession.subskills_practiced) 
      ? latestSession.subskills_practiced 
      : [];
    const difficultyLevel = latestSession.difficulty_level || 'medium';

    // Accuracy Score (0-1)
    const accuracyScoreSession = sessionQuestionsAnswered > 0 
      ? sessionCorrectAnswers / sessionQuestionsAnswered 
      : 0;

    // Hint Penalty (max 0.25)
    const hintPenalty = Math.min(0.25, sessionHintsUsed * 0.05);

    // Fluency Bonus (max 0.15)
    const fluencyBonus = Math.min(0.15, sessionFluentAnswers * 0.03);

    // Correct After Hint Factor
    const correctAfterHintFactor = sessionCorrectAfterHint * 0.02;

    // Coverage Score (subskills practiced, max 1.0)
    const coverageScoreSession = Math.min(1.0, sessionSubskillsPracticed.length * 0.1);

    // Difficulty Weight
    const difficultyWeights: Record<string, number> = {
      'easy': 0.9,
      'medium': 1.0,
      'hard': 1.1,
    };
    const difficultyWeight = difficultyWeights[difficultyLevel] || 1.0;

    // Final Session Score (0-1)
    let sessionScore = (
      accuracyScoreSession 
      - hintPenalty 
      + fluencyBonus 
      + correctAfterHintFactor 
      + coverageScoreSession
    ) * difficultyWeight;
    
    // Clamp to 0-1
    sessionScore = Math.max(0, Math.min(1, sessionScore));

    console.log(`Session Score Breakdown:
      - Accuracy: ${accuracyScoreSession.toFixed(3)}
      - Hint Penalty: -${hintPenalty.toFixed(3)}
      - Fluency Bonus: +${fluencyBonus.toFixed(3)}
      - Correct After Hint: +${correctAfterHintFactor.toFixed(3)}
      - Coverage: +${coverageScoreSession.toFixed(3)}
      - Difficulty Weight: x${difficultyWeight}
      - Final Session Score: ${sessionScore.toFixed(3)}`);

    // ===== 2. INTEGRATE SESSION SCORE WITH TOPIC HISTORY =====
    const oldTotalQuestions = existingTopic?.total_questions_answered || 0;
    const oldCorrectAnswers = existingTopic?.correct_answers || 0;
    const oldSubskillsMastered = Array.isArray(existingTopic?.subskills_mastered) 
      ? existingTopic.subskills_mastered 
      : [];
    const oldFluencyScore = existingTopic?.fluency_score || 0;
    const oldRetentionScore = existingTopic?.retention_score || 1.0;

    // Update totals
    const newTotalQuestions = oldTotalQuestions + sessionQuestionsAnswered;
    const newCorrectAnswers = oldCorrectAnswers + sessionCorrectAnswers;

    // New accuracy (overall)
    const newAccuracy = newTotalQuestions > 0 
      ? newCorrectAnswers / newTotalQuestions 
      : 0;

    // Merge & deduplicate subskills
    const combinedSubskills = [...new Set([...oldSubskillsMastered, ...sessionSubskillsPracticed])];
    const coverageScore = Math.min(1.0, combinedSubskills.length * 0.08);

    // New fluency score (additive with session fluency events)
    const newFluencyScore = Math.min(1.0, oldFluencyScore + (sessionFluentAnswers * 0.02));

    // Retention score stays unchanged (future: decay over time)
    const retentionScore = oldRetentionScore;

    // ===== 3. COMPUTE UPDATED OVERALL PROGRESS (0-100%) =====
    // Formula: accuracy (55%) + coverage (20%) + fluency (15%) + retention (10%)
    const overallProgressRaw = (
      newAccuracy * 0.55 +
      coverageScore * 0.20 +
      newFluencyScore * 0.15 +
      retentionScore * 0.10
    );

    // Clamp to 0-1 and convert to percentage
    const overallProgress = Math.max(0, Math.min(100, overallProgressRaw * 100));

    console.log(`Overall Progress Calculation:
      - New Accuracy: ${newAccuracy.toFixed(3)} (weight 55%) = ${(newAccuracy * 0.55 * 100).toFixed(2)}%
      - Coverage: ${coverageScore.toFixed(3)} (weight 20%) = ${(coverageScore * 0.20 * 100).toFixed(2)}%
      - Fluency: ${newFluencyScore.toFixed(3)} (weight 15%) = ${(newFluencyScore * 0.15 * 100).toFixed(2)}%
      - Retention: ${retentionScore.toFixed(3)} (weight 10%) = ${(retentionScore * 0.10 * 100).toFixed(2)}%
      - Overall Progress: ${overallProgress.toFixed(2)}%`);

    // ===== 4. UPDATE USER_TOPICS TABLE =====
    const { error: updateError } = await supabase
      .from('user_topics')
      .upsert({
        user_id: user.id,
        topic_id: topicId,
        overall_progress: Math.round(overallProgress * 100) / 100, // Round to 2 decimal places
        total_questions_answered: newTotalQuestions,
        correct_answers: newCorrectAnswers,
        accuracy_score: newAccuracy,
        fluency_score: newFluencyScore,
        retention_score: retentionScore,
        coverage_score: coverageScore,
        subskills_mastered: combinedSubskills,
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

    console.log(`Topic progress updated successfully: ${overallProgress.toFixed(2)}%`);

    // ===== 5. RETURN OUTPUT FORMAT =====
    return new Response(JSON.stringify({
      topic_id: topicId,
      topic_name: topicName,
      overall_progress: Math.round(overallProgress),
      status: 'updated',
      message: 'Progress recalculated based on the latest session.',
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
