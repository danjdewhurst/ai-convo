import { randomUUID } from 'crypto';
import type {
  ConversationMessage,
  ConversationSummary,
  ConversationStatistics,
  PersonaConfig,
} from '../types/index.js';
import { OllamaClient } from '../ai/client.js';
import { logger } from '../utils/logger.js';

export class ConversationAnalytics {
  private aiClient: OllamaClient;

  constructor(aiClient: OllamaClient) {
    this.aiClient = aiClient;
  }

  /**
   * Generate a summary of a conversation segment
   */
  async generateSummary(
    messages: ConversationMessage[],
    type: ConversationSummary['type'],
    personas: [PersonaConfig, PersonaConfig]
  ): Promise<ConversationSummary> {
    if (messages.length === 0) {
      throw new Error('Cannot generate summary for empty message list');
    }

    try {
      const conversationText = messages
        .map(msg => `${msg.personaName}: ${msg.content}`)
        .join('\n');

      const summaryPrompt = this.buildSummaryPrompt(
        conversationText,
        type,
        personas
      );

      const response = await this.aiClient.generateResponse(
        summaryPrompt,
        'You are a helpful assistant that creates concise, insightful summaries of conversations between AI personas.'
      );

      const summary = this.parseSummaryResponse(
        response.content,
        messages,
        type
      );

      logger.debug('Generated conversation summary', {
        type,
        messageCount: messages.length,
        summaryLength: summary.content.length,
      });

      return summary;
    } catch (error) {
      logger.error('Failed to generate conversation summary', { error, type });

      // Fallback to basic summary
      return this.generateBasicSummary(messages, type);
    }
  }

  /**
   * Generate enhanced conversation statistics
   */
  generateStatistics(
    messages: ConversationMessage[],
    startTime: Date,
    endTime?: Date
  ): ConversationStatistics {
    if (messages.length === 0) {
      return this.getEmptyStatistics();
    }

    const messagesByPersona: Record<string, number> = {};
    const messageLengths: number[] = [];
    const responseTimes: number[] = [];
    const topics: string[] = [];

    let totalLength = 0;
    let previousTimestamp: Date | null = null;

    for (const message of messages) {
      // Count messages by persona
      messagesByPersona[message.personaName] =
        (messagesByPersona[message.personaName] || 0) + 1;

      // Track message lengths
      const length = message.content.length;
      messageLengths.push(length);
      totalLength += length;

      // Calculate response times (time between messages)
      if (previousTimestamp) {
        const responseTime =
          message.timestamp.getTime() - previousTimestamp.getTime();
        if (responseTime > 0) {
          responseTimes.push(responseTime);
        }
      }
      previousTimestamp = message.timestamp;

      // Extract potential topics (simple keyword extraction)
      const keywords = this.extractKeywords(message.content);
      topics.push(...keywords);
    }

    const duration = (endTime || new Date()).getTime() - startTime.getTime();
    const responseTimeStats = this.calculateResponseTimeStats(responseTimes);
    const keyInsights = this.generateKeyInsights(messages, messagesByPersona);

    return {
      totalMessages: messages.length,
      messagesByPersona,
      averageMessageLength: totalLength / messages.length,
      conversationDuration: duration,
      responseTimeStats,
      topicProgression: this.getTopTopics(topics, 5),
      keyInsights,
      conversationFlow: {
        turnsTaken: messages.length,
        averageTurnLength: totalLength / messages.length,
        topicChanges: this.countTopicChanges(messages),
      },
    };
  }

  /**
   * Check if context should be compacted based on current usage
   */
  shouldCompactContext(
    currentContextSize: number,
    maxContextSize: number,
    threshold: number = 0.8
  ): boolean {
    return currentContextSize / maxContextSize >= threshold;
  }

