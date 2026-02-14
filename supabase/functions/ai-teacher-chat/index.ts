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
    // קבלת הפרמטרים, כולל ה-mode החדש ותמונה
    const { messages, topic, mode, image } = await req.json();

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
    console.log("Image received:", image ? "Yes (length: " + image.length + ")" : "No");

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Invalid messages format");
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
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
      .select("full_name, grade")
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
  3. אם המשתמש *כן* סיפק את התוכן (כולל תמונה):
     - נתח אותו בקפידה.
     - אם זו תמונה - תאר את מה שאתה רואה בה ועזור בהתאם.
     - הובל את התלמיד שלב־אחר־שלב.
     - אל תתן תשובה סופית מיידית — תמיד הכוונה הדרגתית.
     - אפשר לו לחשוב, להסביר את הבחירה שלו ולהתקדם ביחד.
  `;
        break;

      case "exam_prep":
        modeInstructions = `
  מצב נוכחי: **הכנה למבחן**.

  כללי פעולה (מחייבים):
  1. בדוק אם המשתמש ציין על מה המבחן (נושא / יחידה / מבנה / אוצר מילים) או צירף חומר רלוונטי (כולל תמונה).
  2. אם הנושא *אינו* ידוע:
     שאל *בתבנית קבועה*: 
     "על איזה נושא המבחן? או שתרצה שנעבור על החומר הכללי לרמה ולכיתה שלך?"
     - אל צור שאלות למבחן לפני שהנושא מוגדר בבירור.
  3. אם המשתמש שלח תמונה:
     - נתח את התמונה בקפידה.
     - אם זה חומר לימוד או מבחן לדוגמה - עזור בהתאם.
  4. רק לאחר שהנושא הובהר:
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

  אם המשתמש שלח תמונה:
  - נתח אותה ועזור בהתאם לתוכנה.
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

3. **טיפול בתמונות**
   - אם המשתמש שלח תמונה, נתח אותה בקפידה.
   - תאר מה אתה רואה בתמונה ועזור בהתאם.
   - אם זו תמונה של שיעורי בית / מבחן / טקסט באנגלית - עזור לפתור.

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

  כלל מחייב לגבי סוגי שאלות:
יש לשמור על הפרדה מוחלטת בין סוגי התרגול. אין לשלב בין פורמטים שונים.

- אם סוג התרגיל הוא **השלמת משפט**:
  אין לספק אופציות בחירה. אין להפוך את זה לשאלה אמריקאית.

- אם סוג התרגיל הוא **תרגום**:
  אין לתת אפשרויות השלמה, אין לתת בחירה מרובה, ואין לשלב שאלות דקדוקיות בתוכה.

- אם סוג התרגיל הוא **בחירה מרובה (Multiple Choice)**:
  חובה לספק 4 אפשרויות. אין לבקש מהתלמיד להשלים/לתרגם.

- אם סוג התרגיל הוא **תיקון שגיאה**:
  אין לתת אופציות ואין לתרגם. השאלה היא רק: "מצא ותקן את השגיאה במשפט".

- אם סוג התרגיל הוא **יצירת משפט**:
  אין לתת השלמות, אין לתת אופציות, ואין לבקש תרגום.

הסוכן חייב לבחור בכל פעם סוג אחד של תרגיל — ולא לערבב בין הפורמטים.


