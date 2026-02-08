/**
 * Centralized validation utilities for input sanitization and validation
 * Prevents XSS, validates data types, and ensures data integrity
 */

// Constants for validation rules
export const VALIDATION_RULES = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_MESSAGE_LENGTH: 10000,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  MIN_BUDGET_AMOUNT: 0,
  MAX_BUDGET_AMOUNT: 1000000000, // 1 billion
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Validate and sanitize email address
 */
export function validateEmail(email: string): { valid: boolean; sanitized: string; error?: string } {
  const sanitized = sanitizeString(email).toLowerCase();
  
  if (!sanitized) {
    return { valid: false, sanitized: '', error: 'Email is required' };
  }
  
  if (!VALIDATION_RULES.EMAIL_REGEX.test(sanitized)) {
    return { valid: false, sanitized, error: 'Invalid email format' };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate and truncate text input
 */
export function validateText(
  text: string,
  maxLength: number = VALIDATION_RULES.MAX_DESCRIPTION_LENGTH,
  fieldName: string = 'Text'
): { valid: boolean; sanitized: string; error?: string } {
  if (typeof text !== 'string') {
    return { valid: false, sanitized: '', error: `${fieldName} must be a string` };
  }
  
  const sanitized = sanitizeString(text);
  
  if (sanitized.length > maxLength) {
    return {
      valid: false,
      sanitized: sanitized.substring(0, maxLength),
      error: `${fieldName} exceeds maximum length of ${maxLength} characters`,
    };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate number within range
 */
export function validateNumber(
  value: number,
  min: number = Number.MIN_SAFE_INTEGER,
  max: number = Number.MAX_SAFE_INTEGER,
  fieldName: string = 'Number'
): { valid: boolean; value: number; error?: string } {
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, value: 0, error: `${fieldName} must be a valid number` };
  }
  
  if (value < min) {
    return { valid: false, value, error: `${fieldName} must be at least ${min}` };
  }
  
  if (value > max) {
    return { valid: false, value, error: `${fieldName} must not exceed ${max}` };
  }
  
  return { valid: true, value };
}

/**
 * Validate budget amount
 */
export function validateBudgetAmount(amount: number): { valid: boolean; value: number; error?: string } {
  return validateNumber(
    amount,
    VALIDATION_RULES.MIN_BUDGET_AMOUNT,
    VALIDATION_RULES.MAX_BUDGET_AMOUNT,
    'Budget amount'
  );
}

/**
 * Validate date string
 */
export function validateDate(dateString: string): { valid: boolean; date: Date | null; error?: string } {
  if (!dateString) {
    return { valid: false, date: null, error: 'Date is required' };
  }
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return { valid: false, date: null, error: 'Invalid date format' };
  }
  
  // Check if date is reasonable (not too far in past or future)
  const minDate = new Date('1900-01-01');
  const maxDate = new Date('2100-12-31');
  
  if (date < minDate || date > maxDate) {
    return { valid: false, date: null, error: 'Date must be between 1900 and 2100' };
  }
  
  return { valid: true, date };
}

/**
 * Validate file upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  // Check file size
  if (file.size > VALIDATION_RULES.MAX_FILE_SIZE) {
    const maxSizeMB = VALIDATION_RULES.MAX_FILE_SIZE / (1024 * 1024);
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }
  
  // Check file type
  if (!VALIDATION_RULES.ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${VALIDATION_RULES.ALLOWED_IMAGE_TYPES.join(', ')}`,
    };
  }
  
  return { valid: true };
}

/**
 * Validate task title
 */
export function validateTaskTitle(title: string): { valid: boolean; sanitized: string; error?: string } {
  return validateText(title, VALIDATION_RULES.MAX_TITLE_LENGTH, 'Task title');
}

/**
 * Validate task description
 */
export function validateTaskDescription(description: string): { valid: boolean; sanitized: string; error?: string } {
  return validateText(description, VALIDATION_RULES.MAX_DESCRIPTION_LENGTH, 'Task description');
}

/**
 * Validate AI message input
 */
export function validateAIMessage(message: string): { valid: boolean; sanitized: string; error?: string } {
  return validateText(message, VALIDATION_RULES.MAX_MESSAGE_LENGTH, 'Message');
}

/**
 * Sanitize JSON string to prevent injection
 */
export function sanitizeJSON(jsonString: string): string {
  try {
    // Parse and re-stringify to ensure valid JSON
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed);
  } catch {
    return '{}';
  }
}

/**
 * Validate and sanitize URL
 */
export function validateURL(url: string): { valid: boolean; sanitized: string; error?: string } {
  const sanitized = sanitizeString(url);
  
  try {
    const urlObj = new URL(sanitized);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, sanitized, error: 'Only HTTP and HTTPS URLs are allowed' };
    }
    
    return { valid: true, sanitized: urlObj.toString() };
  } catch {
    return { valid: false, sanitized, error: 'Invalid URL format' };
  }
}

/**
 * Sanitize input for use in AI prompts to prevent injection
 * Removes potential breakout characters and control codes
 */
export function sanitizeForPrompt(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') return '';

  let sanitized = input.trim();

  // Remove control characters
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

  // Escape backslashes
  sanitized = sanitized.replace(/\\/g, '\\\\');

  // Replace quotes and backticks with single quotes to prevent breaking out of "..." or `...`
  sanitized = sanitized.replace(/["`]/g, "'");

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}