  /**
   * Compact conversation context by summarizing older messages
   */
  async compactContext(
    messages: ConversationMessage[],
    keepRecentCount: number,
    personas: [PersonaConfig, PersonaConfig]
  ): Promise<{ compactedContext: string; summary: ConversationSummary }> {
    if (messages.length <= keepRecentCount) {
      return {
        compactedContext: messages
          .map(m => `${m.personaName}: ${m.content}`)
          .join('\n'),
        summary: this.generateBasicSummary(messages, 'context_compact'),
      };
    }

    const messagesToSummarize = messages.slice(0, -keepRecentCount);
    const recentMessages = messages.slice(-keepRecentCount);

    try {
      const summary = await this.generateSummary(
        messagesToSummarize,
        'context_compact',
        personas
      );

      const compactedContext = [
        `[Previous conversation summary: ${summary.content}]`,
        ...recentMessages.map(m => `${m.personaName}: ${m.content}`),
      ].join('\n');

      logger.info('Context compacted successfully', {
        originalMessages: messages.length,
        summarizedMessages: messagesToSummarize.length,
        keptMessages: recentMessages.length,
      });

      return { compactedContext, summary };
    } catch (error) {
      logger.error('Failed to compact context', { error });

      // Fallback: just keep recent messages
      return {
        compactedContext: recentMessages
          .map(m => `${m.personaName}: ${m.content}`)
          .join('\n'),
        summary: this.generateBasicSummary(
          messagesToSummarize,
          'context_compact'
        ),
      };
    }
  }

  private buildSummaryPrompt(
    conversationText: string,
    type: ConversationSummary['type'],
    personas: [PersonaConfig, PersonaConfig]
  ): string {
    const [persona1, persona2] = personas;

    let prompt = `Please analyze and summarize the following conversation between ${persona1.name} and ${persona2.name}:\n\n`;
    prompt += `${conversationText}\n\n`;

    switch (type) {
      case 'periodic':
        prompt +=
          'Create a concise summary of the key points discussed, major insights, and the direction of the conversation.';
        break;
      case 'context_compact':
        prompt +=
          'Create a condensed summary that preserves the essential context and key insights for continuing the conversation.';
        break;
      case 'final':
        prompt +=
          'Create a comprehensive summary of the entire conversation, including main themes, conclusions, and significant insights.';
        break;
    }

    prompt +=
      '\n\nPlease format your response as JSON with the following structure:\n';
    prompt += '{\n';
    prompt += '  "summary": "Main summary text",\n';
    prompt += '  "keyTopics": ["topic1", "topic2", "topic3"],\n';
    prompt += '  "contributions": {\n';
    prompt += `    "${persona1.name}": "Brief description of their main contributions",\n`;
    prompt += `    "${persona2.name}": "Brief description of their main contributions"\n`;
    prompt += '  }\n';
    prompt += '}';

    return prompt;
  }

  private parseSummaryResponse(
    response: string,
    messages: ConversationMessage[],
    type: ConversationSummary['type']
  ): ConversationSummary {
    try {
      const parsed = JSON.parse(response);

      return {
        id: randomUUID(),
        type,
        content: parsed.summary || 'Summary not available',
        messageRange: {
          start: 0,
          end: messages.length - 1,
        },
        createdAt: new Date(),
        keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics : [],
        participantContributions: parsed.contributions || {},
      };
    } catch (error) {
      logger.warn('Failed to parse AI summary response, using fallback', {
        error,
      });
      return this.generateBasicSummary(messages, type);
    }
  }

