import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { ConversationHistoryManager } from '../../../src/conversation/history.js';
import type { ConversationMessage } from '../../../src/types/index.js';

// Mock the logger
vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ConversationHistoryManager', () => {
  let historyManager: ConversationHistoryManager;
  let mockDate: Date;

  beforeAll(() => {
    // Mock Date to have predictable timestamps
    mockDate = new Date('2024-01-01T12:00:00Z');
    vi.setSystemTime(mockDate);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    historyManager = new ConversationHistoryManager('Test Topic', 100, 10);
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const defaultManager = new ConversationHistoryManager();
      const history = defaultManager.getConversationHistory();

      expect(history.messages).toEqual([]);
      expect(history.startTime).toBeInstanceOf(Date);
      expect(history.totalMessages).toBe(0);
      expect(history.topic).toBeUndefined();
    });

    it('should initialize with provided topic', () => {
      const manager = new ConversationHistoryManager('Custom Topic');
      const history = manager.getConversationHistory();

      expect(history.topic).toBe('Custom Topic');
    });

    it('should set max messages and context window', () => {
      const manager = new ConversationHistoryManager('Topic', 50, 5);
      expect(manager).toBeDefined();
    });
  });

  describe('addMessage', () => {
    it('should add a message and return it', () => {
      const message = historyManager.addMessage('Alice', 'Hello, world!');

      expect(message).toMatchObject({
        id: expect.any(String),
        personaName: 'Alice',
        content: 'Hello, world!',
        timestamp: expect.any(Date),
      });

      expect(historyManager.getTotalMessages()).toBe(1);
    });

    it('should add message with metadata', () => {
      const metadata = { turn: 1, model: 'test-model' };
      const message = historyManager.addMessage('Bob', 'Hi there!', metadata);

      expect(message.metadata).toEqual(metadata);
    });

    it('should generate unique IDs for messages', () => {
      const message1 = historyManager.addMessage('Alice', 'Message 1');
      const message2 = historyManager.addMessage('Bob', 'Message 2');

      expect(message1.id).not.toBe(message2.id);
      expect(message1.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      expect(message2.id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('should maintain correct timestamps', () => {
      const message = historyManager.addMessage('Alice', 'Test message');
      expect(message.timestamp).toEqual(mockDate);
    });

    it('should trim messages when exceeding max limit', () => {
      const smallManager = new ConversationHistoryManager('Topic', 3, 5);

      // Add 5 messages (exceeds limit of 3)
      for (let i = 1; i <= 5; i++) {
        smallManager.addMessage('User', `Message ${i}`);
      }

      const messages = smallManager.getMessages();
      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe('Message 3'); // Oldest messages removed
      expect(messages[2].content).toBe('Message 5');
      expect(smallManager.getTotalMessages()).toBe(5); // Total count preserved
    });
  });

  describe('getMessages', () => {
    it('should return copy of messages array', () => {
      historyManager.addMessage('Alice', 'Message 1');
      historyManager.addMessage('Bob', 'Message 2');

      const messages = historyManager.getMessages();
      expect(messages).toHaveLength(2);

      // Verify it's a copy by modifying it
      messages.push({} as ConversationMessage);
      expect(historyManager.getMessages()).toHaveLength(2);
    });

    it('should return empty array when no messages', () => {
      const messages = historyManager.getMessages();
      expect(messages).toEqual([]);
    });
  });

  describe('getLastMessage', () => {
    it('should return the most recent message', () => {
      historyManager.addMessage('Alice', 'First message');
      const lastMessage = historyManager.addMessage('Bob', 'Last message');

      const retrieved = historyManager.getLastMessage();
      expect(retrieved).toEqual(lastMessage);
    });

    it('should return undefined when no messages', () => {
      const lastMessage = historyManager.getLastMessage();
      expect(lastMessage).toBeUndefined();
    });
  });

  describe('getLastMessages', () => {
    beforeEach(() => {
      for (let i = 1; i <= 5; i++) {
        historyManager.addMessage('User', `Message ${i}`);
      }
    });

    it('should return specified number of last messages', () => {
      const lastThree = historyManager.getLastMessages(3);

      expect(lastThree).toHaveLength(3);
      expect(lastThree[0].content).toBe('Message 3');
      expect(lastThree[2].content).toBe('Message 5');
    });

    it('should return all messages when count exceeds total', () => {
      const allMessages = historyManager.getLastMessages(10);

      expect(allMessages).toHaveLength(5);
      expect(allMessages[0].content).toBe('Message 1');
    });

    it('should return empty array when count is 0', () => {
      const noMessages = historyManager.getLastMessages(0);
      expect(noMessages).toEqual([]);
    });
  });

  describe('getMessagesByPersona', () => {
    beforeEach(() => {
      historyManager.addMessage('Alice', 'Alice message 1');
      historyManager.addMessage('Bob', 'Bob message 1');
      historyManager.addMessage('Alice', 'Alice message 2');
      historyManager.addMessage('Charlie', 'Charlie message 1');
    });

    it('should return messages by specific persona', () => {
      const aliceMessages = historyManager.getMessagesByPersona('Alice');

      expect(aliceMessages).toHaveLength(2);
      expect(aliceMessages[0].content).toBe('Alice message 1');
      expect(aliceMessages[1].content).toBe('Alice message 2');
    });

    it('should return empty array for non-existent persona', () => {
      const messages = historyManager.getMessagesByPersona('NonExistent');
      expect(messages).toEqual([]);
    });

    it('should be case sensitive', () => {
      const messages = historyManager.getMessagesByPersona('alice'); // lowercase
      expect(messages).toEqual([]);
    });
  });

  describe('getContextWindow', () => {
    beforeEach(() => {
      for (let i = 1; i <= 15; i++) {
        historyManager.addMessage(`User${i % 3}`, `Message ${i}`);
      }
    });

    it('should return context window as formatted strings', () => {
      const context = historyManager.getContextWindow();

      expect(context).toHaveLength(10); // maxContextWindow
      expect(context[0]).toBe('User0: Message 6'); // Last 10 messages start from message 6
      expect(context[9]).toBe('User0: Message 15');
    });

    it('should format messages as "PersonaName: Content"', () => {
      const smallManager = new ConversationHistoryManager('Topic', 100, 3);
      smallManager.addMessage('Alice', 'Hello');
      smallManager.addMessage('Bob', 'Hi there');

      const context = smallManager.getContextWindow();

      expect(context).toEqual([
        'Alice: Hello',
        'Bob: Hi there',
      ]);
    });

    it('should return all messages when fewer than context window size', () => {
      const emptyManager = new ConversationHistoryManager('Topic', 100, 10);
      emptyManager.addMessage('Alice', 'Only message');

      const context = emptyManager.getContextWindow();

      expect(context).toEqual(['Alice: Only message']);
    });
  });

  describe('getMessageStats', () => {
    beforeEach(() => {
      historyManager.addMessage('Alice', 'Short'); // 5 chars
      historyManager.addMessage('Bob', 'Medium length message'); // 21 chars
      historyManager.addMessage('Alice', 'Another message from Alice'); // 27 chars
    });

    it('should calculate correct statistics', () => {
      const stats = historyManager.getMessageStats();

      expect(stats.totalMessages).toBe(3);
      expect(stats.messagesByPersona).toEqual({
        Alice: 2,
        Bob: 1,
      });
      expect(stats.averageMessageLength).toBeGreaterThan(15);
      expect(stats.conversationDuration).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty conversation', () => {
      const emptyManager = new ConversationHistoryManager();
      const stats = emptyManager.getMessageStats();

      expect(stats.totalMessages).toBe(0);
      expect(stats.messagesByPersona).toEqual({});
      expect(stats.averageMessageLength).toBe(0);
    });
  });

  describe('searchMessages', () => {
    beforeEach(() => {
      historyManager.addMessage('Alice', 'Hello world');
      historyManager.addMessage('Bob', 'How are you doing?');
      historyManager.addMessage('Alice', 'I am doing great!');
      historyManager.addMessage('Charlie', 'Hello everyone');
    });

    it('should search by content (case insensitive by default)', () => {
      const results = historyManager.searchMessages('hello');

      expect(results).toHaveLength(2);
      expect(results[0].content).toBe('Hello world');
      expect(results[1].content).toBe('Hello everyone');
    });

    it('should search by persona name', () => {
      const results = historyManager.searchMessages('alice');

      expect(results).toHaveLength(2);
      expect(results[0].personaName).toBe('Alice');
      expect(results[1].personaName).toBe('Alice');
    });

    it('should support case sensitive search', () => {
      const results = historyManager.searchMessages('Hello', true);

      expect(results).toHaveLength(2); // Only exact case matches
    });

    it('should return empty array when no matches', () => {
      const results = historyManager.searchMessages('nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('exportToJSON', () => {
    beforeEach(() => {
      historyManager.addMessage('Alice', 'Test message');
    });

    it('should export conversation to JSON string', () => {
      const jsonString = historyManager.exportToJSON();
      const parsed = JSON.parse(jsonString);

      expect(parsed).toMatchObject({
        messages: expect.arrayContaining([
          expect.objectContaining({
            personaName: 'Alice',
            content: 'Test message',
          }),
        ]),
        startTime: expect.any(String),
        endTime: expect.any(String),
        topic: 'Test Topic',
        totalMessages: 1,
        stats: expect.any(Object),
      });
    });

    it('should include statistics in export', () => {
      const jsonString = historyManager.exportToJSON();
      const parsed = JSON.parse(jsonString);

      expect(parsed.stats).toMatchObject({
        totalMessages: 1,
        messagesByPersona: { Alice: 1 },
        averageMessageLength: expect.any(Number),
        conversationDuration: expect.any(Number),
      });
    });
  });

  describe('exportToMarkdown', () => {
    beforeEach(() => {
      historyManager.addMessage('Alice', 'Hello there!');
      historyManager.addMessage('Bob', 'Hi Alice, how are you?');
    });

    it('should export conversation to markdown format', () => {
      const markdown = historyManager.exportToMarkdown();

      expect(markdown).toContain('# AI Conversation');
      expect(markdown).toContain('**Topic:** Test Topic');
      expect(markdown).toContain('**Total Messages:** 2');
      expect(markdown).toContain('## Participants');
      expect(markdown).toContain('- **Alice:** 1 messages');
      expect(markdown).toContain('- **Bob:** 1 messages');
      expect(markdown).toContain('## Conversation');
      expect(markdown).toContain('### Alice');
      expect(markdown).toContain('Hello there!');
      expect(markdown).toContain('### Bob');
      expect(markdown).toContain('Hi Alice, how are you?');
    });

    it('should handle conversation without topic', () => {
      const noTopicManager = new ConversationHistoryManager();
      noTopicManager.addMessage('Alice', 'Test');

      const markdown = noTopicManager.exportToMarkdown();

      expect(markdown).not.toContain('**Topic:**');
      expect(markdown).toContain('# AI Conversation');
    });
  });

  describe('endConversation', () => {
    it('should set end time', () => {
      historyManager.endConversation();
      const history = historyManager.getConversationHistory();

      expect(history.endTime).toBeInstanceOf(Date);
      expect(history.endTime).toEqual(mockDate);
    });

    it('should set end time when called', () => {
      historyManager.endConversation();
      const endTime = historyManager.getConversationHistory().endTime;

      expect(endTime).toBeInstanceOf(Date);
      expect(endTime).toEqual(mockDate);
    });
  });

  describe('clear', () => {
    beforeEach(() => {
      historyManager.addMessage('Alice', 'Message 1');
      historyManager.addMessage('Bob', 'Message 2');
    });

    it('should clear all messages and reset counters', () => {
      historyManager.clear();

      expect(historyManager.getMessages()).toEqual([]);
      expect(historyManager.getTotalMessages()).toBe(0);
      expect(historyManager.getConversationHistory().endTime).toBeUndefined();
    });

    it('should reset start time', () => {
      // Move time forward before clearing
      const newTime = new Date('2024-01-01T13:00:00Z');
      vi.setSystemTime(newTime);
      
      historyManager.clear();

      const newStartTime = historyManager.getConversationHistory().startTime;
      expect(newStartTime).toEqual(newTime);
    });
  });

  describe('setTopic', () => {
    it('should update conversation topic', () => {
      historyManager.setTopic('New Topic');
      const history = historyManager.getConversationHistory();

      expect(history.topic).toBe('New Topic');
    });

    it('should replace existing topic', () => {
      expect(historyManager.getConversationHistory().topic).toBe('Test Topic');

      historyManager.setTopic('Updated Topic');
      expect(historyManager.getConversationHistory().topic).toBe('Updated Topic');
    });
  });

  describe('getDuration', () => {
    it('should calculate duration from start to current time when not ended', () => {
      const duration = historyManager.getDuration();
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should calculate duration from start to end time when ended', () => {
      // Get initial start time
      const initialStart = historyManager.getConversationHistory().startTime;
      
      // Set time 5 minutes later and end conversation
      const fiveMinutesLater = new Date(initialStart.getTime() + (5 * 60 * 1000));
      vi.setSystemTime(fiveMinutesLater);
      historyManager.endConversation();

      const duration = historyManager.getDuration();
      expect(duration).toBe(5 * 60 * 1000); // 5 minutes in milliseconds
    });
  });
}); 