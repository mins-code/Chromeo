import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.12.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

    const { message, history, systemInstruction } = await req.json()
    const genAI = new GoogleGenerativeAI(apiKey)

    let responseText = ""

    // LOGIC FORK: Check if this is a Chat or a JSON Task
    if (history && history.length > 0) {
      // SCENARIO A: Chat Mode (Conversational)
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash", // Using the latest 2.0 Flash
        systemInstruction: systemInstruction 
      })

      const chat = model.startChat({
        history: history.map((h: any) => ({
          role: h.role === 'model' ? 'model' : 'user',
          parts: h.parts
        })),
      })

      const result = await chat.sendMessage(message)
      responseText = result.response.text()

    } else {
      // SCENARIO B: Task Mode (Strict JSON for Cmd+K)
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        systemInstruction: systemInstruction,
        generationConfig: { responseMimeType: "application/json" } // <--- CRITICAL FEATURE RESTORED
      })

      const result = await model.generateContent(message)
      responseText = result.response.text()
    }

    return new Response(JSON.stringify({ text: responseText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})