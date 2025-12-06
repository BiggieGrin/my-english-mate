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

    console.log(`PROCESS_SESSION_END: user=${user.id}, topic=${topicId}, conversation=${conversationId || 'N/A'}`);

    // Mastery Goal: 100 correct answers = 100% progress
    const Q_GOAL = 100;

    // 3.1 Data Retrieval - Fetch topic name
    const { data: topicData } = await supabase
      .from('curriculum_topics')
      .select('title')
      .eq('id', topicId)
      .single();
    
    const topicName = topicData?.title || 'Unknown Topic';

    // 3.1 Data Retrieval - Fetch current session data
    let sessionData = null;
    if (conversationId) {
      const { data: session } = await supabase
        .from('lesson_sessions')
        .select('questions_answered, correct_answers, hints_used')
        .eq('user_id', user.id)
        .eq('topic_id', topicId)
        .eq('conversation_id', conversationId)
        .maybeSingle();
      sessionData = session;
    }

    if (!sessionData) {
      const { data: sessions } = await supabase
        .from('lesson_sessions')
        .select('questions_answered, correct_answers, hints_used')
        .eq('user_id', user.id)
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false })
        .limit(1);
      sessionData = sessions?.[0] || null;
    }

    // 3.1 Data Retrieval - Fetch existing progress data
    const { data: existingTopic } = await supabase
      .from('user_topics')
      .select('overall_progress, total_questions_answered, correct_answers')
      .eq('user_id', user.id)
      .eq('topic_id', topicId)
      .maybeSingle();

    const P_OLD = existingTopic?.overall_progress || 0;
    const UQ_TOTAL_OLD = existingTopic?.total_questions_answered || 0;
    const UQ_CORRECT_OLD = existingTopic?.correct_answers || 0;

    // 3.2 Check for Session Contribution
    const Q_TOTAL = sessionData?.questions_answered || 0;
    const Q_CORRECT = sessionData?.correct_answers || 0;

    if (Q_TOTAL === 0) {
      console.log('No questions answered in session, updating timestamps only');
      
      // Update timestamps only
      await supabase
        .from('user_topics')
        .upsert({
          user_id: user.id,
          topic_id: topicId,
          overall_progress: P_OLD,
          total_questions_answered: UQ_TOTAL_OLD,
          correct_answers: UQ_CORRECT_OLD,
          last_session_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,topic_id'
        });

      return new Response(JSON.stringify({
        status: 'success',
        topic_id: topicId,
        new_progress_percentage: P_OLD,
        progress_display_hebrew: `${topicName} - ${P_OLD}%`,
        message_hebrew: 'לא נענו שאלות בשיעור זה'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3.3 Calculate New Additive Progress
    const UQ_CORRECT_NEW = UQ_CORRECT_OLD + Q_CORRECT;
    const UQ_TOTAL_NEW = UQ_TOTAL_OLD + Q_TOTAL;
    const P_NEW = Math.min(1.0, UQ_CORRECT_NEW / Q_GOAL);
    const P_FINAL = Math.round(P_NEW * 100);

    console.log(`Progress calculation: ${UQ_CORRECT_OLD} + ${Q_CORRECT} = ${UQ_CORRECT_NEW} correct answers`);
    console.log(`Progress: ${P_FINAL}% (${UQ_CORRECT_NEW}/${Q_GOAL} correct answers)`);

    // 3.4 Database Update
    const { error: updateError } = await supabase
      .from('user_topics')
      .upsert({
        user_id: user.id,
        topic_id: topicId,
        overall_progress: P_FINAL,
        total_questions_answered: UQ_TOTAL_NEW,
        correct_answers: UQ_CORRECT_NEW,
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

    // 3.5 Final Output
    return new Response(JSON.stringify({
      status: 'success',
      topic_id: topicId,
      new_progress_percentage: P_FINAL,
      progress_display_hebrew: `${topicName} - ${P_FINAL}%`,
      message_hebrew: 'התקדמות עודכנה בהצלחה!'
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
