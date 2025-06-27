import { EventEmitter } from 'events';
import type {
  ConversationState,
  Config,
  PersonaConfig,
  ConversationMessage,
  CLIOptions,
} from '../types/index.js';
import { ConversationError } from '../types/index.js';
import { OllamaClient } from '../ai/client.js';
import { PersonaManager } from './personas.js';
import { ConversationHistoryManager } from './history.js';
import { logger } from '../utils/logger.js';

export interface ConversationEvents {
  message: (message: ConversationMessage) => void;
  thinking: (personaName: string) => void;
  error: (error: Error) => void;
  started: () => void;
  ended: (stats: { totalMessages: number; duration: number }) => void;
}

export class ConversationManager extends EventEmitter {
  private aiClient: OllamaClient;
  private personaManager: PersonaManager;
  private historyManager: ConversationHistoryManager;
  private state: ConversationState;
  private config: Config;
  private isRunning: boolean = false;

  constructor(config: Config) {
    super();

    this.config = config;
    this.aiClient = new OllamaClient({
      baseUrl: config.ollama.baseUrl,
      model: config.ollama.model,
      temperature: config.ollama.temperature,
      maxTokens: config.ollama.maxTokens,
    });

    this.personaManager = new PersonaManager({
      primary: config.personas.primary,
      secondary: config.personas.secondary,
    });

    this.historyManager = new ConversationHistoryManager(
      undefined, // topic will be set later
      1000, // max messages
      config.conversation.contextWindow
    );

    this.state = {
      isActive: false,
      currentTurn: 0,
      history: this.historyManager.getConversationHistory(),
      currentPersona: 'primary',
      context: [],
      ...(config.conversation.maxTurns && {
        maxTurns: config.conversation.maxTurns,
      }),
    };

    logger.debug('ConversationManager initialized', { config });
  }

  async startConversation(
    initialPrompt: string,
    options: CLIOptions = {}
  ): Promise<void> {
    try {
      // Validate connection
      const isConnected = await this.aiClient.checkConnection();
      if (!isConnected) {
        throw new ConversationError(
          'Failed to connect to Ollama. Please ensure Ollama is running and the specified model is available.',
          'CONNECTION_FAILED'
        );
      }

      // Setup conversation
      this.isRunning = true;
      this.state.isActive = true;
      this.state.currentTurn = 0;

      if (options.topic) {
        this.historyManager.setTopic(options.topic);
      }

      if (options.maxTurns) {
        this.state.maxTurns = options.maxTurns;
      }

      logger.info('Starting conversation', {
        initialPrompt: initialPrompt.substring(0, 100) + '...',
        options,
      });

      this.emit('started');

      // Add initial prompt to history
      const initialMessage = this.historyManager.addMessage(
        'User',
        initialPrompt
      );
      this.emit('message', initialMessage);

      // Start the conversation loop
      await this.runConversationLoop();
    } catch (error) {
      logger.error('Failed to start conversation', { error });
      this.isRunning = false;
      this.state.isActive = false;

      if (error instanceof Error) {
        this.emit('error', error);
      } else {
        this.emit(
          'error',
          new ConversationError('Unknown error occurred', 'UNKNOWN_ERROR')
        );
      }
    }
  }

  private async runConversationLoop(): Promise<void> {
    while (this.isRunning && this.state.isActive) {
      try {
        // Check stopping conditions
        if (this.shouldStopConversation()) {
          break;
        }

        // Get current persona
        const currentPersona = this.getCurrentPersona();
        if (!currentPersona) {
          throw new ConversationError(
            'Current persona not found',
            'PERSONA_NOT_FOUND'
          );
        }

        // Generate response
        this.emit('thinking', currentPersona.name);
        const responseContent =
          await this.generatePersonaResponse(currentPersona);

        // Add response to history
        const responseMessage = this.historyManager.addMessage(
          currentPersona.name,
          responseContent,
          {
            turn: this.state.currentTurn,
            model: this.aiClient.getModelName(),
          }
        );

        this.emit('message', responseMessage);

        // Update state
        this.state.currentTurn++;
        this.switchPersona();
        this.updateContext();

        // Add delay between turns
        await this.sleep(this.config.conversation.turnDelay);
      } catch (error) {
        logger.error('Error in conversation loop', {
          error,
          turn: this.state.currentTurn,
        });

        if (error instanceof Error) {
          this.emit('error', error);
        }

        // Continue the loop unless it's a critical error
        if (error instanceof ConversationError && error.code === 'CRITICAL') {
          break;
        }
      }
    }

    await this.endConversation();
  }

