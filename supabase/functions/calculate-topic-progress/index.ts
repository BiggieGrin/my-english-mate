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

    // Get current topic progress for consistency bonus
    const { data: currentTopic } = await supabase
      .from('user_topics')
      .select('overall_progress')
      .eq('user_id', user.id)
      .eq('topic_id', topicId)
      .maybeSingle();

    const previousProgress = currentTopic?.overall_progress || 0;

    // Fetch all sessions for this topic (completed and in-progress)
    const { data: sessions, error: sessionsError } = await supabase
      .from('lesson_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('topic_id', topicId)
      .order('created_at', { ascending: false });

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch sessions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no sessions, progress is 0
    if (!sessions || sessions.length === 0) {
      const { error: updateError } = await supabase
        .from('user_topics')
        .upsert({
          user_id: user.id,
          topic_id: topicId,
          overall_progress: 0,
          total_questions_answered: 0,
          correct_answers: 0,
        }, {
          onConflict: 'user_id,topic_id'
        });

      if (updateError) {
        console.error('Error updating user_topics:', updateError);
      }

      return new Response(JSON.stringify({
        topicId,
        topicProgress: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Aggregate metrics across all sessions
    const totalQuestions = sessions.reduce((sum, s) => sum + (s.questions_answered || 0), 0);
    const totalCorrect = sessions.reduce((sum, s) => sum + (s.correct_answers || 0), 0);
    const totalFluent = sessions.reduce((sum, s) => sum + (s.fluent_answers || 0), 0);
    const totalMessages = sessions.reduce((sum, s) => sum + (s.total_messages || 0), 0);
    const totalHints = sessions.reduce((sum, s) => sum + (s.hints_used || 0), 0);

    // Calculate topic progress using the EXACT required formula
    let topicProgress = 0;

    if (totalQuestions > 0) {
      // Mastery quality (40%)
      const mastery = (totalCorrect / totalQuestions) * 40;

      // Fluency (20%)
      const fluency = (totalFluent / totalQuestions) * 20;

      // Coverage / effort (25%)
      const coverage = Math.min(totalMessages / 40, 1) * 25;

      // Consistency bonus (15%)
      const consistencyBonus = previousProgress * 0.15;

      // Penalties: hints over 5 reduce progress
      const penalty = totalHints > 5 ? (totalHints - 5) * 1.5 : 0;

      // Final calculation
      topicProgress = mastery + fluency + coverage + consistencyBonus - penalty;
      
      // Clamp to 0-100
      topicProgress = Math.max(0, Math.min(100, topicProgress));
    }

    // Update user_topics with calculated progress
    const { error: updateError } = await supabase
      .from('user_topics')
      .upsert({
        user_id: user.id,
        topic_id: topicId,
        overall_progress: topicProgress,
        total_questions_answered: totalQuestions,
        correct_answers: totalCorrect,
        last_accessed_at: new Date().toISOString(),
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

    console.log(`Topic progress calculated: ${topicProgress.toFixed(2)}% (Questions: ${totalQuestions}, Correct: ${totalCorrect}, Fluent: ${totalFluent}, Messages: ${totalMessages}, Hints: ${totalHints})`);

    return new Response(JSON.stringify({
      topicId,
      topicProgress: parseFloat(topicProgress.toFixed(2)),
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
