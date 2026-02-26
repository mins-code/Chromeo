// 🛡️ SECURITY: Sanitize Inputs (Prevent Prompt Injection)
export const sanitizeInput = (input: any, maxLength: number = 100, allowNewlines: boolean = false): string => {
  if (!input || typeof input !== 'string') return '';

  // Remove potentially dangerous control characters
  let sanitized = input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

  // Escape backslashes to prevent escape sequence attacks (e.g. escaping the quote that encloses this string)
  // This neutralizes attacks like: myname\" -> "myname\"" which might confuse the LLM parser
  sanitized = sanitized.replace(/\\/g, '\\\\');

  // Replace quotes and backticks to prevent string breakouts
  sanitized = sanitized.replace(/["`]/g, "'");

  if (!allowNewlines) {
    sanitized = sanitized.replace(/[\r\n]+/g, ' ');
  }

  return sanitized.substring(0, maxLength);
};

export const processHistory = (history: any[], maxLength: number = 10000) => {
  if (!Array.isArray(history)) return [];

  // Filter history: Gemini requires first message to be 'user', not 'model'
  // Skip any leading 'model' messages (like welcome messages)
  // 🛡️ SECURITY: Sanitize history parts to prevent prompt injection via conversation history
  let filteredHistory = history.map((h: any) => ({
    role: h.role === 'model' ? 'model' : 'user',
    parts: Array.isArray(h.parts) ? h.parts.map((p: any) => {
        // Sanitize text parts using strict rules but allowing newlines
        if (p.text && typeof p.text === 'string') {
            return { ...p, text: sanitizeInput(p.text, maxLength, true) };
        }
        // Preserve non-text parts (like inlineData) as they are structured
        return p;
    }) : []
  }));

  // Find first 'user' message and start from there
  const firstUserIndex = filteredHistory.findIndex((h: any) => h.role === 'user');
  if (firstUserIndex === -1) {
    // No user messages in history, return empty history
    return [];
  } else if (firstUserIndex > 0) {
    // Skip leading model messages
    return filteredHistory.slice(firstUserIndex);
  }

  return filteredHistory;
};
