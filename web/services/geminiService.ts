
import { supabase } from "./supabaseClient";
import { Task, TaskPriority } from "../types";

const SYSTEM_INSTRUCTION = `You are ChronoDeX AI, an elite productivity and financial assistant.
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

interface AIEnrichedTask {
    description: string;
    subtasks: string[];
    priority: string;
    tags: string[];
}

export const enhanceTaskWithAI = async (taskTitle: string, existingTags: string[] = []): Promise<Partial<Task> | null> => {
  try {
    const tagsContext = existingTags.length > 0 
      ? `\n\nEXISTING TAGS: ${existingTags.join(', ')}. Please choose tags from this list if relevant. Only create new tags if absolutely necessary.`
      : '';

    const message = `Analyze the task "${taskTitle}". Provide a concise 1-sentence description, 3-5 actionable subtasks, a recommended priority level (LOW, MEDIUM, or HIGH), and 2 relevant tags.${tagsContext}`;

    const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
            message,
            systemInstruction: SYSTEM_INSTRUCTION + `\n\nEnsure output is strictly JSON with keys: description, subtasks (string array), priority, tags.`
        }
    });

    if (error) {
        console.error("AI Function Error:", error);
        return null;
    }
    
    const text = data.text;
    if (!text) return null;
    
    // Parse the JSON from the text response (which might contain markdown code blocks)
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/{[\s\S]*}/);
    let result: AIEnrichedTask;

    if (jsonMatch) {
         result = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } else {
         result = JSON.parse(text);
    }
    
    // Convert string priority to Enum
    let mappedPriority = TaskPriority.MEDIUM;
    if (result.priority === 'HIGH') mappedPriority = TaskPriority.HIGH;
    if (result.priority === 'LOW') mappedPriority = TaskPriority.LOW;

    return {
        description: result.description,
        subtasks: result.subtasks.map((t: string) => ({ id: crypto.randomUUID(), title: t, isCompleted: false })),
        priority: mappedPriority,
        tags: result.tags
    };

  } catch (error) {
    console.error("Failed to enhance task:", error);
    return null;
  }
};

export const chatWithAI = async (message: string, history: {role: 'user' | 'model', parts: [{text: string}]}[], userName: string = "User", existingTags: string[] = []): Promise<string> => {
    try {
        const tagsContext = existingTags.length > 0
          ? `\n\nEXISTING TAGS: ${existingTags.join(', ')}. Use these for the "tags" field in your JSON output. Do not create new tags unless the user explicitly asks or the existing ones are completely irrelevant.`
          : '';

        const dynamicInstruction = `${SYSTEM_INSTRUCTION}\n\nIMPORTANT: The user's name is "${userName}". Address them by name occasionally.${tagsContext}`;

        const { data, error } = await supabase.functions.invoke('ai-chat', {
            body: {
                message,
                history,
                userName,
                systemInstruction: dynamicInstruction
            }
        });

        if (error) throw error;
        return data.text || "I'm not sure how to respond to that.";
    } catch (error) {
        console.error("Chat error:", error);
        return "I'm having trouble connecting to the network right now.";
    }
}
