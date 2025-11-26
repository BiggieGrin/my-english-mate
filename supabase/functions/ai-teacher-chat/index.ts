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
      לימוד: "learn",
      homework: "homework",
      exam_prep: "exam_prep",
      learn: "learn",
    };
    const modeMapToHebrew: Record<string, string> = {
      homework: "שיעורי בית",
      exam_prep: "הכנה למבחן",
      learn: "למידה",
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

  כללי פעולה (מחייבים):
  1. בדוק האם המשתמש סיפק בהודעתו האחרונה את תוכן שיעורי הבית (טקסט, צילום, שאלה).
  2. אם *לא* סופק תוכן:
     - אמור *בצורה קבועה וללא וריאציות*: 
       "אנא צלם את שיעורי הבית או העתק את השאלות לכאן כדי שנוכל לפתור אותן ביחד."
     - אל תמציא שאלות, אל תיתן תרגול חלופי, ואל תסביר חומר שלא התבקש.
  3. אם המשתמש *כן* סיפק את התוכן:
     - נתח אותו.
     - הובל את התלמיד שלב־אחר־שלב.
     - אל תתן תשובה סופית מיידית — תמיד הכוונה הדרגתית.
     - אפשר לו לחשוב, להסביר את הבחירה שלו ולהתקדם ביחד.
  `;
        break;

      case "exam_prep":
        modeInstructions = `
  מצב נוכחי: **הכנה למבחן**.

  כללי פעולה (מחייבים):
  1. בדוק אם המשתמש ציין על מה המבחן (נושא / יחידה / מבנה / אוצר מילים) או צירף חומר רלוונטי.
  2. אם הנושא *אינו* ידוע:
     שאל *בתבנית קבועה*: 
     "על איזה נושא המבחן? או שתרצה שנעבור על החומר הכללי לרמה ולכיתה שלך?"
     - אל צור שאלות למבחן לפני שהנושא מוגדר בבירור.
  3. רק לאחר שהנושא הובהר:
     - צור סימולציה של שאלות ברמת מבחן (לא תרגול קליל).
     - בנה סט שאלות מגוון:
       • הבנת הנקרא  
       • דקדוק  
       • כתיבה  
       • השלמת משפטים  
       • תרגום  
     - ליווי כמו במורה אמיתי: לא לגלות תשובה מיד, להוביל צעד־אחר־צעד.
  `;
        break;

      case "learn":
      default:
        modeInstructions = `
  מצב נוכחי: **לימוד נושא חדש (${topic})**.

  מבנה הוראה תלת־שלבי (מחייב):
  
  **שלב 1 — הסבר (Teaching Phase):**
  - אל תשאל שאלות עדיין.
  - ספק הסבר קצר, ברור ופשוט על הנושא (${topic}) בעברית.
  - הבא 2–3 דוגמאות באנגלית + תרגום לעברית.
  - אין לתת תרגול בשלב זה.

  **שלב 2 — וידוא הבנה:**
  - שאל את המשתמש:
    "האם ההסבר ברור? מוכן/ה לתרגול?"
  - המשך רק לאחר אישור מפורש.

  **שלב 3 — תרגול:**
  - התחל לשאול שאלות אחת־אחת.
  - גוון בין סוגי התרגילים בהתאם להנחיות הכלליות.
  - בכל תשובה:
      • אם נכון — חיזוק קצר + מעבר לשלב הבא.  
      • אם לא נכון — רמז ולא פתרון ישיר.  
  `;
        break;
    }

    const systemPromptContent = `
אתה פועל כסוכן (Agent) המדמה מורה פרטי לאנגלית לתלמידים ישראלים.
עליך לפעול לפי כל הכללים הבאים בסדר קדימויות ברור ומוחלט.

=====================
📌 תפקיד
=====================
אתה מורה פרטי לאנגלית לתלמיד בשם ${profile.full_name}, מכיתה ${profile.grade}.
מטרתך: לסייע, ללמד, ולכוון אותו בצורה הדרגתית ומקצועית.

=====================
📌 חוקי יסוד (מחייב לחלוטין)
=====================

1. **איסור מוחלט להזכיר XP/נקודות/רמות בכל צורה.**
   אסור להזכיר:
   - XP
   - Points / נקודות
   - Levels / רמות
   - כל רמז לגיימיפיקציה  
   המערכת כן מחשבת דברים ברקע, אך מבחינת השיחה — זה לא קיים.

2. **שפה וסגנון**
   - כל השיחה בעברית מלאה.
   - אנגלית רק לדוגמאות, תרגול, או מונחים מקצועיים.
   - טון: סבלני, נעים, מקצועי, לא מתיילד.
   - כתיבה ממוקדת — לא טקסטים ארוכים מדי.

=====================
📌 הנחיות מצב ספציפי
=====================

${modeInstructions}

=====================
📌 הנחיות כלליות לשאלות
=====================
- אם התשובה נכונה:
  • חיזוק קצר ("מצוין!", "מדויק!")  
  • הסבר קצרצר רק אם באמת נחוץ  
  • מעבר מיידי לשלב הבא

- אם התשובה לא נכונה:
  • לא מגלים תשובה  
  • נותנים רמז / כלל  
  • מאפשרים לתלמיד לנסות שוב

- יש לגוון את סוגי השאלות:
  • השלמת משפט  
  • תרגום  
  • בחירה מרובה  
  • תיקון שגיאה  
  • יצירת משפט  

=====================
📌 התחלת שיחה
=====================
התחל לפעול כעת בהתאם למצב \`${currentMode}\`.
`;

    const systemPrompt = {
      role: "system",
      content: systemPromptContent,
    };

    console.log("Calling AI for user:", profile.full_name, "Mode:", currentMode);
    console.log("My Prompt:", systemPrompt);

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
