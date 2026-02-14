import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { grade, englishLevel } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const prompt = `You are an English teaching expert for Israeli students. Generate exactly 8 relevant English learning topics for:
- Grade: ${grade} (כיתה ${grade})
- English Level: ${englishLevel}

For younger grades (1-3) with beginner level: Simple topics like colors, animals, family, numbers, basic verbs
For middle grades (4-6) with starter/elementary: School subjects, hobbies, daily routines, simple stories
For upper grades (7-9) with intermediate: Reading comprehension, grammar, writing exercises, conversations
For high school (10-12) with advanced: Unseen texts, essay writing, literature, debate topics

Return a JSON object with the following structure:
{
  "topics": [
    {
      "title": "Topic title in Hebrew",
      "icon": "Single emoji",
      "description": "Brief description in Hebrew"
    }
  ]
}

Return ONLY valid JSON, no other text.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: 'You are an expert in English education for Israeli students. Generate engaging, level-appropriate topics.' }]
            },
            {
              role: 'model',
              parts: [{ text: 'I understand. I will generate appropriate English learning topics in Hebrew.' }]
            },
            {
              role: 'user',
              parts: [{ text: prompt }]
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
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Failed to generate topics' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      throw new Error('No content in response');
    }

    // Parse JSON from response, handling potential markdown code blocks
    let parsedData;
    try {
      const jsonMatch = textContent.match(/```json\n([\s\S]*?)\n```/) || textContent.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : textContent;
      parsedData = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse Gemini response:', textContent);
      throw new Error('Invalid JSON response from AI');
    }

    const topics = parsedData.topics;

    if (!Array.isArray(topics) || topics.length !== 8) {
      throw new Error('Expected exactly 8 topics');
    }

    return new Response(JSON.stringify({ topics }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in suggest-topics:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