  private generateBasicSummary(
    messages: ConversationMessage[],
    type: ConversationSummary['type']
  ): ConversationSummary {
    const personas = [...new Set(messages.map(m => m.personaName))];
    const messagesByPersona: Record<string, number> = {};

    messages.forEach(msg => {
      messagesByPersona[msg.personaName] =
        (messagesByPersona[msg.personaName] || 0) + 1;
    });

    const topics = this.extractKeywords(messages.map(m => m.content).join(' '));

    const content = `Conversation summary: ${messages.length} messages exchanged between ${personas.join(' and ')}. Key topics discussed: ${topics.slice(0, 3).join(', ')}.`;

    return {
      id: randomUUID(),
      type,
      content,
      messageRange: {
        start: 0,
        end: messages.length - 1,
      },
      createdAt: new Date(),
      keyTopics: topics.slice(0, 5),
      participantContributions: Object.fromEntries(
        personas.map(p => [
          p,
          `Contributed ${messagesByPersona[p] || 0} messages`,
        ])
      ),
    };
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - remove common words and extract meaningful terms
    const commonWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'can',
      'this',
      'that',
      'these',
      'those',
      'i',
      'you',
      'he',
      'she',
      'it',
      'we',
      'they',
      'me',
      'him',
      'her',
      'us',
      'them',
      'my',
      'your',
      'his',
      'its',
      'our',
      'their',
      'what',
      'when',
      'where',
      'why',
      'how',
      'think',
      'really',
      'just',
      'like',
      'know',
      'well',
      'also',
      'very',
    ]);

    const wordCounts = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word))
      .reduce((acc: Record<string, number>, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {});

    return Object.keys(wordCounts)
      .sort((a, b) => wordCounts[b] - wordCounts[a])
      .slice(0, 10);
  }

  private getTopTopics(topics: string[], count: number): string[] {
    const topicCounts: Record<string, number> = {};

    topics.forEach(topic => {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });

    return Object.keys(topicCounts)
      .sort((a, b) => topicCounts[b] - topicCounts[a])
      .slice(0, count);
  }

  private calculateResponseTimeStats(
    responseTimes: number[]
  ): ConversationStatistics['responseTimeStats'] {
    if (responseTimes.length === 0) {
      return { average: 0, min: 0, max: 0 };
    }

    const average =
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const min = Math.min(...responseTimes);
    const max = Math.max(...responseTimes);

    return { average, min, max };
  }

  private generateKeyInsights(
    messages: ConversationMessage[],
    messagesByPersona: Record<string, number>
  ): string[] {
    const insights: string[] = [];
    const personas = Object.keys(messagesByPersona);

    if (personas.length > 1) {
      const [persona1, persona2] = personas;
      const ratio = messagesByPersona[persona1] / messagesByPersona[persona2];

      if (ratio > 1.5) {
        insights.push(
          `${persona1} was more active in the conversation (${Math.round(ratio * 100)}% more messages)`
        );
      } else if (ratio < 0.67) {
        insights.push(
          `${persona2} was more active in the conversation (${Math.round((1 / ratio) * 100)}% more messages)`
        );
      } else {
        insights.push(
          'Both participants contributed equally to the conversation'
        );
      }
    }

    const avgLength =
      messages.reduce((sum, msg) => sum + msg.content.length, 0) /
      messages.length;
    if (avgLength > 200) {
      insights.push('Conversation featured detailed, in-depth responses');
    } else if (avgLength < 50) {
      insights.push('Conversation featured brief, concise exchanges');
    }

    return insights;
  }

  private countTopicChanges(messages: ConversationMessage[]): number {
    // Simple topic change detection based on keyword overlap between consecutive message groups
    if (messages.length < 4) {
      return 0;
    }

    let topicChanges = 0;
    const windowSize = 2;

    for (
      let i = windowSize;
      i < messages.length - windowSize;
      i += windowSize
    ) {
      const prevWindow = messages.slice(i - windowSize, i);
      const currWindow = messages.slice(i, i + windowSize);

      const prevKeywords = new Set(
        this.extractKeywords(prevWindow.map(m => m.content).join(' '))
      );
      const currKeywords = new Set(
        this.extractKeywords(currWindow.map(m => m.content).join(' '))
      );

      const overlap = [...prevKeywords].filter(word =>
        currKeywords.has(word)
      ).length;
      const overlapRatio =
        overlap / Math.max(prevKeywords.size, currKeywords.size, 1);

      if (overlapRatio < 0.3) {
        topicChanges++;
      }
    }

    return topicChanges;
  }

  private getEmptyStatistics(): ConversationStatistics {
    return {
      totalMessages: 0,
      messagesByPersona: {},
      averageMessageLength: 0,
      conversationDuration: 0,
      responseTimeStats: { average: 0, min: 0, max: 0 },
      topicProgression: [],
      keyInsights: ['No messages to analyze'],
      conversationFlow: {
        turnsTaken: 0,
        averageTurnLength: 0,
        topicChanges: 0,
      },
    };
  }
}