=====================
📌 התחלת שיחה
=====================
התחל לפעול כעת בהתאם למצב \`${currentMode}\`.
`;

    // Convert messages to Gemini format
    const geminiContents = [];

    // Add system prompt as first user message in Gemini
    geminiContents.push({
      role: "user",
      parts: [{ text: systemPromptContent }]
    });
    geminiContents.push({
      role: "model",
      parts: [{ text: "אני מבין. אני פועל כמורה פרטי לאנגלית. אני מוכן להתחיל." }]
    });

    // Process messages
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const isLastMessage = i === messages.length - 1;

      if (msg.role === "user") {
        const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];

        // Add text
        if (msg.content) {
          parts.push({ text: msg.content });
        }

        // Add image if this is the last message and we have an image
        if (isLastMessage && image) {
          // Extract base64 data and mime type from data URL
          const matches = image.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            const mimeType = matches[1];
            const base64Data = matches[2];
            parts.push({
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            });
          }
        }

        geminiContents.push({ role: "user", parts });
      } else if (msg.role === "assistant") {
        geminiContents.push({
          role: "model",
          parts: [{ text: msg.content }]
        });
      }
    }

    console.log("Calling Gemini API for user:", profile.full_name, "Mode:", currentMode);
    console.log("Has image in last message:", !!image);
    console.log("Gemini request contents count:", geminiContents.length);

    const geminiRequest = {
      contents: geminiContents,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
    };

    console.log("Gemini request config:", JSON.stringify(geminiRequest, null, 2).substring(0, 500));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(geminiRequest),
      }
    );

    console.log("Gemini response status:", response.status);
    console.log("Gemini response headers:", Object.fromEntries(response.headers.entries()));
    console.log("Gemini response body exists:", !!response.body);
    console.log("Gemini response bodyUsed:", response.bodyUsed);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`Gemini API error: ${response.status}`);
    }

    // Transform Gemini streaming response to OpenAI-compatible format
    const reader = response.body?.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (!reader) {
            throw new Error("No response body");
          }

          let buffer = "";
          let chunkCount = 0;

          console.log("[Stream] Starting to read Gemini stream...");

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              console.log("[Stream] Gemini stream done, total chunks:", chunkCount);
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            chunkCount++;
            console.log(`[Stream] Chunk ${chunkCount}:`, chunk.substring(0, 150));

            buffer += chunk;
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.trim() === "") continue;

              console.log("[Stream] Raw line:", line.substring(0, 200));

              // Gemini SSE format uses "data: " prefix
              let jsonData = line;
              if (line.startsWith("data: ")) {
                jsonData = line.substring(6); // Remove "data: " prefix
                console.log("[Stream] Extracted JSON from SSE:", jsonData.substring(0, 200));
              } else if (!line.startsWith("{")) {
                console.log("[Stream] Skipping non-JSON line");
                continue;
              }

              try {
                const geminiChunk = JSON.parse(jsonData);
                console.log("[Stream] Parsed Gemini chunk:", JSON.stringify(geminiChunk).substring(0, 200));

                // Extract text from Gemini response
                const text = geminiChunk.candidates?.[0]?.content?.parts?.[0]?.text;

                if (text) {
                  console.log("[Stream] Extracted text:", text.substring(0, 100));
                  // Convert to OpenAI-compatible SSE format
                  const openAIChunk = {
                    id: "chatcmpl-" + Date.now(),
                    object: "chat.completion.chunk",
                    created: Date.now(),
                    model: "gemini-1.5-flash",
                    choices: [{
                      index: 0,
                      delta: { content: text },
                      finish_reason: null
                    }]
                  };

                  const sseData = `data: ${JSON.stringify(openAIChunk)}\n\n`;
                  console.log("[Stream] Sending SSE:", sseData.substring(0, 150));
                  controller.enqueue(encoder.encode(sseData));
                }

                // Check if generation is finished
                if (geminiChunk.candidates?.[0]?.finishReason) {
                  console.log("[Stream] Gemini finished:", geminiChunk.candidates[0].finishReason);
                  const finishChunk = {
                    id: "chatcmpl-" + Date.now(),
                    object: "chat.completion.chunk",
                    created: Date.now(),
                    model: "gemini-1.5-flash",
                    choices: [{
                      index: 0,
                      delta: {},
                      finish_reason: "stop"
                    }]
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(finishChunk)}\n\n`));
                }
              } catch (parseError) {
                console.error("Error parsing Gemini chunk:", parseError, "Line:", line);
              }
            }
          }
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
