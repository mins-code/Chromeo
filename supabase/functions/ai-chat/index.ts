import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.45.4"
import { GoogleGenerativeAI } from "npm:@google/generative-ai@^0.21.0"
import { sanitizeInput, processHistory } from "./utils.ts"

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Vary': 'Origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
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

**PROTOCOL 3: ROUTINE MANAGEMENT**
Create recurring routines for activities like workouts, habits, or regular schedules.

**Schema D: Routine**
\`\`\`json
{
  "category": "ROUTINE",
  "data": {
    "name": "String",
    "description": "String",
    "pattern": {
      "type": "weekday" | "interval" | "cycle",
      "days": [0-6], // 0=Sun, 1=Mon...6=Sat. Only for type "weekday"
      "every": Number, // Every N days. Only for type "interval"
      "startDate": "ISO_STRING", // Required for "interval" and "cycle"
      "items": [{"name": "String", "color": "#HexColor"}] // Only for type "cycle", e.g. Push/Pull/Legs
    },
    "time": "HH:mm", // e.g. "07:00" for 7 AM
    "duration": Number, // minutes
    "isActive": true
  }
}
\`\`\`

**PROTOCOL 4: NOTE TAKING**
Create quick notes or checklists for the user.

**Schema E: Note**
\`\`\`json
{
  "category": "NOTE",
  "data": {
    "title": "String",
    "content": "String", // Plain text content
    "isChecklist": Boolean, // true if user wants a checklist
    "checklistItems": [{"id": "uuid", "text": "String", "isCompleted": false}] // Only if isChecklist is true
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
  // 🛡️ SECURITY: Dynamic CORS to allow only specific origins
  const origin = req.headers.get("Origin") || "";
  const allowedOrigins = [
    Deno.env.get("APP_URL"),
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ].filter(Boolean);

  // Strictly check origin. Default to first allowed if match, else null (block)
  // We default to the first allowed origin if no match found, which effectively blocks
  // the browser from reading the response if the origin doesn't match what the server sends back.
  const allowOrigin = allowedOrigins.includes(origin) ? origin : (allowedOrigins[0] || "http://localhost:3000");

  const headers = { ...corsHeaders, "Access-Control-Allow-Origin": allowOrigin };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
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
        headers: { ...headers, 'Content-Type': 'application/json' },
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
      availableTags,
      currentDateContext,
      image,
      mimeType
    } = await req.json()

    // Allow Unicode names but no newlines
    const cleanUserName = sanitizeInput(userName, 50, false) || 'User';

// 🛡️ SECURITY: Construct tags context securely on the server
    let tagInstruction = '';
    let usedSecureTags = false;

    // Prefer availableTags array if provided (New Secure Method)
    if (Array.isArray(availableTags) && availableTags.length > 0) {
       const cleanTags = availableTags
           .filter((t: any) => typeof t === 'string')
           .map((t: string) => sanitizeInput(t, 50, false)) // No newlines allowed in individual tags
           .filter((t: string) => t.length > 0); // Remove empty tags

       if (cleanTags.length > 0) {
          const tagsList = cleanTags.join(', ');
          // We will append the specific instruction in the switch case
          tagInstruction = `\n\nEXISTING TAGS: ${tagsList}.`;
          usedSecureTags = true;
       }
    }

    // Fallback to legacy tagsContext (Legacy Method)
    if (!usedSecureTags && tagsContext) {
       // 🛡️ SECURITY: Force 'allowNewlines: false' to prevent prompt injection via newlines
       // This neutralizes attacks like "\n\nIGNORE PREVIOUS INSTRUCTIONS"
       tagInstruction = sanitizeInput(tagsContext, 1000, false);
    }

    // Rate Limiting
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Identify user
    const rateLimitUserId = user ? user.id : 'anonymous'
    const rateLimitKey = `ai-chat:${rateLimitUserId}`
    const WINDOW_DURATION = 60; // 1 minute
    const MAX_REQUESTS = 10;

    // 🛡️ SECURITY: Use atomic RPC to prevent race conditions (TOCTOU)
    const { data: currentCount, error: limitError } = await supabaseAdmin
      .rpc('increment_rate_limit', {
        p_key: rateLimitKey,
        p_window_duration_seconds: WINDOW_DURATION
      });

    if (limitError) {
        console.error("Rate limit check failed:", limitError.message);
        // Fail securely: if rate limiting is unavailable, prevent potential abuse of expensive API
        return new Response(
            JSON.stringify({ error: 'Service temporarily unavailable. Please try again later.' }),
            { status: 503, headers: { ...headers, "Content-Type": "application/json" } }
        )
    }

    if (typeof currentCount === 'number' && currentCount > MAX_REQUESTS) {
        return new Response(
            JSON.stringify({ error: 'Too many requests. Please try again later.' }),
            { status: 429, headers: { ...headers, "Content-Type": "application/json" } }
        )
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

    // 🛡️ SECURITY: Sanitize the main message input to prevent prompt injection and control character attacks
    // We allow newlines because chat messages and task descriptions often contain them.
    // However, sanitizeInput() still strips other control characters and normalizes quotes.
    const cleanMessage = message ? sanitizeInput(message, MAX_MESSAGE_LENGTH, true) : "";

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
        {
          let finalInstruction = tagInstruction;
          if (usedSecureTags) {
             finalInstruction += ' Use these for the "tags" field in your JSON output. Do not create new tags unless the user explicitly asks or the existing ones are completely irrelevant.';
          }
          systemInstruction = `${BASE_SYSTEM_INSTRUCTION}\n\nIMPORTANT: The user's name is "${cleanUserName}". Address them by name occasionally.${finalInstruction || ''}`;
        }
        break;

      case 'enhance':
        {
          let finalInstruction = tagInstruction;
          if (usedSecureTags) {
             finalInstruction += ' Please choose tags from this list if relevant. Only create new tags if absolutely necessary.';
          }
          systemInstruction = BASE_SYSTEM_INSTRUCTION + `\n\nEnsure output is strictly JSON with keys: description, subtasks (string array), priority, tags.${finalInstruction || ''}`;
        }
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

      // 🛡️ SECURITY: Process history securely (sanitization & role filtering)
      const filteredHistory = processHistory(history);

      const chat = model.startChat({
        history: filteredHistory,
      })

      const result = await chat.sendMessage(cleanMessage)
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
        { text: cleanMessage || "Extract all transactions from this image." }
      ])
      responseText = result.response.text()

    } else {
      // SCENARIO C: Task Mode (Strict JSON for Cmd+K or Enhance)
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: systemInstruction,
        generationConfig: { responseMimeType: "application/json" }
      })

      const result = await model.generateContent(cleanMessage)
      responseText = result.response.text()
    }

    return new Response(JSON.stringify({ text: responseText }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    const error = err as any;
    // 🛡️ SECURITY: Log error message but avoid logging full objects if they might contain secrets
    console.error("AI-CHAT ERROR:", error.message);
    if (error.stack) {
        console.error(error.stack);
    }
    
    // Provide specific error messages for better debugging
    let errorMessage = error.message || 'An unexpected error occurred';
    let statusCode = 500;
    
    if (error.message?.includes('API key')) {
      // Don't leak exact API key details, but acknowledge it's a config issue
      errorMessage = 'AI service configuration error.';
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
      // Generic error for unknown internal issues to prevent leakage
      errorMessage = 'An unexpected error occurred. Please try again.';
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      code: error.code || 'UNKNOWN_ERROR'
    }), {
      status: statusCode,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }
})
