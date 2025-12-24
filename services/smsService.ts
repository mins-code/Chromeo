
import { Transaction } from "../types";

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
