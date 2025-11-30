import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { conversationId, topicId, mode } = await req.json()

    if (!conversationId || !topicId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Checking completion for conversation ${conversationId}, mode: ${mode}`)

    // Get the current session
    const { data: session, error: sessionError } = await supabase
      .from('lesson_sessions')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .is('completed_at', null)
      .single()

    if (sessionError || !session) {
      console.log('No active session found or already completed')
      return new Response(JSON.stringify({ 
        shouldComplete: false, 
        reason: 'No active session' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get recent messages to analyze completion
    const { data: messages } = await supabase
      .from('lesson_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(15)

    const questionsAnswered = session.questions_answered || 0
    const correctAnswers = session.correct_answers || 0
    const hintsUsed = session.hints_used || 0
    const accuracy = questionsAnswered > 0 ? correctAnswers / questionsAnswered : 0
    const correctWithoutHints = correctAnswers - (session.correct_after_hint || 0)

    let shouldComplete = false
    let completionReason = ''
    const criteriaMet: any = {}

    // STRICT Mode-specific completion logic
    if (mode === 'exam_prep') {
      // Test completion: 85%+ correct AND all items evaluated
      const meetsAccuracyThreshold = accuracy >= 0.85
      const hasAnsweredEnough = questionsAnswered >= 15
      
      if (hasAnsweredEnough && meetsAccuracyThreshold) {
        shouldComplete = true
        completionReason = 'Test completed with 85%+ accuracy'
        criteriaMet.questionsAnswered = questionsAnswered
        criteriaMet.accuracy = (accuracy * 100).toFixed(1)
        criteriaMet.threshold = '85%'
      }
      
    } else if (mode === 'homework') {
      // Homework - VERY STRICT criteria
      const lastMessages = messages?.slice(0, 5) || []
      
      // Check if bot confirmed full resolution
      const botConfirmedFullResolution = lastMessages.some(m => 
        m.role === 'assistant' && (
          m.content.includes('כל השאלות נפתרו') ||
          m.content.includes('הבנת הכל נכון') ||
          m.content.includes('סיימת בהצלחה')
        )
      )
      
      // Check if user demonstrated understanding with self-generated correct responses
      const hasTwoCorrectResponses = correctWithoutHints >= 2
      
      // Check for user confirmation (optional but helpful)
      const userConfirmedDone = lastMessages.some(m => 
        m.role === 'user' && (
          m.content.includes('סיימתי') || 
          m.content.includes('הבנתי') || 
          m.content.includes('זה ברור')
        )
      )
      
      // Three consecutive correct on different subskills (automatic completion)
      const threeConsecutiveOnDifferent = 
        correctWithoutHints >= 3 && 
        (session.subskills_practiced?.length || 0) >= 3
      
      // Bot confidence must be > 0.87
      const botConfidenceHigh = accuracy >= 0.87

      if ((botConfirmedFullResolution && hasTwoCorrectResponses && botConfidenceHigh) ||
          (threeConsecutiveOnDifferent && botConfidenceHigh)) {
        shouldComplete = true
        completionReason = threeConsecutiveOnDifferent 
          ? 'Three consecutive correct answers on different subskills with high confidence'
          : 'Full task resolution with demonstrated understanding and high bot confidence'
        criteriaMet.botConfidence = (accuracy * 100).toFixed(1)
        criteriaMet.correctWithoutHints = correctWithoutHints
        criteriaMet.subskillsCovered = session.subskills_practiced?.length || 0
        criteriaMet.userConfirmed = userConfirmedDone
      }
      
    } else if (mode === 'learn') {
      // Practice mode - comprehensive and strict
      const minQuestions = 12
      const maxQuestions = 15
      const hasMinInteractions = questionsAnswered >= minQuestions
      const hasGoodAccuracy = accuracy >= 0.7
      const subskillsCovered = session.subskills_practiced?.length || 0
      const hasCoverage = subskillsCovered >= 3
      const hasTwoCorrectPerSubskill = correctWithoutHints >= (subskillsCovered * 2)
      
      // Check if bot has proposed mastery
      const lastMessages = messages?.slice(0, 5) || []
      const botProposedCompletion = lastMessages.some(m =>
        m.role === 'assistant' && (
          m.content.includes('השגת שליטה') ||
          m.content.includes('הפנמת את הנושא') ||
          m.content.includes('מצוין, סיימנו')
        )
      )
      
      // User agreement to end
      const userAgreedToEnd = lastMessages.some(m =>
        m.role === 'user' && (
          m.content.includes('בטח') ||
          m.content.includes('נראה טוב') ||
          m.content.includes('אוקיי')
        )
      )

      if (hasMinInteractions && hasGoodAccuracy && hasCoverage && 
          hasTwoCorrectPerSubskill && (botProposedCompletion || questionsAnswered >= maxQuestions)) {
        shouldComplete = true
        completionReason = questionsAnswered >= maxQuestions
          ? 'Practice mastery achieved through comprehensive coverage'
          : 'Mutual agreement on mastery with full coverage'
        criteriaMet.questionsAnswered = questionsAnswered
        criteriaMet.accuracy = (accuracy * 100).toFixed(1)
        criteriaMet.subskillsCovered = subskillsCovered
        criteriaMet.correctPerSubskill = (correctWithoutHints / subskillsCovered).toFixed(1)
        criteriaMet.mutualAgreement = botProposedCompletion && userAgreedToEnd
      }
    }

    if (shouldComplete) {
      // Mark session as complete with progress at 100%
      await supabase
        .from('lesson_sessions')
        .update({
          completed_at: new Date().toISOString(),
          session_progress: 100.00,
          completion_criteria_met: criteriaMet,
        })
        .eq('id', session.id)

      console.log(`Session ${session.id} marked as complete at 100%: ${completionReason}`)
      
      // Trigger topic progress recalculation
      await supabase.functions.invoke('calculate-topic-progress', {
        body: { topicId },
      })
    } else {
      // Update session progress based on current state
      await supabase.functions.invoke('calculate-progress', {
        body: { sessionId: session.id },
      })
    }

    return new Response(JSON.stringify({ 
      shouldComplete, 
      reason: completionReason,
      criteriaMet,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in completion check:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
