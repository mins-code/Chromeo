
import { supabase } from "./supabaseClient";
import { Task, TaskPriority, TRANSACTION_CATEGORIES, TransactionCategory } from "../types";
import { validateFile, validateAIMessage, sanitizeJSON } from "../utils/validation";
import { logger } from "../utils/logger";
import { aiCache, generateCacheKey } from "../utils/aiChatCache";

// ============ TRANSACTION CATEGORIZATION ============

// Regex patterns for local categorization fallback (saves API calls)
const CATEGORY_PATTERNS: { pattern: RegExp; category: TransactionCategory }[] = [
    // Food & Dining
    { pattern: /starbucks|mcdonald|burger|pizza|zomato|swiggy|domino|kfc|subway|cafe|restaurant|food|dining|eat|meal/i, category: 'Food & Dining' },
    // Transportation
    { pattern: /uber|ola|rapido|metro|bus|cab|taxi|fuel|petrol|diesel|parking|toll|lyft/i, category: 'Transportation' },
    // Shopping
    { pattern: /amazon|flipkart|myntra|ajio|shop|mall|store|retail|purchase|buy|order/i, category: 'Shopping' },
    // Utilities
    { pattern: /electric|water|gas|bill|recharge|mobile|airtel|jio|vodafone|wifi|internet|broadband/i, category: 'Utilities' },
    // Entertainment
    { pattern: /netflix|spotify|prime|hotstar|movie|cinema|theatre|game|play|concert|event|disney/i, category: 'Entertainment' },
    // Health
    { pattern: /hospital|doctor|medicine|pharmacy|medical|health|clinic|dental|eye|gym|fitness/i, category: 'Health' },
    // Travel
    { pattern: /flight|hotel|booking|makemytrip|goibibo|airbnb|train|irctc|trip|vacation|travel/i, category: 'Travel' },
    // Income
    { pattern: /salary|payment received|credited|deposit|refund|cashback|bonus|income/i, category: 'Income' },
];

/**
 * Categorize a transaction description using local regex fallback first,
 * then AI if no match is found.
 * 
 * @param description - The transaction description to categorize
 * @returns Promise<string> - The category name
 */
export const categorizeTransaction = async (description: string): Promise<TransactionCategory> => {
    if (!description || description.trim().length === 0) {
        return 'Uncategorized';
    }

    // 1. Try local regex patterns first (fast, no API cost)
    for (const { pattern, category } of CATEGORY_PATTERNS) {
        if (pattern.test(description)) {
            logger.info('Transaction categorized locally', { description, category });
            return category;
        }
    }

    // 2. If no local match, use AI categorization
    try {
        const cacheKey = generateCacheKey('categorize', description);
        const cached = aiCache.get<TransactionCategory>(cacheKey);
        if (cached) {
            logger.info('Transaction category cache hit', { description, category: cached });
            return cached;
        }

        const categoriesStr = TRANSACTION_CATEGORIES.filter(c => c !== 'Uncategorized').join(', ');
        const prompt = `Categorize the following transaction description into exactly one of these categories: ${categoriesStr}. Return ONLY the category name string, nothing else.

Transaction: "${description}"`;

        const { data, error } = await retryWithBackoff(() =>
            supabase.functions.invoke('ai-chat', {
                body: {
                    mode: 'chat',
                    message: prompt,
                    history: []
                }
            }),
            2 // Only 2 retries to keep it snappy
        );

        if (error) {
            logger.error('AI categorization error', error as Error, { description });
            return 'Other';
        }

        const responseText = data?.text?.trim() || '';
        
        // Validate the response is a valid category
        const validCategory = TRANSACTION_CATEGORIES.find(
            cat => cat.toLowerCase() === responseText.toLowerCase()
        );

        const finalCategory: TransactionCategory = validCategory || 'Other';
        
        // Cache for 24 hours
        aiCache.set(cacheKey, finalCategory, 86400000);
        
        logger.info('Transaction categorized by AI', { description, category: finalCategory });
        return finalCategory;

    } catch (error) {
        logger.error('Failed to categorize transaction', error as Error, { description });
        return 'Other';
    }
};

// ============ END TRANSACTION CATEGORIZATION ============


interface AIEnrichedTask {
    description: string;
    subtasks: string[];
    priority: string;
    tags: string[];
}

// Retry helper with exponential backoff
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on validation errors or auth errors
      if (error.status === 400 || error.status === 401 || error.status === 403) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, i);
      
      // Don't delay on last retry attempt
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

