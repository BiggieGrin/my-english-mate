import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profile, strengthsData, dailyStudyData, recentMessages } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Check if there's enough data for assessment
    const hasEnoughData = recentMessages && recentMessages.length > 5;

    if (!hasEnoughData) {
      return new Response(
        JSON.stringify({
          trend: "התחל ללמוד! 🚀",
          strengths: ["עדיין לא התחלת מספיק שיעורים כדי לנתח"],
          improvements: ["התחל לתרגל באופן קבוע כדי לקבל הערכה מפורטת"],
          hasEnoughData: false,
          skills: {
            vocabulary: 50,
            grammar: 50,
            reading: 50,
            writing: 50,
            speaking: 50
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context about user's learning
    const userContext = `
פרופיל תלמיד:
- רמה: ${profile.level}
- נקודות כוללות: ${profile.total_points}
- שיעורים שהושלמו: ${profile.lessons_completed}
- רצף למידה נוכחי: ${profile.current_streak} ימים
- רמת אנגלית: ${profile.english_level}
- כיתה: ${profile.grade}

נתוני מיומנויות:
${strengthsData.map((s: any) => `- ${s.skill}: ${s.score} נקודות`).join('\n')}

זמני למידה יומיים (7 ימים אחרונים):
${dailyStudyData.map((d: any) => `${d.day}: ${d.minutes} דקות`).join(', ')}

מספר הודעות בשיעורים אחרונים: ${recentMessages.length}
`;

    const systemPrompt = `אתה מורה AI לאנגלית המנתח את ההתקדמות של תלמידים ישראלים.
תפקידך לתת הערכה ממוקדת, עידודית וקונקרטית על סמך הנתונים.
ענה בעברית בפורמט JSON בלבד, עם השדות הבאים:
{
  "trend": "משפט קצר על המגמה הכללית (עד 50 תווים, כולל אמוג'י)",
  "strengths": ["רשימה של 2-3 נקודות חוזקה קונקרטיות"],
  "improvements": ["רשימה של 2-3 המלצות ספציפיות לשיפור"],
  "skills": {
    "vocabulary": 0-100,
    "grammar": 0-100,
    "reading": 0-100,
    "writing": 0-100,
    "speaking": 0-100
  }
}

דגש על:
- תובנות קונקרטיות מהנתונים
- עידוד חיובי
- המלצות מעשיות
- התייחסות לרצף הלמידה
- נתח את הנושאים והתוכן של השיחות כדי להעריך את רמת המיומנויות בכל תחום (0-100)
- vocabulary = אוצר מילים
- grammar = דקדוק
- reading = הבנת הנקרא
- writing = כתיבה
- speaking = שיחה

החזר ONLY JSON תקין, ללא טקסט נוסף.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: systemPrompt }]
            },
            {
              role: "model",
              parts: [{ text: "אני מבין. אני אנתח את הנתונים ואחזיר JSON תקין בעברית." }]
            },
            {
              role: "user",
              parts: [{ text: userContext }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "הגעת למגבלת הקריאות, נסה שוב מאוחר יותר" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error("שגיאה בשירות ההערכה");
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("No content in Gemini response");
    }
    
    // Parse the JSON response
    let assessment;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      assessment = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      // Fallback to basic assessment
      assessment = {
        trend: "ממשיך להתקדם 📈",
        strengths: ["פעיל בלמידה"],
        improvements: ["המשך לתרגל באופן קבוע"],
        skills: {
          vocabulary: 50,
          grammar: 50,
          reading: 50,
          writing: 50,
          speaking: 50
        }
      };
    }

    // Add study_minutes_at_assessment to track when assessment was made
    const fullAssessment = {
      ...assessment,
      hasEnoughData: true,
      study_minutes_at_assessment: profile.total_study_minutes || 0,
    };

    // Save assessment to profiles table
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await supabaseAdmin
      .from("profiles")
      .update({
        ai_assessment: fullAssessment,
        last_assessment_time: new Date().toISOString(),
      })
      .eq("id", profile.id);

    return new Response(
      JSON.stringify(fullAssessment),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in ai-assessment:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "שגיאה לא ידועה",
        trend: "לא ניתן לנתח כרגע",
        strengths: ["המערכת תעבוד שוב בקרוב"],
        improvements: ["נסה שוב מאוחר יותר"],
        hasEnoughData: false,
        skills: {
          vocabulary: 50,
          grammar: 50,
          reading: 50,
          writing: 50,
          speaking: 50
        }
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
