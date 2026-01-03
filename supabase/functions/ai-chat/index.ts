import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.45.4"
import { GoogleGenerativeAI } from "npm:@google/generative-ai@^0.21.0"

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
4.  **RECURRENCE**: When the user asks for repeating/recurring items (e.g., "every day", "daily", "weekly", "every Monday"):
    *   Create **ONLY ONE item** with the "recurrence" field populated
    *   Do NOT create multiple separate items for each occurrence
    *   Use the recurrence schema below

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
    "location": "String",
    "recurrence": { // ONLY include for repeating items
      "frequency": "daily" | "weekly" | "monthly" | "yearly",
      "interval": Number, // e.g., 1 = every day, 2 = every other day
      "endDate": "ISO_STRING" | null // optional end date for recurrence
    } | null
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


const RECEIPT_SYSTEM_INSTRUCTION = `You are a financial transaction extractor. Analyze the provided image of a UPI payment screenshot or bank transaction receipt.

EXTRACT the following information for EACH transaction visible in the image:
- description: Brief description of the transaction (merchant name, purpose)
- amount: The transaction amount as a positive number
- type: "expense" if money was sent/paid, "income" if money was received
- date: The transaction date in ISO 8601 format (YYYY-MM-DDTHH:mm:ss) if visible, or null

RULES:
1. If multiple transactions are visible, extract ALL of them
2. If the image is not a valid transaction screenshot, return an empty array
3. Return ONLY a valid JSON array, no markdown or explanation
4. Amount should always be a positive number regardless of type

Output Format (JSON array):
[
  {
    "description": "string",
    "amount": number,
    "type": "expense" | "income",
    "date": "ISO string or null"
  }
]
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 🛡️ SECURITY: Verify Authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

    const {
      message,
      history,
      mode,
      userName,
      tagsContext,
      currentDateContext,
      image,
      mimeType
    } = await req.json()

    // Rate Limiting
    // Rate Limiting
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Identify user
    const rateLimitUserId = user ? user.id : 'anonymous'
    const rateLimitKey = `ai-chat:${rateLimitUserId}`

    const { data: limitData, error: limitError } = await supabaseAdmin
        .from('rate_limits')
        .select('*')
        .eq('key', rateLimitKey)
        .gte('window_start', new Date(Date.now() - 60 * 1000).toISOString()) // 1 minute window
        .maybeSingle()


    if (limitData && limitData.count >= 10) { // Limit: 10 requests per minute
        return new Response(
            JSON.stringify({ error: 'Too many requests. Please try again later.' }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }

    // Update rate limit
    // Update rate limit
    if (limitData) {
        await supabaseAdmin.from('rate_limits').update({ count: limitData.count + 1 }).eq('id', limitData.id)
    } else {
        await supabaseAdmin.from('rate_limits').insert({ key: rateLimitKey, count: 1, window_start: new Date().toISOString() })
    }

    // Input validation
    const MAX_MESSAGE_LENGTH = 10000;
    const MAX_FILE_SIZE = 7 * 1024 * 1024; // 7MB to account for base64 encoding overhead

    if (message && typeof message !== 'string') {
      throw new Error('Invalid message format');
    }

    if (message && message.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`);
    }

    if (image) {
      // Validate base64 image size (rough estimate: base64 is ~1.37x original size)
      const estimatedSize = (image.length * 3) / 4;
      if (estimatedSize > MAX_FILE_SIZE) {
        throw new Error('Image file size exceeds 5MB limit');
      }
    }

    if (mode && !['chat', 'enhance', 'parse', 'parse-image'].includes(mode)) {
      throw new Error('Invalid mode parameter');
    }

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

      case 'parse-image':
        systemInstruction = RECEIPT_SYSTEM_INSTRUCTION;
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
        model: "gemini-2.5-flash",
        systemInstruction: systemInstruction 
      })

      // Filter history: Gemini requires first message to be 'user', not 'model'
      // Skip any leading 'model' messages (like welcome messages)
      let filteredHistory = history.map((h: any) => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: h.parts
      }));
      
      // Find first 'user' message and start from there
      const firstUserIndex = filteredHistory.findIndex((h: any) => h.role === 'user');
      if (firstUserIndex === -1) {
        // No user messages in history, start with empty history
        filteredHistory = [];
      } else if (firstUserIndex > 0) {
        // Skip leading model messages
        filteredHistory = filteredHistory.slice(firstUserIndex);
      }

      const chat = model.startChat({
        history: filteredHistory,
      })

      const result = await chat.sendMessage(message)
      responseText = result.response.text()

    } else if (mode === 'parse-image' && image) {
      // SCENARIO B: Image Parsing Mode (Multimodal)
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: systemInstruction,
        generationConfig: { responseMimeType: "application/json" }
      })

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: mimeType || "image/png", // Use dynamic MIME type from request
            data: image
          }
        },
        { text: message || "Extract all transactions from this image." }
      ])
      responseText = result.response.text()

    } else {
      // SCENARIO C: Task Mode (Strict JSON for Cmd+K or Enhance)
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: systemInstruction,
        generationConfig: { responseMimeType: "application/json" }
      })

      const result = await model.generateContent(message)
      responseText = result.response.text()
    }

    return new Response(JSON.stringify({ text: responseText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    const error = err as any;
    console.error("AI-CHAT ERROR:", error.message, error);
    
    // Provide specific error messages for better debugging
    let errorMessage = error.message || 'An unexpected error occurred';
    let statusCode = 500;
    
    if (error.message?.includes('API key')) {
      errorMessage = 'AI service configuration error. Please contact support.';
      statusCode = 503;
    } else if (error.message?.includes('quota') || error.message?.includes('429')) {
      errorMessage = 'AI service is temporarily unavailable. Please try again in a few moments.';
      statusCode = 429;
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Request timed out. Please try a shorter message.';
      statusCode = 408;
    } else if (error.message?.includes('Invalid')) {
      errorMessage = error.message; // Keep validation errors as-is
      statusCode = 400;
    } else {
      errorMessage = 'An unexpected error occurred. Please try again.';
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      code: error.code || 'UNKNOWN_ERROR'
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
