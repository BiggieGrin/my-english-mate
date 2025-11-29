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

    // Separate sessions by mode
    const learnSessions = sessions.filter(s => s.mode === 'learn');
    const homeworkSessions = sessions.filter(s => s.mode === 'homework');
    const examSessions = sessions.filter(s => s.mode === 'exam_prep');

    // ====================
    // 1. CONCEPT MASTERY (35%)
    // ====================
    let conceptScore = 0;
    if (learnSessions.length > 0) {
      // Calculate subtopic coverage (mock: assume 10 subtopics, each session covers 1-2)
      const subtopicsCovered = userTopic.subtopics_covered || [];
      const totalSubtopics = 10; // In production, fetch from curriculum
      const subtopicCoverage = Math.min(subtopicsCovered.length / totalSubtopics, 1);

      // Calculate concept accuracy from recent learn sessions
      const recentLearn = learnSessions.slice(0, 5);
      const conceptAccuracy = recentLearn.reduce((sum, s) => sum + (s.accuracy || 0), 0) / recentLearn.length / 100;

      // Formula: ConceptScore = 0.7 * (%SubtopicsCovered) + 0.3 * (ConceptAccuracy)
      conceptScore = Math.round((0.7 * subtopicCoverage + 0.3 * conceptAccuracy) * 100);
    }

    // ====================
    // 2. PRACTICE MASTERY (40%)
    // ====================
    let practiceScore = 0;
    if (homeworkSessions.length > 0) {
      // Recent accuracy (last 5 sessions)
      const recentHomework = homeworkSessions.slice(0, 5);
      const recentAccuracy = recentHomework.reduce((sum, s) => sum + (s.accuracy || 0), 0) / recentHomework.length / 100;

      // Error reduction over time (compare first 3 vs last 3)
      let errorReduction = 0;
      if (homeworkSessions.length >= 6) {
        const firstThree = homeworkSessions.slice(-3).reduce((sum, s) => sum + (s.accuracy || 0), 0) / 3;
        const lastThree = homeworkSessions.slice(0, 3).reduce((sum, s) => sum + (s.accuracy || 0), 0) / 3;
        errorReduction = Math.max((lastThree - firstThree) / 100, 0);
      }

      // Self-correction ability (mock: based on metadata)
      const selfCorrection = homeworkSessions.slice(0, 3).reduce((sum, s) => {
        return sum + ((s.metadata as any)?.selfCorrections || 0);
      }, 0) / Math.min(homeworkSessions.length, 3) / 5; // Assume max 5 corrections per session

      // Formula: PracticeScore = 0.6 * (RecentAccuracy) + 0.3 * (ErrorReduction) + 0.1 * (SelfCorrection)
      practiceScore = Math.round((0.6 * recentAccuracy + 0.3 * errorReduction + 0.1 * selfCorrection) * 100);
    }

    // ====================
    // 3. ASSESSMENT MASTERY (25%)
    // ====================
    let assessmentScore = 0;
    if (examSessions.length > 0) {
      // Test accuracy (recent exams)
      const recentExams = examSessions.slice(0, 3);
      const testAccuracy = recentExams.reduce((sum, s) => sum + (s.accuracy || 0), 0) / recentExams.length / 100;

      // Difficulty factor (mock: based on questions_answered - harder tests have more questions)
      const difficultyFactor = recentExams.reduce((sum, s) => {
        const difficulty = Math.min(s.questions_answered / 20, 1); // Assume 20 questions = max difficulty
        return sum + difficulty;
      }, 0) / recentExams.length;

      // Formula: AssessmentScore = 0.7 * (TestAccuracy) + 0.3 * (DifficultyFactor)
      assessmentScore = Math.round((0.7 * testAccuracy + 0.3 * difficultyFactor) * 100);
    }

    // ====================
    // FINAL PROGRESS CALCULATION
    // ====================
    const overallProgress = Math.round(
      conceptScore * 0.35 +
      practiceScore * 0.40 +
      assessmentScore * 0.25
    );

    // Calculate total stats
    const totalQuestions = sessions.reduce((sum, s) => sum + s.questions_answered, 0);
    const totalCorrect = sessions.reduce((sum, s) => sum + s.correct_answers, 0);

    // Update user_topics with new scores
    const { error: updateError } = await supabase
      .from('user_topics')
      .update({
        concept_score: conceptScore,
        practice_score: practiceScore,
        assessment_score: assessmentScore,
        overall_progress: overallProgress,
        total_questions_answered: totalQuestions,
        correct_answers: totalCorrect,
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

    console.log(`Progress calculated: Overall=${overallProgress}%, Concept=${conceptScore}%, Practice=${practiceScore}%, Assessment=${assessmentScore}%`);

    return new Response(JSON.stringify({
      success: true,
      progress: {
        overall: overallProgress,
        concept: conceptScore,
        practice: practiceScore,
        assessment: assessmentScore,
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