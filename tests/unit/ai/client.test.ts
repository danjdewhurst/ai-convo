import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaClient } from '../../../src/ai/client.js';
import { AIClientError } from '../../../src/types/index.js';

// Mock the Ollama module
vi.mock('ollama', () => ({
  Ollama: vi.fn().mockImplementation(() => ({
    chat: vi.fn(),
    list: vi.fn(),
  })),
}));

// Mock the logger
vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('OllamaClient', () => {
  let client: OllamaClient;
  let mockOllama: any;

  beforeEach(async () => {
    const { Ollama } = await import('ollama');
    mockOllama = {
      chat: vi.fn(),
      list: vi.fn(),
    };
    (Ollama as any).mockImplementation(() => mockOllama);

    client = new OllamaClient({
      model: 'test-model',
      baseUrl: 'http://localhost:11434',
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should create client with default options', () => {
      const defaultClient = new OllamaClient({ model: 'test-model' });
      expect(defaultClient).toBeDefined();
      expect(defaultClient.getModelName()).toBe('test-model');
    });

    it('should create client with custom options', () => {
      const customClient = new OllamaClient({
        model: 'custom-model',
        baseUrl: 'http://custom-url:11434',
        temperature: 0.8,
        maxTokens: 4000,
      });

      expect(customClient).toBeDefined();
      expect(customClient.getModelName()).toBe('custom-model');
    });

    it('should merge options with defaults', () => {
      const clientWithPartialOptions = new OllamaClient({
        model: 'test-model',
        temperature: 0.9,
      });

      expect(clientWithPartialOptions).toBeDefined();
      expect(clientWithPartialOptions.getModelName()).toBe('test-model');
    });
  });

  describe('generateResponse', () => {
    it('should generate response successfully', async () => {
      const mockResponse = {
        message: {
          content: 'Test response content',
        },
        eval_count: 150,
      };

      mockOllama.chat.mockResolvedValue(mockResponse);

      const result = await client.generateResponse('Test prompt');

      expect(result).toEqual({
        content: 'Test response content',
        model: 'test-model',
        timestamp: expect.any(Date),
        tokensUsed: 150,
      });

      expect(mockOllama.chat).toHaveBeenCalledWith({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Test prompt' }],
        options: {
          temperature: 0.7,
          num_predict: 2000,
        },
      });
    });

    it('should generate response with system prompt', async () => {
      const mockResponse = {
        message: {
          content: 'Response with system prompt',
        },
      };

      mockOllama.chat.mockResolvedValue(mockResponse);

      await client.generateResponse('User prompt', 'System prompt');

      expect(mockOllama.chat).toHaveBeenCalledWith({
        model: 'test-model',
        messages: [
          { role: 'system', content: 'System prompt' },
          { role: 'user', content: 'User prompt' },
        ],
        options: {
          temperature: 0.7,
          num_predict: 2000,
        },
      });
    });

    it('should generate response with context', async () => {
      const mockResponse = {
        message: {
          content: 'Response with context',
        },
      };

      mockOllama.chat.mockResolvedValue(mockResponse);

      const context = ['Previous message 1', 'Previous message 2'];
      await client.generateResponse('User prompt', undefined, context);

      expect(mockOllama.chat).toHaveBeenCalledWith({
        model: 'test-model',
        messages: [
          { role: 'user', content: 'Previous message 1' },
          { role: 'assistant', content: 'Previous message 2' },
          { role: 'user', content: 'User prompt' },
        ],
        options: {
          temperature: 0.7,
          num_predict: 2000,
        },
      });
    });

    it('should generate response with system prompt and context', async () => {
      const mockResponse = {
        message: {
          content: 'Response with everything',
        },
      };

      mockOllama.chat.mockResolvedValue(mockResponse);

      const context = ['Context message'];
      await client.generateResponse('User prompt', 'System prompt', context);

      expect(mockOllama.chat).toHaveBeenCalledWith({
        model: 'test-model',
        messages: [
          { role: 'system', content: 'System prompt' },
          { role: 'user', content: 'Context message' },
          { role: 'user', content: 'User prompt' },
        ],
        options: {
          temperature: 0.7,
          num_predict: 2000,
        },
      });
    });

    it('should handle response without token count', async () => {
      const mockResponse = {
        message: {
          content: 'Response without tokens',
        },
        // No eval_count
      };

      mockOllama.chat.mockResolvedValue(mockResponse);

      const result = await client.generateResponse('Test prompt');

      expect(result).toEqual({
        content: 'Response without tokens',
        model: 'test-model',
        timestamp: expect.any(Date),
        // Should not include tokensUsed
      });
    });

    it('should trim response content', async () => {
      const mockResponse = {
        message: {
          content: '  Response with whitespace  \n',
        },
      };

      mockOllama.chat.mockResolvedValue(mockResponse);

      const result = await client.generateResponse('Test prompt');

      expect(result.content).toBe('Response with whitespace');
    });

    it('should throw AIClientError on failure', async () => {
      const error = new Error('Ollama connection failed');
      mockOllama.chat.mockRejectedValue(error);

      await expect(client.generateResponse('Test prompt')).rejects.toThrow(
        AIClientError
      );

      await expect(client.generateResponse('Test prompt')).rejects.toThrow(
        'Failed to generate response: Ollama connection failed'
      );
    });

    it('should throw AIClientError on unknown error', async () => {
      mockOllama.chat.mockRejectedValue('Unknown error string');

      await expect(client.generateResponse('Test prompt')).rejects.toThrow(
        AIClientError
      );

      await expect(client.generateResponse('Test prompt')).rejects.toThrow(
        'Unknown error occurred while generating response'
      );
    });
  });

  describe('checkConnection', () => {
    it('should return true when connection is successful and model exists', async () => {
      mockOllama.list.mockResolvedValue({
        models: [
          { name: 'test-model' },
          { name: 'other-model' },
        ],
      });

      const result = await client.checkConnection();

      expect(result).toBe(true);
      expect(mockOllama.list).toHaveBeenCalled();
    });

    it('should return false when model does not exist', async () => {
      mockOllama.list.mockResolvedValue({
        models: [
          { name: 'other-model' },
          { name: 'another-model' },
        ],
      });

      const result = await client.checkConnection();

      expect(result).toBe(false);
    });

    it('should return false when connection fails', async () => {
      mockOllama.list.mockRejectedValue(new Error('Connection failed'));

      const result = await client.checkConnection();

      expect(result).toBe(false);
    });

    it('should return false when no models are available', async () => {
      mockOllama.list.mockResolvedValue({
        models: [],
      });

      const result = await client.checkConnection();

      expect(result).toBe(false);
    });
  });

  describe('listAvailableModels', () => {
    it('should return list of model names', async () => {
      mockOllama.list.mockResolvedValue({
        models: [
          { name: 'model1' },
          { name: 'model2' },
          { name: 'model3' },
        ],
      });

      const result = await client.listAvailableModels();

      expect(result).toEqual(['model1', 'model2', 'model3']);
    });

    it('should return empty array when no models available', async () => {
      mockOllama.list.mockResolvedValue({
        models: [],
      });

      const result = await client.listAvailableModels();

      expect(result).toEqual([]);
    });

    it('should throw AIClientError on failure', async () => {
      mockOllama.list.mockRejectedValue(new Error('Failed to list models'));

      await expect(client.listAvailableModels()).rejects.toThrow(AIClientError);
      await expect(client.listAvailableModels()).rejects.toThrow(
        'Failed to retrieve available models'
      );
    });
  });

  describe('getModelName', () => {
    it('should return the current model name', () => {
      expect(client.getModelName()).toBe('test-model');
    });
  });

  describe('updateOptions', () => {
    it('should update client options', () => {
      client.updateOptions({
        temperature: 0.9,
        maxTokens: 4000,
      });

      // Test that the options are updated by checking behavior
      expect(client.getModelName()).toBe('test-model'); // Should remain the same
    });

    it('should update model name', () => {
      client.updateOptions({
        model: 'new-model',
      });

      expect(client.getModelName()).toBe('new-model');
    });

    it('should merge with existing options', () => {
      client.updateOptions({
        temperature: 0.5,
      });

      // Original model should remain
      expect(client.getModelName()).toBe('test-model');
    });
  });

  describe('buildMessages', () => {
    it('should build messages correctly with empty context', async () => {
      const mockResponse = {
        message: { content: 'test' },
      };
      mockOllama.chat.mockResolvedValue(mockResponse);

      await client.generateResponse('Test prompt');

      expect(mockOllama.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content: 'Test prompt' }],
        })
      );
    });

    it('should alternate context message roles', async () => {
      const mockResponse = {
        message: { content: 'test' },
      };
      mockOllama.chat.mockResolvedValue(mockResponse);

      const context = ['Message 1', 'Message 2', 'Message 3'];
      await client.generateResponse('User prompt', undefined, context);

      expect(mockOllama.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'user', content: 'Message 1' },
            { role: 'assistant', content: 'Message 2' },
            { role: 'user', content: 'Message 3' },
            { role: 'user', content: 'User prompt' },
          ],
        })
      );
    });
  });
}); 