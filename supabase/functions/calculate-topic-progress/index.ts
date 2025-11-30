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

    console.log(`Calculating topic progress for user ${user.id}, topic ${topicId}`);

    // Fetch all completed sessions for this topic
    const { data: completedSessions, error: sessionsError } = await supabase
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

    // If no completed sessions, topic progress is 0
    if (!completedSessions || completedSessions.length === 0) {
      const { error: updateError } = await supabase
        .from('user_topics')
        .upsert({
          user_id: user.id,
          topic_id: topicId,
          overall_progress: 0,
          total_questions_answered: 0,
          correct_answers: 0,
        });

      if (updateError) {
        console.error('Error updating user_topics:', updateError);
      }

      return new Response(JSON.stringify({
        success: true,
        topicProgress: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate topic-level progress based on all completed sessions
    const totalSessions = completedSessions.length;
    const totalQuestions = completedSessions.reduce((sum, s) => sum + (s.questions_answered || 0), 0);
    const totalCorrect = completedSessions.reduce((sum, s) => sum + (s.correct_answers || 0), 0);
    
    // Average session completion rate (how well sessions were completed)
    const avgSessionProgress = completedSessions.reduce((sum, s) => sum + (s.session_progress || 0), 0) / totalSessions;
    
    // Overall accuracy across all sessions
    const overallAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
    
    // Topic mastery formula:
    // - Session completion quality: 50% weight
    // - Overall accuracy: 30% weight  
    // - Session count bonus: 20% weight (more sessions = better mastery, capped at 10 sessions)
    const sessionCountBonus = Math.min(totalSessions / 10, 1.0) * 20;
    
    const topicProgress = (
      (avgSessionProgress * 0.50) +
      (overallAccuracy * 0.30) +
      sessionCountBonus
    );

    // Round to 1 decimal place for clean display
    const finalProgress = parseFloat(Math.min(topicProgress, 100).toFixed(1));

    // Update user_topics with calculated progress
    const { error: updateError } = await supabase
      .from('user_topics')
      .upsert({
        user_id: user.id,
        topic_id: topicId,
        overall_progress: finalProgress,
        total_questions_answered: totalQuestions,
        correct_answers: totalCorrect,
        last_accessed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (updateError) {
      console.error('Error updating user_topics:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update progress' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Topic progress calculated: ${finalProgress}% (Sessions: ${totalSessions}, Questions: ${totalQuestions}, Correct: ${totalCorrect})`);

    return new Response(JSON.stringify({
      success: true,
      topicProgress: finalProgress,
      stats: {
        totalSessions,
        totalQuestions,
        totalCorrect,
        overallAccuracy: parseFloat(overallAccuracy.toFixed(1)),
      },
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
