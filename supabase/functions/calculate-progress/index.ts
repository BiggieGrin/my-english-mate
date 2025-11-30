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

    const { topicId } = await req.json();

    if (!topicId) {
      return new Response(JSON.stringify({ error: 'Missing topicId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Calculating progress for user ${user.id}, topic ${topicId}`);

    // Fetch all completed sessions for this topic
    const { data: sessions, error: sessionsError } = await supabase
      .from('lesson_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('topic_id', topicId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false });

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch sessions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user_topics record
    const { data: userTopic, error: userTopicError } = await supabase
      .from('user_topics')
      .select('*')
      .eq('user_id', user.id)
      .eq('topic_id', topicId)
      .single();

    if (userTopicError) {
      console.error('Error fetching user_topic:', userTopicError);
      return new Response(JSON.stringify({ error: 'Failed to fetch user topic' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ====================
    // 1. COVERAGE SCORE (40%)
    // ====================
    // A subskill is "mastered" when the user got 2 consecutive correct answers for that subskill,
    // AND one of them was without hints.
    
    const subskillsMastered = userTopic.subskills_mastered || [];
    const totalSubskills = 10; // In production, fetch from curriculum definition
    const coverageScore = Math.min(subskillsMastered.length / totalSubskills, 1.0);

    console.log(`Coverage: ${subskillsMastered.length}/${totalSubskills} subskills mastered = ${(coverageScore * 100).toFixed(2)}%`);

    // ====================
    // 2. ACCURACY SCORE (30%)
    // ====================
    // Rolling accuracy over last 20 relevant answers
    // Formula: (Correct*1.0 + CorrectAfterHint*0.5) / TotalItems
    
    const accuracyLog = (userTopic.accuracy_log || []).slice(0, 20); // Last 20 items
    let correctCount = 0;
    let correctAfterHintCount = 0;
    
    for (const item of accuracyLog) {
      if (item.correct && !item.hinted) {
        correctCount++;
      } else if (item.correct && item.hinted) {
        correctAfterHintCount++;
      }
    }
    
    const accuracyScore = accuracyLog.length > 0
      ? (correctCount * 1.0 + correctAfterHintCount * 0.5) / accuracyLog.length
      : 0;

    console.log(`Accuracy: ${correctCount} correct + ${correctAfterHintCount} hinted / ${accuracyLog.length} total = ${(accuracyScore * 100).toFixed(2)}%`);

    // ====================
    // 3. FLUENCY SCORE (20%)
    // ====================
    // Measures naturalness: answers correctly without hints, within reasonable time, using complete sentences
    // Formula: (#FluentAnswers / #FluencyOpportunities)
    
    const fluentAnswers = sessions.reduce((sum, s) => sum + (s.fluent_answers || 0), 0);
    const totalOpportunities = sessions.reduce((sum, s) => sum + (s.questions_answered || 0), 0);
    
    const fluencyScore = totalOpportunities > 0
      ? fluentAnswers / totalOpportunities
      : 0;

    console.log(`Fluency: ${fluentAnswers} fluent / ${totalOpportunities} opportunities = ${(fluencyScore * 100).toFixed(2)}%`);

    // ====================
    // 4. RETENTION SCORE (10%)
    // ====================
    // Measures if the user remembers content after time gaps
    // Formula: 1 - (DecayFactor) where DecayFactor is based on time since last session
    
    const lastSessionAt = userTopic.last_session_at;
    let retentionScore = 1.0;
    
    if (lastSessionAt) {
      const daysSinceLastSession = (Date.now() - new Date(lastSessionAt).getTime()) / (1000 * 60 * 60 * 24);
      // Decay factor: 0.05 per day (5% decay per day), max 0.5 decay (so minimum 50% retention)
      const decayFactor = Math.min(daysSinceLastSession * 0.05, 0.5);
      retentionScore = Math.max(1.0 - decayFactor, 0.5);
    }

    console.log(`Retention: Days since last session = ${lastSessionAt ? ((Date.now() - new Date(lastSessionAt).getTime()) / (1000 * 60 * 60 * 24)).toFixed(1) : 'N/A'}, Score = ${(retentionScore * 100).toFixed(2)}%`);

    // ====================
    // FINAL PROGRESS CALCULATION (Continuous, not rounded)
    // ====================
    const overallProgress = (
      coverageScore * 0.40 +
      accuracyScore * 0.30 +
      fluencyScore * 0.20 +
      retentionScore * 0.10
    ) * 100;

    // Calculate total stats
    const totalQuestions = sessions.reduce((sum, s) => sum + (s.questions_answered || 0), 0);
    const totalCorrect = sessions.reduce((sum, s) => sum + (s.correct_answers || 0), 0);

    // Update user_topics with new scores (continuous values, not rounded)
    const { error: updateError } = await supabase
      .from('user_topics')
      .update({
        coverage_score: coverageScore,
        accuracy_score: accuracyScore,
        fluency_score: fluencyScore,
        retention_score: retentionScore,
        overall_progress: Math.round(overallProgress), // Round only for display
        total_questions_answered: totalQuestions,
        correct_answers: totalCorrect,
        last_session_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('topic_id', topicId);

    if (updateError) {
      console.error('Error updating user_topics:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update progress' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Progress calculated: Overall=${overallProgress.toFixed(2)}%, Coverage=${(coverageScore * 100).toFixed(2)}%, Accuracy=${(accuracyScore * 100).toFixed(2)}%, Fluency=${(fluencyScore * 100).toFixed(2)}%, Retention=${(retentionScore * 100).toFixed(2)}%`);

    return new Response(JSON.stringify({
      success: true,
      progress: {
        overall: parseFloat(overallProgress.toFixed(2)),
        coverage: parseFloat((coverageScore * 100).toFixed(2)),
        accuracy: parseFloat((accuracyScore * 100).toFixed(2)),
        fluency: parseFloat((fluencyScore * 100).toFixed(2)),
        retention: parseFloat((retentionScore * 100).toFixed(2)),
        totalQuestions,
        totalCorrect,
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