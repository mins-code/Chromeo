/**
 * localStorage manager for AI chat conversation persistence
 * Handles saving, loading, and cleanup of chat history
 */

import { ChatMessage } from '../types';
import { logger } from './logger';

const STORAGE_KEY = 'chromedex_ai_chat_history';
const STORAGE_VERSION = 1;
const MAX_RETENTION_DAYS = 30;

interface StorageData {
  version: number;
  messages: ChatMessage[];
  lastUpdated: number;
}

/**
 * Save chat messages to localStorage
 */
export const saveChatHistory = (messages: ChatMessage[]): void => {
  try {
    const data: StorageData = {
      version: STORAGE_VERSION,
      messages,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    logger.error('Failed to save chat history', error);
    // Handle quota exceeded errors gracefully
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      // Clear old data and try again
      clearChatHistory();
      try {
        const data: StorageData = {
          version: STORAGE_VERSION,
          messages,
          lastUpdated: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (retryError) {
        logger.error('Failed to save chat history after clearing', retryError);
      }
    }
  }
};

/**
 * Load chat messages from localStorage
 * Returns null if not found or expired
 */
export const loadChatHistory = (): ChatMessage[] | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    
    if (!stored) {
      return null;
    }

    const data: StorageData = JSON.parse(stored);
    
    // Check version compatibility
    if (data.version !== STORAGE_VERSION) {
      logger.warn('Chat history version mismatch, clearing old data');
      clearChatHistory();
      return null;
    }

    // Check if data is too old
    const age = Date.now() - data.lastUpdated;
    const maxAge = MAX_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    
    if (age > maxAge) {
      logger.warn('Chat history expired, clearing old data');
      clearChatHistory();
      return null;
    }

    return data.messages;
  } catch (error) {
    logger.error('Failed to load chat history', error);
    return null;
  }
};

/**
 * Clear chat history from localStorage
 */
export const clearChatHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    logger.error('Failed to clear chat history', error);
  }
};

/**
 * Get storage statistics
 */
export const getChatStorageStats = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { messageCount: 0, sizeBytes: 0, lastUpdated: null };
    }

    const data: StorageData = JSON.parse(stored);
    return {
      messageCount: data.messages.length,
      sizeBytes: new Blob([stored]).size,
      lastUpdated: new Date(data.lastUpdated),
    };
  } catch (error) {
    logger.error('Failed to get storage stats', error);
    return { messageCount: 0, sizeBytes: 0, lastUpdated: null };
  }
};
