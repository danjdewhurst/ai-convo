import { randomUUID } from 'crypto';
import type {
  ConversationMessage,
  ConversationHistory,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

export class ConversationHistoryManager {
  private history: ConversationHistory;
  private maxMessages: number;
  private maxContextWindow: number;

  constructor(
    topic?: string,
    maxMessages: number = 1000,
    maxContextWindow: number = 20
  ) {
    this.maxMessages = maxMessages;
    this.maxContextWindow = maxContextWindow;

    this.history = {
      messages: [],
      startTime: new Date(),
      totalMessages: 0,
      ...(topic && { topic }),
    };

    logger.debug('ConversationHistoryManager initialized', {
      topic,
      maxMessages,
      maxContextWindow,
    });
  }

  addMessage(
    personaName: string,
    content: string,
    metadata?: Record<string, unknown>
  ): ConversationMessage {
    const message: ConversationMessage = {
      id: randomUUID(),
      personaName,
      content,
      timestamp: new Date(),
      ...(metadata && { metadata }),
    };

    this.history.messages.push(message);
    this.history.totalMessages++;

    // Trim history if it exceeds max messages
    if (this.history.messages.length > this.maxMessages) {
      const removed = this.history.messages.splice(
        0,
        this.history.messages.length - this.maxMessages
      );
      logger.debug(`Trimmed ${removed.length} old messages from history`);
    }

    logger.debug('Message added to history', {
      messageId: message.id,
      personaName,
      contentLength: content.length,
      totalMessages: this.history.totalMessages,
    });

    return message;
  }

  getMessages(): ConversationMessage[] {
    return [...this.history.messages];
  }

  getLastMessage(): ConversationMessage | undefined {
    return this.history.messages[this.history.messages.length - 1];
  }

  getLastMessages(count: number): ConversationMessage[] {
    const start = Math.max(0, this.history.messages.length - count);
    return this.history.messages.slice(start);
  }

  getMessagesByPersona(personaName: string): ConversationMessage[] {
    return this.history.messages.filter(msg => msg.personaName === personaName);
  }

  getContextWindow(): string[] {
    const recentMessages = this.getLastMessages(this.maxContextWindow);
    return recentMessages.map(msg => `${msg.personaName}: ${msg.content}`);
  }

  getConversationHistory(): ConversationHistory {
    return {
      ...this.history,
      messages: [...this.history.messages], // Return a copy
    };
  }

  getTotalMessages(): number {
    return this.history.totalMessages;
  }

  getDuration(): number {
    const endTime = this.history.endTime || new Date();
    return endTime.getTime() - this.history.startTime.getTime();
  }

  getMessageStats(): {
    totalMessages: number;
    messagesByPersona: Record<string, number>;
    averageMessageLength: number;
    conversationDuration: number;
  } {
    const messagesByPersona: Record<string, number> = {};
    let totalLength = 0;

    for (const message of this.history.messages) {
      messagesByPersona[message.personaName] =
        (messagesByPersona[message.personaName] || 0) + 1;
      totalLength += message.content.length;
    }

    return {
      totalMessages: this.history.totalMessages,
      messagesByPersona,
      averageMessageLength:
        this.history.messages.length > 0
          ? totalLength / this.history.messages.length
          : 0,
      conversationDuration: this.getDuration(),
    };
  }

  searchMessages(
    query: string,
    caseSensitive: boolean = false
  ): ConversationMessage[] {
    const searchTerm = caseSensitive ? query : query.toLowerCase();

    return this.history.messages.filter(message => {
      const content = caseSensitive
        ? message.content
        : message.content.toLowerCase();
      const personaName = caseSensitive
        ? message.personaName
        : message.personaName.toLowerCase();

      return content.includes(searchTerm) || personaName.includes(searchTerm);
    });
  }

  exportToJSON(): string {
    const exportData = {
      ...this.history,
      endTime: this.history.endTime || new Date(),
      stats: this.getMessageStats(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  exportToMarkdown(): string {
    const stats = this.getMessageStats();
    const duration = this.formatDuration(stats.conversationDuration);

    let markdown = `# AI Conversation\n\n`;

    if (this.history.topic) {
      markdown += `**Topic:** ${this.history.topic}\n`;
    }

    markdown += `**Started:** ${this.history.startTime.toLocaleString()}\n`;
    markdown += `**Duration:** ${duration}\n`;
    markdown += `**Total Messages:** ${stats.totalMessages}\n\n`;

    // Add participant statistics
    markdown += `## Participants\n\n`;
    for (const [persona, count] of Object.entries(stats.messagesByPersona)) {
      markdown += `- **${persona}:** ${count} messages\n`;
    }
    markdown += `\n`;

    // Add conversation
    markdown += `## Conversation\n\n`;
    for (const message of this.history.messages) {
      const timestamp = message.timestamp.toLocaleTimeString();
      markdown += `### ${message.personaName} (${timestamp})\n\n`;
      markdown += `${message.content}\n\n`;
    }

    return markdown;
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  endConversation(): void {
    this.history.endTime = new Date();
    logger.info('Conversation ended', {
      duration: this.getDuration(),
      totalMessages: this.history.totalMessages,
    });
  }

  clear(): void {
    const oldCount = this.history.messages.length;
    this.history.messages = [];
    this.history.totalMessages = 0;
    this.history.startTime = new Date();
    delete this.history.endTime;

    logger.debug(`Cleared conversation history (${oldCount} messages removed)`);
  }

  setTopic(topic: string): void {
    this.history.topic = topic;
    logger.debug('Conversation topic updated', { topic });
  }
}
