import { describe, it, expect } from 'vitest';
import { ConversationError, AIClientError } from '../../../src/types/index.js';

describe('ConversationError', () => {
  it('should create error with message and code', () => {
    const error = new ConversationError('Test error message', 'TEST_ERROR');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ConversationError);
    expect(error.message).toBe('Test error message');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.name).toBe('ConversationError');
  });

  it('should create error with message, code, and details', () => {
    const details = { userId: 123, action: 'test' };
    const error = new ConversationError('Test error', 'TEST_ERROR', details);

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.details).toEqual(details);
  });

  it('should create error without details', () => {
    const error = new ConversationError('Test error', 'TEST_ERROR');

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.details).toBeUndefined();
  });

  it('should be throwable and catchable', () => {
    expect(() => {
      throw new ConversationError('Test error', 'TEST_ERROR');
    }).toThrow('Test error');

    try {
      throw new ConversationError('Test error', 'TEST_ERROR');
    } catch (error) {
      expect(error).toBeInstanceOf(ConversationError);
      expect((error as ConversationError).code).toBe('TEST_ERROR');
    }
  });

  it('should include error code in instanceof checks', () => {
    const error = new ConversationError('Test error', 'TEST_ERROR');

    expect(error instanceof Error).toBe(true);
    expect(error instanceof ConversationError).toBe(true);
  });

  it('should have correct prototype chain', () => {
    const error = new ConversationError('Test error', 'TEST_ERROR');

    expect(Object.getPrototypeOf(error)).toBe(ConversationError.prototype);
    expect(Object.getPrototypeOf(Object.getPrototypeOf(error))).toBe(Error.prototype);
  });

  it('should preserve stack trace', () => {
    const error = new ConversationError('Test error', 'TEST_ERROR');
    
    expect(error.stack).toBeDefined();
    expect(typeof error.stack).toBe('string');
    expect(error.stack).toContain('ConversationError');
  });
});

describe('AIClientError', () => {
  it('should create error with message only', () => {
    const error = new AIClientError('AI service error');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AIClientError);
    expect(error.message).toBe('AI service error');
    expect(error.name).toBe('AIClientError');
    expect(error.statusCode).toBeUndefined();
    expect(error.details).toBeUndefined();
  });

  it('should create error with message and status code', () => {
    const error = new AIClientError('Service unavailable', 503);

    expect(error.message).toBe('Service unavailable');
    expect(error.statusCode).toBe(503);
    expect(error.details).toBeUndefined();
  });

  it('should create error with message, status code, and details', () => {
    const details = { endpoint: '/api/chat', retries: 3 };
    const error = new AIClientError('Request failed', 500, details);

    expect(error.message).toBe('Request failed');
    expect(error.statusCode).toBe(500);
    expect(error.details).toEqual(details);
  });

  it('should create error with message and details but no status code', () => {
    const details = { originalError: 'Connection timeout' };
    const error = new AIClientError('Network error', undefined, details);

    expect(error.message).toBe('Network error');
    expect(error.statusCode).toBeUndefined();
    expect(error.details).toEqual(details);
  });

  it('should be throwable and catchable', () => {
    expect(() => {
      throw new AIClientError('AI error');
    }).toThrow('AI error');

    try {
      throw new AIClientError('AI error', 500);
    } catch (error) {
      expect(error).toBeInstanceOf(AIClientError);
      expect((error as AIClientError).statusCode).toBe(500);
    }
  });

  it('should include status code in instanceof checks', () => {
    const error = new AIClientError('Test error', 404);

    expect(error instanceof Error).toBe(true);
    expect(error instanceof AIClientError).toBe(true);
  });

  it('should have correct prototype chain', () => {
    const error = new AIClientError('Test error');

    expect(Object.getPrototypeOf(error)).toBe(AIClientError.prototype);
    expect(Object.getPrototypeOf(Object.getPrototypeOf(error))).toBe(Error.prototype);
  });

  it('should preserve stack trace', () => {
    const error = new AIClientError('Test error');
    
    expect(error.stack).toBeDefined();
    expect(typeof error.stack).toBe('string');
    expect(error.stack).toContain('AIClientError');
  });

  it('should handle various HTTP status codes', () => {
    const statusCodes = [400, 401, 403, 404, 429, 500, 502, 503, 504];

    statusCodes.forEach(code => {
      const error = new AIClientError(`HTTP ${code} error`, code);
      expect(error.statusCode).toBe(code);
    });
  });
});

describe('Error type differentiation', () => {
  it('should differentiate between ConversationError and AIClientError', () => {
    const conversationError = new ConversationError('Conv error', 'CONV_ERROR');
    const aiError = new AIClientError('AI error', 500);

    expect(conversationError instanceof ConversationError).toBe(true);
    expect(conversationError instanceof AIClientError).toBe(false);
    
    expect(aiError instanceof AIClientError).toBe(true);
    expect(aiError instanceof ConversationError).toBe(false);

    expect(conversationError instanceof Error).toBe(true);
    expect(aiError instanceof Error).toBe(true);
  });

  it('should allow error-specific property access', () => {
    const conversationError = new ConversationError('Conv error', 'CONV_ERROR', { test: true });
    const aiError = new AIClientError('AI error', 404, { endpoint: '/test' });

    // ConversationError specific properties
    expect(conversationError.code).toBe('CONV_ERROR');
    expect(conversationError.details?.test).toBe(true);

    // AIClientError specific properties
    expect(aiError.statusCode).toBe(404);
    expect(aiError.details?.endpoint).toBe('/test');
  });

  it('should be usable in catch blocks with type guards', () => {
    function throwConversationError() {
      throw new ConversationError('Conversation failed', 'CONV_FAILED');
    }

    function throwAIError() {
      throw new AIClientError('AI failed', 500);
    }

    try {
      throwConversationError();
    } catch (error) {
      if (error instanceof ConversationError) {
        expect(error.code).toBe('CONV_FAILED');
      }
    }

    try {
      throwAIError();
    } catch (error) {
      if (error instanceof AIClientError) {
        expect(error.statusCode).toBe(500);
      }
    }
  });
}); 