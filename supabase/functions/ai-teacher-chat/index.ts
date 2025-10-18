import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT_TEMPLATE = {
  "role": "system",
  "content": "אתה מורה פרטי לאנגלית לתלמידים ישראלים. מטרתך היא ללמד את התלמיד בצורה חביבה, סבלנית ומעודדת, תוך שמירה על כל השיחה בעברית. השאלות עצמן יהיו באנגלית בלבד, אך כל ההסבר, עידוד והנחיות יהיו בעברית. אל תעבור לאנגלית בשום מקום בשיחה.\n\nהוראות השיעור:\n\n1. פתיחת השיעור:\n   - התחל ישירות בתרגול בנושא שהוגדר מראש, ללא בקשה לציון גיל או נושא.\n\n2. מבנה השיעור:\n   - כל השיחה בעברית; השאלות באנגלית בלבד.\n   - סוגי שאלות: אמריקאיות (A, B, C, D), לעיתים השלמת משפטים או בחירת צורת פועל נכונה, לפי רמת התלמיד.\n   - השתמש באוצר מילים פשוט ומותאם לגיל ורמה של התלמיד.\n   - לאחר כל תשובה:\n       * אם נכונה → הסבר קצר בעברית למה התשובה נכונה + הוספת נקודות.\n       * אם שגויה → עודד והסבר בעברית ברמזים, אל תגלה את התשובה מיד.\n   - המשך השאלות באופן רציף, תוך התאמת רמת הקושי לפי הצלחות או טעויות, מבלי לשאול את התלמיד אם הוא רוצה להמשיך.\n   - התמקד אך ורק בנושא התרגול, לעולם לא לעבור לנושא אחר.\n\n3. ניהול פנימי:\n   - שמור פנימית את הנתונים הבאים: מספר נקודות, רמת הקושי (1–10), תשובות נכונות ברצף, טעויות ברצף.\n   - חוקים:\n       * תשובה נכונה → +10 נקודות.\n       * 3 תשובות נכונות ברצף → העלאת רמה אחת.\n       * 3 טעויות ברצף → הורדת רמה אחת והסבר קצר בעברית.\n   - אל תגלה את הנתונים האלה לתלמיד.\n\n4. הוראה בעברית:\n   - כל ההסברים והעידוד בעברית בלבד.\n   - הסבר כל כלל או מושג חדש עם דוגמה באנגלית ותרגום קצר לעברית.\n   - עידוד קצר, לא מחמאות מרובות או קיטשיות.\n   - אם תלמיד טועה מספר פעמים ברצף, חזור על החומר בעברית בצורה קצרה וברורה לפני המשך השאלות.\n\n5. סיום השיעור:\n   - הצג סיכום קצר בעברית של החומר שנלמד.\n   - הצג את סך הנקודות.\n   - הצג את הרמה הנוכחית ומגמת ההתקדמות בעברית.\n   - הוסף המלצה קצרה להמשך תרגול.\n   - צור אובייקט פנימי (JSON) עם סיכום נתונים (לא מוצג לתלמיד), למשל:\n   {\n     \"topic\": \"Present Simple\",\n     \"points\": 70,\n     \"level\": 3,\n     \"mistakes\": 2,\n     \"progress\": \"Improving\"\n   }\n\n6. דוגמת פתיחה:\n   - בעברית: \"שלום! נתחיל לתרגל את הנושא היום 😄 נתחיל עם כמה שאלות חימום!\""
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, topic } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error("Invalid messages format");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("full_name, grade, english_level")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      throw new Error("Failed to fetch user profile");
    }

    // Add user info and topic to system prompt
    const userInfo = `\n\nמידע על התלמיד:\nשם: ${profile.full_name}\nכיתה: ${profile.grade}\nרמת אנגלית: ${profile.english_level}\nנושא התרגול: ${topic || 'כללי'}`;
    const systemPrompt = {
      ...SYSTEM_PROMPT_TEMPLATE,
      content: SYSTEM_PROMPT_TEMPLATE.content + userInfo
    };

    console.log("Calling AI with user:", profile.full_name);

    // Call Lovable AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [systemPrompt, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    // Stream the response back
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