  private async generatePersonaResponse(
    persona: PersonaConfig
  ): Promise<string> {
    try {
      const context = this.historyManager.getContextWindow();
      const systemPrompt =
        persona.systemPrompt || this.buildDefaultSystemPrompt(persona);

      // Build conversation prompt
      const conversationContext = context.slice(-10).join('\n'); // Last 10 messages
      const prompt = this.buildConversationPrompt(conversationContext, persona);

      const response = await this.aiClient.generateResponse(
        prompt,
        systemPrompt,
        context
      );

      return (response.content || '').trim();
    } catch (error) {
      logger.error('Failed to generate persona response', {
        personaName: persona.name,
        error,
      });

      throw new ConversationError(
        `Failed to generate response for ${persona.name}`,
        'GENERATION_FAILED',
        { personaName: persona.name, originalError: error }
      );
    }
  }

  private buildConversationPrompt(
    conversationContext: string,
    persona: PersonaConfig
  ): string {
    const topic = this.historyManager.getConversationHistory().topic;
    let prompt = '';

    if (topic) {
      prompt += `The conversation topic is: ${topic}\n\n`;
    }

    prompt += `Recent conversation:\n${conversationContext}\n\n`;
    prompt += `Please respond as ${persona.name}, continuing this conversation naturally. `;
    prompt += `Stay true to your character and speaking style.`;

    return prompt;
  }

  private buildDefaultSystemPrompt(persona: PersonaConfig): string {
    return `You are ${persona.name}. 

Personality: ${persona.personality}

Speaking Style: ${persona.speakingStyle}

Interests: ${persona.interests.join(', ')}

Please respond in character, keeping your responses conversational and engaging (2-4 sentences typically).`;
  }

  private getCurrentPersona(): PersonaConfig | undefined {
    const personaKey = this.state.currentPersona;
    return personaKey === 'primary'
      ? this.config.personas.primary
      : this.config.personas.secondary;
  }

  private switchPersona(): void {
    this.state.currentPersona =
      this.state.currentPersona === 'primary' ? 'secondary' : 'primary';
  }

  private updateContext(): void {
    this.state.context = this.historyManager.getContextWindow();
    this.state.history = this.historyManager.getConversationHistory();
  }

  private shouldStopConversation(): boolean {
    // Check max turns
    if (this.state.maxTurns && this.state.currentTurn >= this.state.maxTurns) {
      logger.info('Conversation stopped: max turns reached', {
        currentTurn: this.state.currentTurn,
        maxTurns: this.state.maxTurns,
      });
      return true;
    }

    // Check if manually stopped
    if (!this.isRunning) {
      return true;
    }

    return false;
  }

  private async endConversation(): Promise<void> {
    this.isRunning = false;
    this.state.isActive = false;
    this.historyManager.endConversation();

    const stats = this.historyManager.getMessageStats();

    logger.info('Conversation ended', {
      totalMessages: stats.totalMessages,
      duration: stats.conversationDuration,
      turns: this.state.currentTurn,
    });

    this.emit('ended', {
      totalMessages: stats.totalMessages,
      duration: stats.conversationDuration,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public control methods
  stopConversation(): void {
    logger.info('Conversation stop requested');
    this.isRunning = false;
  }

  pauseConversation(): void {
    // Implementation for pausing
    logger.info('Conversation paused');
  }

  resumeConversation(): void {
    // Implementation for resuming
    logger.info('Conversation resumed');
  }

  getState(): ConversationState {
    return { ...this.state };
  }

  getHistory(): ConversationHistoryManager {
    return this.historyManager;
  }

  exportConversation(format: 'json' | 'markdown' = 'json'): string {
    return format === 'json'
      ? this.historyManager.exportToJSON()
      : this.historyManager.exportToMarkdown();
  }

  // Event handling type safety
  on<K extends keyof ConversationEvents>(
    event: K,
    listener: ConversationEvents[K]
  ): this {
    return super.on(event, listener);
  }

  emit<K extends keyof ConversationEvents>(
    event: K,
    ...args: Parameters<ConversationEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}
