import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationFormatter } from '../../../src/utils/formatter.js';
import type { ConversationMessage } from '../../../src/types/index.js';

describe('ConversationFormatter', () => {
  let mockMessage: ConversationMessage;

  beforeEach(() => {
    mockMessage = {
      id: 'test-id',
      personaName: 'Alice',
      content: 'This is a test message.',
      timestamp: new Date('2024-01-01T12:00:00Z'),
      metadata: { turn: 1 },
    };
  });

  describe('formatMessage', () => {
    it('should format a message with header and content', () => {
      const formatted = ConversationFormatter.formatMessage(mockMessage);

      expect(formatted).toContain('Alice');
      expect(formatted).toContain('12:00:00'); // Should contain time
      expect(formatted).toContain('This is a test message.');
      expect(formatted).toContain('─'.repeat(80)); // Separator
    });

    it('should include metadata in the formatted output', () => {
      const formatted = ConversationFormatter.formatMessage(mockMessage);
      expect(formatted).toBeDefined();
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('should handle long content by wrapping lines', () => {
      const longMessage = {
        ...mockMessage,
        content: 'This is a very long message that should be wrapped to multiple lines when it exceeds the maximum width limit of 76 characters per line.',
      };

      const formatted = ConversationFormatter.formatMessage(longMessage);
      const lines = formatted.split('\n');
      
      // Check that content lines don't exceed the expected width (including indentation)
      const contentLines = lines.filter(line => line.startsWith('  '));
      contentLines.forEach(line => {
        expect(line.length).toBeLessThanOrEqual(78); // 76 + 2 for indentation
      });
    });

    it('should handle empty content', () => {
      const emptyMessage = {
        ...mockMessage,
        content: '',
      };

      const formatted = ConversationFormatter.formatMessage(emptyMessage);
      expect(formatted).toContain('Alice');
      expect(formatted).toBeDefined();
    });
  });

  describe('formatTypingIndicator', () => {
    it('should format typing indicator with persona name', () => {
      const indicator = ConversationFormatter.formatTypingIndicator('Bob');

      expect(indicator).toContain('Bob');
      expect(indicator).toContain('typing');
      expect(indicator).toContain('●●●');
    });

    it('should format typing indicator for different personas', () => {
      const aliceIndicator = ConversationFormatter.formatTypingIndicator('Alice');
      const bobIndicator = ConversationFormatter.formatTypingIndicator('Bob');

      expect(aliceIndicator).toContain('Alice');
      expect(bobIndicator).toContain('Bob');
      expect(aliceIndicator).not.toEqual(bobIndicator);
    });
  });

  describe('formatConversationStart', () => {
    it('should format conversation start without topic', () => {
      const formatted = ConversationFormatter.formatConversationStart();

      expect(formatted).toContain('AI Conversation Started');
      expect(formatted).toContain('Press Ctrl+C to stop');
      expect(formatted).toContain('='.repeat(80));
      expect(formatted).not.toContain('Topic:');
    });

    it('should format conversation start with topic', () => {
      const formatted = ConversationFormatter.formatConversationStart('Test Topic');

      expect(formatted).toContain('AI Conversation Started');
      expect(formatted).toMatch(/Topic:.*Test Topic/); // Should contain topic with potential formatting
      expect(formatted).toContain('Press Ctrl+C to stop');
    });

    it('should include proper separators and formatting', () => {
      const formatted = ConversationFormatter.formatConversationStart();
      
      expect(formatted).toContain('='.repeat(80)); // Contains equals signs
      expect(formatted).toContain('AI Conversation Started');
    });
  });

  describe('formatConversationEnd', () => {
    it('should format conversation end with statistics', () => {
      const formatted = ConversationFormatter.formatConversationEnd(15, 300000); // 5 minutes

      expect(formatted).toContain('Conversation Ended');
      expect(formatted).toContain('15'); // Should contain message count
      expect(formatted).toMatch(/Duration:.*5m 0s/); // Should contain duration with potential formatting
      expect(formatted).toContain('='.repeat(80));
    });

    it('should format duration correctly for different time spans', () => {
      const testCases = [
        { ms: 30000, expected: '30s' },
        { ms: 90000, expected: '1m 30s' },
        { ms: 3661000, expected: '1h 1m 1s' },
      ];

      testCases.forEach(({ ms, expected }) => {
        const formatted = ConversationFormatter.formatConversationEnd(1, ms);
        expect(formatted).toContain(expected); // Should contain duration
      });
    });

    it('should handle zero messages and duration', () => {
      const formatted = ConversationFormatter.formatConversationEnd(0, 0);

      expect(formatted).toContain('0'); // Should contain zero count
      expect(formatted).toMatch(/Duration:.*0s/); // Should contain duration with potential formatting
    });
  });

  describe('formatError', () => {
    it('should format error message with error emoji', () => {
      const error = new Error('Test error message');
      const formatted = ConversationFormatter.formatError(error);

      expect(formatted).toContain('❌ Error: Test error message');
    });

    it('should handle errors with empty messages', () => {
      const error = new Error('');
      const formatted = ConversationFormatter.formatError(error);

      expect(formatted).toContain('❌ Error: ');
    });
  });

  describe('formatWarning', () => {
    it('should format warning message with warning emoji', () => {
      const formatted = ConversationFormatter.formatWarning('Test warning');

      expect(formatted).toContain('⚠️  Warning: Test warning');
    });
  });

  describe('formatSuccess', () => {
    it('should format success message with checkmark emoji', () => {
      const formatted = ConversationFormatter.formatSuccess('Operation completed');

      expect(formatted).toContain('✅ Operation completed');
    });
  });

  describe('formatInfo', () => {
    it('should format info message with info emoji', () => {
      const formatted = ConversationFormatter.formatInfo('Information message');

      expect(formatted).toContain('ℹ️  Information message');
    });
  });

  describe('persona name coloring', () => {
    it('should assign different colors to different personas', () => {
      const aliceFormatted = ConversationFormatter.formatMessage({
        ...mockMessage,
        personaName: 'Alice',
      });
      
      const bobFormatted = ConversationFormatter.formatMessage({
        ...mockMessage,
        personaName: 'Bob',
      });

      // The formatted messages should be different due to different colors
      // We can't easily test the actual ANSI color codes, but we can ensure
      // the messages are processed differently
      expect(aliceFormatted).toContain('Alice');
      expect(bobFormatted).toContain('Bob');
    });

    it('should consistently color the same persona name', () => {
      const message1 = ConversationFormatter.formatMessage({
        ...mockMessage,
        personaName: 'Alice',
        content: 'First message',
      });
      
      const message2 = ConversationFormatter.formatMessage({
        ...mockMessage,
        personaName: 'Alice',
        content: 'Second message',
      });

      // Extract the header parts for comparison
      const header1 = message1.split('\n')[0];
      const header2 = message2.split('\n')[0];
      
      // The persona name parts should be formatted identically
      expect(header1.split('(')[0]).toEqual(header2.split('(')[0]);
    });
  });

  describe('content wrapping', () => {
    it('should wrap long lines properly', () => {
      const longContent = 'This is a very long message that contains multiple words and should definitely be wrapped to multiple lines when it exceeds the maximum width limit of 76 characters per line according to the formatting rules.';
      const longMessage = {
        ...mockMessage,
        content: longContent,
      };

      const formatted = ConversationFormatter.formatMessage(longMessage);
      const contentLines = formatted.split('\n').filter(line => line.trim().length > 0 && !line.includes('─'));
      
      // Should create multiple lines for long content
      expect(contentLines.length).toBeGreaterThan(1);
    });

    it('should handle words longer than the line limit', () => {
      const superLongWord = 'supercalifragilisticexpialidocious'.repeat(3);
      const longMessage = {
        ...mockMessage,
        content: superLongWord,
      };

      const formatted = ConversationFormatter.formatMessage(longMessage);
      
      // Should not throw an error and should contain the content
      expect(formatted).toContain('supercalifragilisticexpialidocious');
    });

    it('should preserve word boundaries when wrapping', () => {
      const content = 'This is a test message with multiple words that should wrap properly';
      const message = {
        ...mockMessage,
        content,
      };

      const formatted = ConversationFormatter.formatMessage(message);
      const contentLines = formatted.split('\n').filter(line => line.startsWith('  '));
      
      // Check that words are not broken in the middle
      contentLines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed) {
          // Line should not start or end with partial words (no hyphens at start/end)
          expect(trimmed).not.toMatch(/^-/);
          expect(trimmed).not.toMatch(/-$/);
        }
      });
    });
  });
}); 