export const enhanceTaskWithAI = async (taskTitle: string, existingTags: string[] = []): Promise<Partial<Task> | null> => {
  try {
    // Check cache first
    const cacheKey = generateCacheKey('enhance', taskTitle, existingTags.join(','));
    const cached = aiCache.get<Partial<Task>>(cacheKey);
    if (cached) {
      logger.info('Task enhancement cache hit', { taskTitle });
      return cached;
    }

    const message = `Analyze the task "${taskTitle}". Provide a concise 1-sentence description, 3-5 actionable subtasks, a recommended priority level (LOW, MEDIUM, or HIGH), and 2 relevant tags.`;

    const { data, error } = await retryWithBackoff(() => 
      supabase.functions.invoke('ai-chat', {
        body: {
          mode: 'enhance',
          message,
          tagsContext, // Retain for backward compatibility with old edge functions
          availableTags: existingTags // New secure method
        }
      })
    );

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

    const enrichedTask = {
        description: result.description,
        subtasks: result.subtasks.map((t: string) => ({ id: crypto.randomUUID(), title: t, isCompleted: false })),
        priority: mappedPriority,
        tags: result.tags
    };

    // Cache the result for 1 hour
    aiCache.set(cacheKey, enrichedTask, 3600000);

    return enrichedTask;

  } catch (error) {
    logger.error("Failed to enhance task", error as Error, { taskTitle });
    return null;
  }
};

export const chatWithAI = async (
    message: string, 
    history: {role: 'user' | 'model', parts: [{text: string}]}[], 
    userName: string = "User", 
    existingTags: string[] = [],
    abortSignal?: AbortSignal
): Promise<string> => {
    try {
        const { data, error } = await retryWithBackoff(() => 
          supabase.functions.invoke('ai-chat', {
              body: {
                  mode: 'chat',
                  message,
                  history,
                  userName,
                  tagsContext, // Retain for backward compatibility with old edge functions
                  availableTags: existingTags // New secure method
              }
          }),
          2 // Only 2 retries for chat to keep it responsive
        );

        if (error) {
            // Provide user-friendly error messages
            const errorMsg = error.message || 'Unknown error';
            if (errorMsg.includes('timeout')) {
                throw new Error('Request timed out. Please try a shorter message.');
            } else if (errorMsg.includes('quota') || errorMsg.includes('429')) {
                throw new Error('AI service is temporarily busy. Please try again in a moment.');
            }
            throw error;
        }
        return data.text || "I'm not sure how to respond to that.";
    } catch (error: any) {
        logger.error("Chat error", error as Error, { messageLength: message?.length });
        
        // Return the error message if it's user-friendly, otherwise generic message
        if (error.message && !error.message.includes('network') && !error.message.includes('fetch')) {
            return error.message;
        }
        return "I'm having trouble connecting right now. Please check your internet connection and try again.";
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
                mimeType: file.type, // Send actual file MIME type
                message: 'Extract all transactions from this UPI screenshot.'
            }
        });

        if (error) {
            logger.error("AI Function Error", error as Error, { fileName: file.name });
            throw new Error(error.message || 'Failed to process image. Please try again.');
        }

        const text = data.text;
        if (!text) {
            throw new Error('No response received from AI. Please try a clearer image.');
        }

        // Parse JSON directly (backend uses responseMimeType: "application/json")
        const parsed = JSON.parse(text);
        
        // Ensure we return an array
        if (!Array.isArray(parsed)) {
            logger.error("Unexpected response format from AI", undefined, { parsed });
            throw new Error('Could not extract transactions from this image. Please try a different screenshot.');
        }

        if (parsed.length === 0) {
            throw new Error('No transactions found in this image. Please ensure it shows a valid UPI receipt.');
        }

        return parsed.map((item: any) => ({
            description: item.description || 'Unknown Transaction',
            amount: typeof item.amount === 'number' ? item.amount : parseFloat(item.amount) || 0,
            type: item.type === 'income' ? 'income' : 'expense',
            date: item.date || null
        }));

    } catch (error: any) {
        logger.error("Failed to parse transaction screenshot", error as Error, { fileName: file.name });
        // Re-throw with user-friendly message if it's our error, otherwise wrap it
        if (error.message && !error.message.includes('network') && !error.message.includes('fetch')) {
            throw error;
        }
        throw new Error('Failed to scan receipt. Please check your connection and try again.');
    }
};
