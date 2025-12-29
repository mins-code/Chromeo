import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.12.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- SYSTEM INSTRUCTIONS ---
const BASE_SYSTEM_INSTRUCTION = `You are ChronoDeX AI, an elite productivity and financial assistant.
Your goal is to help users manage tasks, schedule work, and plan their budget.

**PROTOCOL 1: ITEM CREATION (Tasks, Events, etc.)**
1.  **CLASSIFY TYPE**:
    *   **APPOINTMENT**: Meetings, Doctor visits, specific time slots with others.
    *   **EVENT**: Parties, Holidays, Conferences, Multi-hour/day activities.
    *   **REMINDER**: Specific alerts ("Remind me to call Mom at 5pm"), time-sensitive pings.
    *   **TASK**: General to-dos ("Buy milk", "Finish report"), chores.
2.  **DATES**: Convert relative dates to **ISO 8601** (YYYY-MM-DDTHH:mm:ss). Default to 09:00:00 if time missing.
3.  **TAGGING**: You will be provided with a list of **EXISTING TAGS**. **ALWAYS** prioritize using these tags. Only create a NEW tag if the item strictly requires a category not covered by existing tags.

**PROTOCOL 2: BUDGET MANAGEMENT**
1.  **TRANSACTIONS**: Expenses (spending) or Income (earning).
2.  **CONFIGURATION**: Setting total budget limits.

**OUTPUT FORMAT**:
Reply conversationally, then append a **JSON ARRAY** wrapped in \`\`\`json \`\`\`.
Each item in the array **MUST** follow one of these schemas based on \`category\`:

**Schema A: Productivity Item**
\`\`\`json
{
  "category": "TASK", // or "EVENT", "APPOINTMENT", "REMINDER"
  "data": {
    "title": "String",
    "description": "String",
    "priority": "HIGH" | "MEDIUM" | "LOW",
    "dueDate": "ISO_STRING" | null,
    "reminderTime": "ISO_STRING" | null,
    "tags": ["String"],
    "duration": Number, // minutes
    "location": "String"
  }
}
\`\`\`

**Schema B: Financial Transaction**
\`\`\`json
{
  "category": "TRANSACTION",
  "data": {
    "description": "String",
    "amount": Number, // Positive number
    "type": "expense" | "income"
  }
}
\`\`\`

**Schema C: Budget Configuration**
\`\`\`json
{
  "category": "BUDGET_UPDATE",
  "data": {
    "limit": Number,
    "duration": "Weekly" | "Monthly" | "Yearly"
  }
}
\`\`\`
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

    const {
      message,
      history,
      mode,
      userName,
      tagsContext,
      currentDateContext
    } = await req.json()

    const genAI = new GoogleGenerativeAI(apiKey)
    let systemInstruction = "";
    let isJsonMode = false;

    // --- DETERMINE SYSTEM INSTRUCTION BASED ON MODE ---
    switch (mode) {
      case 'chat':
        systemInstruction = `${BASE_SYSTEM_INSTRUCTION}\n\nIMPORTANT: The user's name is "${userName || 'User'}". Address them by name occasionally.${tagsContext || ''}`;
        break;

      case 'enhance':
        systemInstruction = BASE_SYSTEM_INSTRUCTION + `\n\nEnsure output is strictly JSON with keys: description, subtasks (string array), priority, tags.${tagsContext || ''}`;
        isJsonMode = true;
        break;

      case 'parse':
        systemInstruction = `You are a natural language task parser. Extract structured data from the user's input.

CURRENT DATE/TIME: ${currentDateContext || new Date().toISOString()}

RULES:
1. Parse the input and extract: title, type, date, time, description, priority, duration, location
2. TYPES: APPOINTMENT (meetings with people), EVENT (parties, conferences), REMINDER (alerts), TASK (to-dos)
3. Convert relative dates (tomorrow, next week, etc.) to ISO 8601 format (YYYY-MM-DDTHH:mm:ss)
4. If no time specified but date is given, use 09:00:00
5. Infer priority from urgency words (urgent/asap = HIGH, important = MEDIUM, default = LOW)
6. Extract duration if mentioned (e.g., "1 hour meeting" = 60 minutes)
7. Extract location if mentioned

Return ONLY a JSON object (no markdown, no explanation):
{
  "title": "extracted title",
  "type": "TASK|EVENT|APPOINTMENT|REMINDER",
  "dueDate": "ISO string or null",
  "reminderTime": "ISO string or null",
  "description": "brief description or null",
  "priority": "HIGH|MEDIUM|LOW",
  "duration": number or null,
  "location": "string or null"
}`;
        isJsonMode = true;
        break;

      default:
        // Fallback or Error. For now, default to chat if history present, else enhance.
        // But stricter security would reject unknown modes.
        if (history && history.length > 0) {
           systemInstruction = BASE_SYSTEM_INSTRUCTION;
        } else {
           throw new Error("Invalid or missing 'mode' parameter.");
        }
    }

    let responseText = ""

    if (!isJsonMode && history && history.length > 0) {
      // SCENARIO A: Chat Mode (Conversational)
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
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
      // SCENARIO B: Task Mode (Strict JSON for Cmd+K or Enhance)
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        systemInstruction: systemInstruction,
        generationConfig: { responseMimeType: "application/json" }
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
