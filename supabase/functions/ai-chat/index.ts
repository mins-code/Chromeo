
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "https://esm.sh/@google/genai@0.1.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, history, userName, systemInstruction } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('Missing GEMINI_API_KEY environment variable');
    }

    const ai = new GoogleGenAI({ apiKey });

    // If history is provided, it's a chat session
    if (history) {
        const chat = ai.chats.create({
            model: 'gemini-2.0-flash-exp', // Updated model name or keep as requested
            config: {
                systemInstruction: systemInstruction,
            },
            history: history
        });

        const result = await chat.sendMessage({ message });
        return new Response(JSON.stringify({ text: result.text }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } else {
        // Single generation (for task enhancement)
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: message, // 'contents' expects the prompt string or parts
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                // schema is passed in systemInstruction or part of the prompt in the service
                // but if we need JSON mode, we should pass it.
                // For simplicity, we assume the prompt handles JSON structure requests
                // OR we can pass config from body if needed.
            }
        });
         return new Response(JSON.stringify({ text: response.text }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
