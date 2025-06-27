import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConversationHistoryManager } from '../../src/conversation/history.js';
import { PersonaManager, DEFAULT_PERSONAS } from '../../src/conversation/personas.js';
import { ConversationFormatter } from '../../src/utils/formatter.js';
import { ConsoleLogger } from '../../src/utils/logger.js';
import type { ConversationMessage, PersonaConfig } from '../../src/types/index.js';

// Mock external dependencies
vi.mock('../../src/utils/logger.js');

describe('Conversation Flow Integration', () => {
  let historyManager: ConversationHistoryManager;
  let personaManager: PersonaManager;
  let logger: ConsoleLogger;

  beforeEach(() => {
    historyManager = new ConversationHistoryManager('Integration Test Topic');
    personaManager = new PersonaManager();
    logger = new ConsoleLogger('debug');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Complete conversation scenario', () => {
    it('should simulate a full conversation between two personas', () => {
      // Get two personas for the conversation
      const alice = personaManager.getPersona('alice');
      const bob = personaManager.getPersona('bob');

      expect(alice).toBeDefined();
      expect(bob).toBeDefined();

      // Start conversation with an initial message
      const initialMessage = historyManager.addMessage(
        'User',
        'What are your thoughts on artificial intelligence?'
      );

      expect(initialMessage.personaName).toBe('User');
      expect(initialMessage.content).toBe('What are your thoughts on artificial intelligence?');

      // Simulate Alice responding
      const aliceResponse = historyManager.addMessage(
        alice!.name,
        'That\'s a fascinating question! I believe AI represents one of the most profound developments in human history. The ability to create machines that can think and reason opens up incredible possibilities for understanding consciousness itself.',
        { turn: 1, persona: 'alice' }
      );

      // Simulate Bob responding
      const bobResponse = historyManager.addMessage(
        bob!.name,
        'I agree it\'s significant, but I think we should focus on the practical applications. AI can solve real problems like climate change, healthcare, and education. What matters is how we implement these technologies responsibly.',
        { turn: 2, persona: 'bob' }
      );

      // Verify conversation state
      expect(historyManager.getTotalMessages()).toBe(3);
      
      const messages = historyManager.getMessages();
      expect(messages).toHaveLength(3);
      expect(messages[0]).toEqual(initialMessage);
      expect(messages[1]).toEqual(aliceResponse);
      expect(messages[2]).toEqual(bobResponse);

      // Test message statistics
      const stats = historyManager.getMessageStats();
      expect(stats.totalMessages).toBe(3);
      expect(stats.messagesByPersona).toEqual({
        'User': 1,
        'Alice': 1,
        'Bob': 1,
      });
      expect(stats.averageMessageLength).toBeGreaterThan(0);
    });

    it('should maintain conversation context and search functionality', () => {
      // Add several messages to build context
      const messages = [
        { persona: 'Alice', content: 'I think consciousness is the key to understanding AI.' },
        { persona: 'Bob', content: 'But how do we measure consciousness in machines?' },
        { persona: 'Alice', content: 'That\'s the hard problem of consciousness.' },
        { persona: 'Bob', content: 'Maybe we should focus on functional intelligence instead.' },
        { persona: 'Alice', content: 'Functional intelligence is important, but consciousness gives meaning.' },
      ];

      messages.forEach((msg, index) => {
        historyManager.addMessage(msg.persona, msg.content, { turn: index + 1 });
      });

      // Test context window
      const context = historyManager.getContextWindow();
      expect(context).toHaveLength(5);
      expect(context[0]).toBe('Alice: I think consciousness is the key to understanding AI.');
      expect(context[4]).toBe('Alice: Functional intelligence is important, but consciousness gives meaning.');

      // Test search functionality
      const consciousnessMessages = historyManager.searchMessages('consciousness');
      expect(consciousnessMessages.length).toBeGreaterThanOrEqual(3);

      const bobMessages = historyManager.getMessagesByPersona('Bob');
      expect(bobMessages).toHaveLength(2);
    });

    it('should format conversation messages correctly', () => {
      const testMessage: ConversationMessage = {
        id: 'test-id',
        personaName: 'Alice',
        content: 'This is a test message for formatting.',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        metadata: { turn: 1 },
      };

      const formatted = ConversationFormatter.formatMessage(testMessage);

      expect(formatted).toContain('Alice');
      expect(formatted).toContain('This is a test message for formatting.');
      expect(formatted).toContain('─'.repeat(80)); // Separator line
    });

    it('should export conversation in multiple formats', () => {
      // Add some conversation content
      historyManager.addMessage('Alice', 'Hello there!');
      historyManager.addMessage('Bob', 'Hi Alice! How are you?');
      historyManager.addMessage('Alice', 'I\'m doing well, thanks for asking.');

      // Test JSON export
      const jsonExport = historyManager.exportToJSON();
      const parsedJson = JSON.parse(jsonExport);

      expect(parsedJson).toMatchObject({
        topic: 'Integration Test Topic',
        totalMessages: 3,
        messages: expect.arrayContaining([
          expect.objectContaining({
            personaName: 'Alice',
            content: 'Hello there!',
          }),
          expect.objectContaining({
            personaName: 'Bob',
            content: 'Hi Alice! How are you?',
          }),
        ]),
        stats: expect.objectContaining({
          totalMessages: 3,
          messagesByPersona: {
            Alice: 2,
            Bob: 1,
          },
        }),
      });

      // Test Markdown export
      const markdownExport = historyManager.exportToMarkdown();

      expect(markdownExport).toContain('# AI Conversation');
      expect(markdownExport).toContain('**Topic:** Integration Test Topic');
      expect(markdownExport).toContain('**Total Messages:** 3');
      expect(markdownExport).toContain('## Participants');
      expect(markdownExport).toContain('- **Alice:** 2 messages');
      expect(markdownExport).toContain('- **Bob:** 1 messages');
      expect(markdownExport).toContain('### Alice');
      expect(markdownExport).toContain('Hello there!');
    });

    it('should handle persona validation and management', () => {
      // Test default personas are valid
      Object.entries(DEFAULT_PERSONAS).forEach(([key, persona]) => {
        const errors = personaManager.validatePersona(persona);
        expect(errors).toEqual([]);
      });

      // Test adding custom persona
      const customPersona: PersonaConfig = {
        name: 'Test Assistant',
        personality: 'Helpful and knowledgeable AI assistant',
        speakingStyle: 'Clear and concise',
        interests: ['helping users', 'problem solving', 'learning'],
        systemPrompt: 'You are a helpful AI assistant.',
      };

      personaManager.addPersona('testassistant', customPersona);

      const retrieved = personaManager.getPersona('testassistant');
      expect(retrieved).toEqual(customPersona);

      // Test persona pair selection
      const [persona1, persona2] = personaManager.getRandomPersonaPair();
      expect(persona1).not.toEqual(persona2);
      expect(persona1.name).not.toBe(persona2.name);
    });

    it('should handle conversation lifecycle events', () => {
      // Start conversation
      const startTime = historyManager.getConversationHistory().startTime;
      expect(startTime).toBeInstanceOf(Date);

      // Add messages during conversation
      historyManager.addMessage('Alice', 'Starting the conversation.');
      historyManager.addMessage('Bob', 'Great to be here!');

      // Check conversation is active
      expect(historyManager.getTotalMessages()).toBe(2);
      expect(historyManager.getConversationHistory().endTime).toBeUndefined();

      // End conversation
      historyManager.endConversation();

      const endTime = historyManager.getConversationHistory().endTime;
      expect(endTime).toBeInstanceOf(Date);
      expect(endTime!.getTime()).toBeGreaterThanOrEqual(startTime.getTime());

      // Check final stats
      const finalStats = historyManager.getMessageStats();
      expect(finalStats.totalMessages).toBe(2);
      expect(finalStats.conversationDuration).toBeGreaterThanOrEqual(0);
    });

    it('should handle error scenarios gracefully', () => {
      // Test invalid persona validation
      const invalidPersona: PersonaConfig = {
        name: '',
        personality: '',
        speakingStyle: '',
        interests: [],
      };

      const errors = personaManager.validatePersona(invalidPersona);
      expect(errors).toHaveLength(4);
      expect(errors).toContain('Persona name is required');
      expect(errors).toContain('Persona personality is required');
      expect(errors).toContain('Persona speaking style is required');
      expect(errors).toContain('Persona must have at least one interest');

      // Test conversation with missing persona
      const nonExistentPersona = personaManager.getPersona('nonexistent');
      expect(nonExistentPersona).toBeUndefined();

      // Test empty search results
      const noResults = historyManager.searchMessages('nonexistent term');
      expect(noResults).toEqual([]);

      // Test getting messages from empty conversation
      const emptyHistory = new ConversationHistoryManager();
      expect(emptyHistory.getMessages()).toEqual([]);
      expect(emptyHistory.getLastMessage()).toBeUndefined();
      expect(emptyHistory.getTotalMessages()).toBe(0);
    });

    it('should maintain data consistency across operations', () => {
      // Add multiple messages
      for (let i = 1; i <= 10; i++) {
        const persona = i % 2 === 0 ? 'Alice' : 'Bob';
        historyManager.addMessage(persona, `Message ${i} from ${persona}`);
      }

      // Verify total count
      expect(historyManager.getTotalMessages()).toBe(10);

      // Verify messages are ordered correctly
      const messages = historyManager.getMessages();
      expect(messages[0].content).toBe('Message 1 from Bob');
      expect(messages[9].content).toBe('Message 10 from Alice');

      // Verify persona counts
      const aliceMessages = historyManager.getMessagesByPersona('Alice');
      const bobMessages = historyManager.getMessagesByPersona('Bob');
      expect(aliceMessages).toHaveLength(5);
      expect(bobMessages).toHaveLength(5);

      // Verify context window respects limits
      const context = historyManager.getContextWindow();
      expect(context.length).toBeLessThanOrEqual(20); // Default context window size

      // Test message trimming when exceeding limits
      const smallHistory = new ConversationHistoryManager('Test', 3, 5);
      for (let i = 1; i <= 5; i++) {
        smallHistory.addMessage('User', `Message ${i}`);
      }

      expect(smallHistory.getMessages()).toHaveLength(3); // Trimmed to max
      expect(smallHistory.getTotalMessages()).toBe(5); // But total count preserved
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle large conversations efficiently', () => {
      const start = Date.now();

      // Add many messages
      for (let i = 0; i < 1000; i++) {
        const persona = i % 2 === 0 ? 'Alice' : 'Bob';
        historyManager.addMessage(persona, `Message ${i}`);
      }

      const addTime = Date.now() - start;
      expect(addTime).toBeLessThan(1000); // Should complete within 1 second

      // Test search performance
      const searchStart = Date.now();
      const results = historyManager.searchMessages('Message 500');
      const searchTime = Date.now() - searchStart;

      expect(results).toHaveLength(1);
      expect(searchTime).toBeLessThan(100); // Search should be fast
    });

    it('should handle unicode and special characters', () => {
      const specialMessages = [
        'Hello 世界! 🌍',
        'Café discussion ☕',
        'Mathematical symbols: ∑ ∫ ∆',
        'Emoji conversation 😊 🤖 💭',
      ];

      specialMessages.forEach((content, index) => {
        historyManager.addMessage('TestPersona', content);
      });

      const messages = historyManager.getMessages();
      expect(messages).toHaveLength(4);

      // Test formatting handles special characters
      const formatted = ConversationFormatter.formatMessage(messages[0]);
      expect(formatted).toContain('Hello 世界! 🌍');

      // Test search works with unicode
      const unicodeResults = historyManager.searchMessages('世界');
      expect(unicodeResults).toHaveLength(1);
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000); // 10k character message
      
      const message = historyManager.addMessage('LongTalker', longMessage);
      expect(message.content).toBe(longMessage);

      // Test formatting handles long content
      const formatted = ConversationFormatter.formatMessage(message);
      expect(formatted).toContain(longMessage);

      // Verify message was formatted (contains the content)
      expect(formatted).toContain(longMessage);
    });
  });
}); 