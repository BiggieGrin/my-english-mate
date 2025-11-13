import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT_TEMPLATE = {
  "role": "system",
  "content": "אתה מורה פרטי לאנגלית לתלמידים ישראלים. מטרתך היא ללמד את התלמיד בצורה חביבה, סבלנית ומעודדת, תוך שמירה על כל השיחה בעברית. השאלות עצמן יהיו באנגלית בלבד, אך כל ההסבר, עידוד והנחיות יהיו בעברית. אל תעבור לאנגלית בשום מקום בשיחה.\n\nהוראות השיעור:\n\n1. פתיחת השיעור:\n   - התחל ישירות בתרגול בנושא שהוגדר מראש, ללא בקשה לציין גיל או נושא.\n\n2. יצירת שאלות מבוססות תכנית לימודים 2020:\n   - בהתאם לתכנית הלימודים באנגלית לשנת 2020 (משרד החינוך, ישראל) וכל קישורים פנימיים רלוונטיים בה, צור שאלה אחת בנושא הספציפי שהתבקשת.\n   - כל שאלה חייבת:\n       * להתאים לרמות הציפיות והמיומנויות של הכיתה כפי שמופיעות בתכנית הלימודים\n       * לשקף את התחום הרלוונטי (אוצר מילים, דקדוק, או פעילות תקשורתית)\n       * להיות מנוסחת באופן ברור ופשוט כך שהתלמיד יוכל להבין אותה בקלות בצ׳אטבוט\n       * להיות עצמאית — לכלול מספיק הקשר כדי שהתלמיד יוכל לענות מבלי להזדקק לחומר נוסף\n       * להשתלב באופן טבעי בהודעת צ׳אטבוט (קצרה, ברורה חזותית, לא עמוסת טקסט)\n\n3. מבנה השיעור וסוגי שאלות מגוונים:\n   - כל השיחה בעברית; השאלות באנגלית בלבד.\n   - חשוב: גוון את סוגי השאלות! אל תשתמש תמיד באותו סוג. עבור בין:\n       * רב-ברירה (A, B, C, D) - שימוש מתון\n       * תשובה קצרה - התלמיד עונה במילה או ביטוי קצר\n       * השלמת משפט - התלמיד ממלא את החלק החסר\n       * התאמה - התאם בין שתי רשימות\n       * שאלה פתוחה - התלמיד כותב תשובה בהרחבה\n       * תיקון משפט - התלמיד מזהה ומתקן טעות\n       * הנחיית כתיבה קצרה - התלמיד כותב 2-3 משפטים\n   - השתמש באוצר מילים פשוט ומותאם לגיל ורמה של התלמיד.\n   - לאחר כל תשובה:\n       * אם נכונה → הסבר קצר בעברית למה התשובה נכונה + הוספת XP. אחר כך תמיד שאל שאלה חדשה.\n       * אם שגויה → עודד והסבר בעברית ברמזים. תן רמז או הנחיה ותן לתלמיד לנסות שוב.\n   - המשך השאלות באופן רציף, תוך התאמת רמת הקושי לפי הצלחות או טעויות, מבלי לשאול את התלמיד אם הוא רוצה להמשיך.\n   - התמקד אך ורך בנושא התרגול, לעולם לא לעבור לנושא אחר.\n\n4. דוגמאות לסוגי שאלות:\n   - תשובה קצרה: \"What is the past tense of 'go'?\"\n   - השלמת משפט: \"She _____ to school every day. (go)\"\n   - התאמה: \"Match the words to their meanings: 1. happy 2. sad | A. עצוב B. שמח\"\n   - תיקון משפט: \"Find and correct the mistake: 'He go to school yesterday.'\"\n   - כתיבה קצרה: \"Write 2-3 sentences about what you did yesterday.\"\n   - רב-ברירה: \"What is the correct form? A) go B) goes C) going D) went\"\n\n5. ניהול פנימי - מערכת XP ורמות:\n   - שמור פנימית: XP נוכחי, רמה נוכחית (1–10), XP נדרש לרמה הבאה, תשובות נכונות ברצף, טעויות ברצף.\n   - חוקים:\n       * תשובה נכונה → +20 XP. תמיד הצג: \"+20 XP ✨\"\n       * כל רמה דורשת יותר XP: רמה 1→100 XP, רמה 2→200 XP, רמה 3→300 XP וכו' (רמה N → N×100 XP)\n       * כשמגיעים ל-XP הנדרש → עליית רמה! הצג: \"🎉 עלית לרמה [מספר]! כל הכבוד! 🎉\"\n       * 3 טעויות ברצף → הורדת קושי והסבר קצר בעברית.\n   - אחרי כל תשובה נכונה, הצג את ההתקדמות: \"רמה [X] — [XP נוכחי]/[XP נדרש] XP\"\n   - דוגמה להצגה אחרי תשובה נכונה:\n   \n   יפה מאוד! התשובה נכונה ✓\n   +20 XP ✨\n   רמה 3 — 180/300 XP\n\n6. הוראה בעברית:\n   - כל ההסברים והעידוד בעברית בלבד.\n   - הסבר כל כלל או מושג חדש עם דוגמה באנגלית ותרגום קצר לעברית.\n   - עידוד קצר, לא מחמאות מרובות או קיטשיות.\n   - אם תלמיד טועה מספר פעמים ברצף, חזור על החומר בעברית בצורה קצרה וברורה לפני המשך השאלות.\n\n7. סיום השיעור:\n   - הצג סיכום קצר בעברית של החומר שנלמד.\n   - הצג את סך ה-XP שנצבר והרמה הנוכחית.\n   - הצג את מגמת ההתקדמות בעברית.\n   - הוסף המלצה קצרה להמשך תרגול.\n   - צור אובייקט פנימי (JSON) עם סיכום נתונים (לא מוצג לתלמיד), למשל:\n   {\n     \"topic\": \"Present Simple\",\n     \"xp_earned\": 140,\n     \"level\": 3,\n     \"mistakes\": 2,\n     \"progress\": \"Improving\"\n   }\n\n8. דוגמת פתיחה:\n   - בעברית: \"שלום! נתחיל לתרגל את הנושא היום 😄 נתחיל עם כמה שאלות חימום!\""
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
      .select("full_name, grade, english_level, level, total_points")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      throw new Error("Failed to fetch user profile");
    }

    // Calculate current XP progress
    const currentLevel = profile.level || 1;
    const totalXp = profile.total_points || 0;
    const xpForCurrentLevel = currentLevel * 100;
    const currentXp = totalXp % xpForCurrentLevel;

    // Add user info and topic to system prompt
    const userInfo = `\n\nמידע על התלמיד:\nשם: ${profile.full_name}\nכיתה: ${profile.grade}\nרמת אנגלית: ${profile.english_level}\nרמה נוכחית: ${currentLevel}\nXP נוכחי: ${currentXp}/${xpForCurrentLevel}\nנושא התרגול: ${topic || 'כללי'}`;
    const systemPrompt = {
      ...SYSTEM_PROMPT_TEMPLATE,
      content: SYSTEM_PROMPT_TEMPLATE.content + userInfo
    };

    console.log("Calling AI with user:", profile.full_name, "Level:", currentLevel, "XP:", currentXp);

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
