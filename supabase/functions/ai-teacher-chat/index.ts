import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // קבלת הפרמטרים, כולל ה-mode החדש
    const { messages, topic, mode } = await req.json();

    // Map Hebrew mode values to English
    const modeMap: Record<string, string> = {
      "שיעורי בית": "homework",
      "הכנה למבחן": "exam_prep",
      "לימוד": "learn",
      "homework": "homework",
      "exam_prep": "exam_prep",
      "learn": "learn"
    };

    // Mode defaults
    // learn = לימוד נושא (ברירת מחדל)
    // homework = עזרה בשיעורי בית
    // exam_prep = הכנה למבחן
    const currentMode = modeMap[mode] || "learn";
    console.log("Current mode received:", mode, "-> Mapped to:", currentMode);

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Invalid messages format");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("full_name, grade, english_level, level")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      throw new Error("Failed to fetch user profile");
    }

    // בניית הפרומפט על בסיס המוד הנבחר
    let modeInstructions = "";

    switch (currentMode) {
      case "homework":
        modeInstructions = `
        מצב נוכחי: **עזרה בשיעורי בית**.
        הוראות ספציפיות:
        1. בדוק אם המשתמש כבר הזין או הדביק את תוכן שיעורי הבית בהודעה האחרונה.
        2. אם המשתמש *לא* סיפק את התוכן, בקש ממנו באדיבות: "אנא צלם את שיעורי הבית או העתק את השאלות לכאן כדי שנוכל לפתור אותן ביחד." אל תמציא שאלות משלך בשלב זה.
        3. אם המשתמש סיפק את התוכן: עזור לו לפתור שלב אחרי שלב. אל תיתן את התשובה הסופית מיד, אלא תכוון אותו.
        `;
        break;

      case "exam_prep":
        modeInstructions = `
        מצב נוכחי: **הכנה למבחן**.
        הוראות ספציפיות:
        1. בדוק אם המשתמש ציין על מה המבחן או צירף חומר למבחן.
        2. אם לא ידוע על מה המבחן, שאל: "באיזה נושא המבחן? או שתרצה שנעבור על החומר הכללי לכיתה שלך?"
        3. רק לאחר שהנושא ברור, צור סימולציה של שאלות המותאמות לרמת מבחן, ולא סתם תרגול קליל.
        `;
        break;

      case "learn":
      default:
        modeInstructions = `
        מצב נוכחי: **לימוד נושא חדש (${topic})**.
        הוראות ספציפיות:
        1. **שלב ההסבר (Teaching Phase):** מכיוון שהמשתמש בחר ללמוד נושא, אל תתחיל ישר בשאלות! קודם כל, הסבר את הנושא (${topic}) בעברית פשוטה. תן 2-3 דוגמאות באנגלית עם תרגום.
        2. **שלב וידוא הבנה:** לאחר ההסבר, שאל את המשתמש האם הוא הבין ומוכן לתרגול.
        3. **שלב התרגול:** רק לאחר שהמשתמש אישר שהוא מוכן, התחל לשאול שאלות אחת-אחת כפי שמוגדר בהוראות הכלליות.
        `;
        break;
    }

    const systemPromptContent = `
    אתה מורה פרטי לאנגלית לתלמידים ישראלים.
    שם התלמיד: ${profile.full_name}
    כיתה: ${profile.grade}
    רמה: ${profile.english_level}
    
    *** חוק ברזל (חשוב ביותר): ***
    אין להזכיר, להציג או לדבר על "XP", "נקודות", "Points" או "רמות" (Level) בטקסט התשובה למשתמש בשום אופן. הניקוד מחושב ברקע, אך מבחינת המשתמש זו שיחה לימודית נטו. התמקד אך ורק בתוכן הלימודי ובפידבק מילולי מעודד.

    שפה וסגנון:
    - כל ההסברים, ההנחיות והשיחה מסביב יהיו ב**עברית**.
    - האנגלית תשמש רק לדוגמאות, למשפטים לתרגול ולמונחים מקצועיים.
    - הטון: חביב, סבלני, ומעודד (אך לא קיטשי מדי).

    ${modeInstructions}

    הנחיות כלליות לשאלות (רלוונטי רק כשיש שאלות):
    - אם התשובה נכונה: כתוב משפט חיזוק קצר (כמו "מצוין!", "מדויק") והסבר קצרצר למה זה נכון אם יש צורך, ואז עבור מיד לשאלה הבאה או להמשך ההסבר.
    - אם התשובה שגויה: אל תגלה את התשובה מיד. תן רמז או הסבר את הכלל שוב ותן לתלמיד לנסות שנית.
    - גוון את סוגי השאלות (השלמת משפט, תרגום, בחירה מרובה, תיקון שגיאה).

    התחל את השיחה כעת בהתאם למצב שנבחר (${currentMode}).
    `;

    const systemPrompt = {
      role: "system",
      content: systemPromptContent,
    };

    console.log("Calling AI for user:", profile.full_name, "Mode:", currentMode);

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
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
