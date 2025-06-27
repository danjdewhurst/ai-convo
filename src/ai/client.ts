import { Ollama } from 'ollama';
import type { AIResponse, AIClientOptions } from '../types/index.js';
import { AIClientError } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class OllamaClient {
  private client: Ollama;
  private options: Required<AIClientOptions>;

  constructor(options: AIClientOptions) {
    this.options = {
      baseUrl: 'http://localhost:11434',
      temperature: 0.7,
      maxTokens: 2000,
      ...options,
    };

    this.client = new Ollama({
      host: this.options.baseUrl,
    });

    logger.debug('OllamaClient initialized', { options: this.options });
  }

  async generateResponse(
    prompt: string,
    systemPrompt?: string,
    context?: string[]
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      logger.debug('Generating response', {
        promptLength: prompt.length,
        hasSystemPrompt: !!systemPrompt,
        contextLength: context?.length || 0,
      });

      const messages = this.buildMessages(prompt, systemPrompt, context);

      const response = await this.client.chat({
        model: this.options.model,
        messages,
        options: {
          temperature: this.options.temperature,
          num_predict: this.options.maxTokens,
        },
      });

      const aiResponse: AIResponse = {
        content: response.message.content.trim(),
        model: this.options.model,
        timestamp: new Date(),
        ...(response.eval_count && { tokensUsed: response.eval_count }),
      };

      const duration = Date.now() - startTime;
      logger.debug('Response generated successfully', {
        duration,
        tokensUsed: aiResponse.tokensUsed,
        responseLength: aiResponse.content.length,
      });

      return aiResponse;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to generate response', { error, duration });

      if (error instanceof Error) {
        throw new AIClientError(
          `Failed to generate response: ${error.message}`,
          undefined,
          { originalError: error.message, duration }
        );
      }

      throw new AIClientError(
        'Unknown error occurred while generating response',
        undefined,
        { duration }
      );
    }
  }

  private buildMessages(
    prompt: string,
    systemPrompt?: string,
    context?: string[]
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    // Add system prompt if provided
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    // Add context messages if provided
    if (context && context.length > 0) {
      // Add context as alternating user/assistant messages
      context.forEach((contextMessage, index) => {
        messages.push({
          role: index % 2 === 0 ? 'user' : 'assistant',
          content: contextMessage,
        });
      });
    }

    // Add the current prompt
    messages.push({
      role: 'user',
      content: prompt,
    });

    return messages;
  }

  async checkConnection(): Promise<boolean> {
    try {
      logger.debug('Checking Ollama connection');

      const models = await this.client.list();
      const modelExists = models.models.some(
        m => m.name === this.options.model
      );

      if (!modelExists) {
        logger.warn(
          `Model ${this.options.model} not found in available models`,
          {
            availableModels: models.models.map(m => m.name),
          }
        );
        return false;
      }

      logger.debug('Ollama connection verified', {
        model: this.options.model,
        totalModels: models.models.length,
      });
      return true;
    } catch (error) {
      logger.error('Failed to connect to Ollama', { error });
      return false;
    }
  }

  async listAvailableModels(): Promise<string[]> {
    try {
      const models = await this.client.list();
      return models.models.map(m => m.name);
    } catch (error) {
      logger.error('Failed to list available models', { error });
      throw new AIClientError(
        'Failed to retrieve available models',
        undefined,
        {
          originalError:
            error instanceof Error ? error.message : 'Unknown error',
        }
      );
    }
  }

  getModelName(): string {
    return this.options.model;
  }

  updateOptions(newOptions: Partial<AIClientOptions>): void {
    this.options = { ...this.options, ...newOptions };
    logger.debug('Client options updated', { options: this.options });
  }
}
