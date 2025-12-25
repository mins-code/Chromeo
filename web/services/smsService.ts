import { Transaction } from "../types";
import { supabase } from "./supabaseClient";

// Regex patterns for Indian Bank SMS
const REGEX_PATTERNS = {
    // Matches: INR 1,200.00 or Rs. 500 or Rs 500
    AMOUNT: /(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i,
    
    // Keywords for types
    DEBIT: /(?:debited|spent|paid|sent|purchase|dr)/i,
    CREDIT: /(?:credited|deposited|received|added|cr|salary)/i,
    
    // Attempt to find merchant/source: "at STARBUCKS" or "to AMAZON"
    MERCHANT: /(?:at|to|from)\s+([A-Za-z0-9\s\*\.\-]+?)(?:\s+on|with|using|$)/i
};

export interface ParsedSMS {
    amount: number;
    type: 'income' | 'expense';
    description: string;
    originalText: string;
}

export const parseSMS = (text: string, sender: string): ParsedSMS | null => {
    // 1. Check for Amount
    const amountMatch = text.match(REGEX_PATTERNS.AMOUNT);
    if (!amountMatch) return null;

    const amountStr = amountMatch[1].replace(/,/g, ''); // Remove commas
    const amount = parseFloat(amountStr);
    
    if (isNaN(amount) || amount === 0) return null;

    // 2. Determine Type
    let type: 'income' | 'expense' = 'expense'; // Default to expense if ambiguous but usually safe
    if (REGEX_PATTERNS.CREDIT.test(text)) {
        type = 'income';
    } else if (REGEX_PATTERNS.DEBIT.test(text)) {
        type = 'expense';
    } else {
        // If neither keyword found, it might not be a transactional SMS
        return null;
    }

    // 3. Extract Description (Merchant or Bank info)
    let description = sender; // Fallback to sender ID
    const merchantMatch = text.match(REGEX_PATTERNS.MERCHANT);
    
    if (merchantMatch && merchantMatch[1]) {
        description = merchantMatch[1].trim();
    } else {
        // Fallback: Use first few words or Sender
        description = `${type === 'income' ? 'Received from' : 'Paid to'} Unknown`;
    }

    // Clean description
    description = description.replace(/\s+/g, ' ').trim();

    return {
        amount,
        type,
        description,
        originalText: text
    };
};

export const processAndSaveSMS = async (text: string, sender: string): Promise<ParsedSMS | null> => {
    const parsed = parseSMS(text, sender);
    if (!parsed) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return parsed; // Just return parsed data if not auth, for UI display

    // Save to DB
    const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        description: parsed.description,
        amount: parsed.amount,
        type: parsed.type,
        date: new Date().toISOString()
    });

    if (error) {
        console.error("Error saving SMS transaction:", error);
    }

    return parsed;
};

// ADDED: This function was missing and causing the build error
export const listenForIncomingSMS = (callback: (sms: ParsedSMS) => void) => {
    // Placeholder for SMS listening logic (e.g., waiting for messages from Android wrapper)
    // For now, this effectively does nothing but satisfies the type checker and import.
    
    // Example implementation if you use a window event from a native wrapper:
    /*
    window.addEventListener('SMS_RECEIVED', (e: any) => {
        if (e.detail && e.detail.text) {
             const parsed = parseSMS(e.detail.text, e.detail.sender || 'Unknown');
             if (parsed) callback(parsed);
        }
    });
    */
    console.log("SMS Listener initialized");
};