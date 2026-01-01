
import { supabase } from "./supabaseClient";
import { Task, TaskPriority } from "../types";
import { validateFile, validateAIMessage, sanitizeJSON } from "../utils/validation";
import { logger } from "../utils/logger";

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

    const message = `Analyze the task "${taskTitle}". Provide a concise 1-sentence description, 3-5 actionable subtasks, a recommended priority level (LOW, MEDIUM, or HIGH), and 2 relevant tags.`;

    const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
            mode: 'enhance',
            message,
            tagsContext
        }
    });

    if (error) {
        logger.error("AI Function Error", error as Error, { taskTitle });
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
    logger.error("Failed to enhance task", error as Error, { taskTitle });
    return null;
  }
};

export const chatWithAI = async (message: string, history: {role: 'user' | 'model', parts: [{text: string}]}[], userName: string = "User", existingTags: string[] = []): Promise<string> => {
    try {
        const tagsContext = existingTags.length > 0
          ? `\n\nEXISTING TAGS: ${existingTags.join(', ')}. Use these for the "tags" field in your JSON output. Do not create new tags unless the user explicitly asks or the existing ones are completely irrelevant.`
          : '';

        const { data, error } = await supabase.functions.invoke('ai-chat', {
            body: {
                mode: 'chat',
                message,
                history,
                userName,
                tagsContext
            }
        });

        if (error) throw error;
        return data.text || "I'm not sure how to respond to that.";
    } catch (error) {
        logger.error("Chat error", error as Error, { messageLength: message?.length });
        return "I'm having trouble connecting to the network right now.";
    }
}

// Natural Language Task Parsing for Quick-Add (Cmd+K)
export interface ParsedTaskData {
    title: string;
    type: 'TASK' | 'EVENT' | 'APPOINTMENT' | 'REMINDER';
    dueDate?: string;
    reminderTime?: string;
    description?: string;
    priority?: 'HIGH' | 'MEDIUM' | 'LOW';
    duration?: number;
    location?: string;
}

export const parseNaturalLanguageTask = async (input: string): Promise<ParsedTaskData | null> => {
    try {
        const today = new Date();
        const currentDateStr = today.toISOString().split('T')[0];
        const currentTimeStr = today.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        const currentDateContext = `${currentDateStr} ${currentTimeStr}`;

        const { data, error } = await supabase.functions.invoke('ai-chat', {
            body: {
                mode: 'parse',
                message: input,
                currentDateContext
            }
        });

        if (error) {
            logger.error("AI Parse Error", error as Error, { input });
            return null;
        }

        const text = data.text;
        if (!text) return null;

        // Parse JSON from response (handle potential markdown wrapping)
        let jsonStr = text;
        const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        }

        const parsed = JSON.parse(jsonStr.trim());
        
        return {
            title: parsed.title || input,
            type: parsed.type || 'TASK',
            dueDate: parsed.dueDate || undefined,
            reminderTime: parsed.reminderTime || undefined,
            description: parsed.description || undefined,
            priority: parsed.priority || 'MEDIUM',
            duration: parsed.duration || undefined,
            location: parsed.location || undefined
        };
    } catch (error) {
        logger.error("Failed to parse natural language task", error as Error, { input });
        // Return a basic fallback with just the title
        return {
            title: input,
            type: 'TASK',
            priority: 'MEDIUM'
        };
    }
};

// Scanned Transaction Interface
export interface ScannedTransaction {
    description: string;
    amount: number;
    type: 'income' | 'expense';
    date: string | null;
}

// Parse UPI Transaction Screenshot
export const parseTransactionScreenshot = async (file: File): Promise<ScannedTransaction[]> => {
    try {
        // Validate file before processing
        const validation = validateFile(file);
        if (!validation.valid) {
            logger.warn("File validation failed", { error: validation.error });
            throw new Error(validation.error);
        }

        // Convert file to Base64
        const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                // Strip the data URL prefix (e.g., "data:image/png;base64,")
                const base64Data = result.split(',')[1];
                resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        const { data, error } = await supabase.functions.invoke('ai-chat', {
            body: {
                mode: 'parse-image',
                image: base64,
                message: 'Extract all transactions from this UPI screenshot.'
            }
        });

        if (error) {
            logger.error("AI Function Error", error as Error, { fileName: file.name });
            return [];
        }

        const text = data.text;
        if (!text) return [];

        // Parse JSON from response (handle potential markdown wrapping)
        let jsonStr = text;
        const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        }

        const parsed = JSON.parse(jsonStr.trim());
        
        // Ensure we return an array
        if (!Array.isArray(parsed)) {
            logger.error("Unexpected response format from AI", undefined, { parsed });
            return [];
        }

        return parsed.map((item: any) => ({
            description: item.description || 'Unknown Transaction',
            amount: typeof item.amount === 'number' ? item.amount : parseFloat(item.amount) || 0,
            type: item.type === 'income' ? 'income' : 'expense',
            date: item.date || null
        }));

    } catch (error) {
        logger.error("Failed to parse transaction screenshot", error as Error, { fileName: file.name });
        return [];
    }
};
