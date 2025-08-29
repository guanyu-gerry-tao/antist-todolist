/**
 * Utility functions for the AI service
 */

// Generate unique IDs
const generateId = (prefix = 'id') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Clean and sanitize text input
const sanitizeText = (text) => {
  if (typeof text !== 'string') return '';
  return text.trim().replace(/\s+/g, ' ').substring(0, 1000);
};

// Validate OpenAI API key format
const validateApiKey = (apiKey) => {
  return apiKey && typeof apiKey === 'string' && apiKey.startsWith('sk-');
};

// Format duration strings consistently
const normalizeDuration = (duration) => {
  if (!duration) return 'Unknown';
  
  const lowerDuration = duration.toLowerCase().trim();
  
  // Common duration patterns
  const patterns = {
    'minutes': /(\d+)\s*(min|minute|minutes)/,
    'hours': /(\d+)\s*(hr|hour|hours)/,
    'days': /(\d+)\s*(day|days)/,
    'weeks': /(\d+)\s*(week|weeks)/
  };
  
  for (const [unit, pattern] of Object.entries(patterns)) {
    const match = lowerDuration.match(pattern);
    if (match) {
      const num = parseInt(match[1]);
      const singularUnit = unit.slice(0, -1); // remove 's'
      return `${num} ${num === 1 ? singularUnit : unit}`;
    }
  }
  
  return duration;
};

// Extract and clean tags from text
const extractTags = (text, maxTags = 5) => {
  if (!text) return [];
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
  
  // Remove common stop words
  const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'way', 'she', 'use', 'what', 'said', 'each', 'make', 'most', 'over', 'such', 'time', 'very', 'when', 'have', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'than', 'them', 'well', 'were']);
  
  const meaningfulWords = words.filter(word => !stopWords.has(word));
  
  // Get most frequent words as tags
  const wordCount = {};
  meaningfulWords.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  return Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, maxTags)
    .map(([word]) => word);
};

// Validate task object structure
const validateTaskStructure = (task) => {
  const requiredFields = ['title', 'description', 'priority'];
  const missingFields = requiredFields.filter(field => !task[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
  
  const validPriorities = ['low', 'medium', 'high'];
  if (!validPriorities.includes(task.priority)) {
    throw new Error(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
  }
  
  return true;
};

// Memory cleanup utility
const cleanupOldMemories = (memoriesMap, maxAge = 30 * 60 * 1000) => {
  const now = Date.now();
  const toDelete = [];
  
  for (const [sessionId, memory] of memoriesMap.entries()) {
    if (memory.lastAccessed && (now - memory.lastAccessed) > maxAge) {
      toDelete.push(sessionId);
    }
  }
  
  toDelete.forEach(sessionId => memoriesMap.delete(sessionId));
  return toDelete.length;
};

// Rate limiting utility
class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }
  
  isAllowed(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }
    
    const userRequests = this.requests.get(identifier);
    
    // Remove old requests outside the window
    const recentRequests = userRequests.filter(timestamp => timestamp > windowStart);
    this.requests.set(identifier, recentRequests);
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    return true;
  }
  
  getRemainingRequests(identifier) {
    const userRequests = this.requests.get(identifier) || [];
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const recentRequests = userRequests.filter(timestamp => timestamp > windowStart);
    
    return Math.max(0, this.maxRequests - recentRequests.length);
  }
}

module.exports = {
  generateId,
  sanitizeText,
  validateApiKey,
  normalizeDuration,
  extractTags,
  validateTaskStructure,
  cleanupOldMemories,
  RateLimiter
};
