// Core conversation types
export interface ConversationMessage {
  id: string;
  personaName: string;
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ConversationHistory {
  messages: ConversationMessage[];
  startTime: Date;
  endTime?: Date;
  topic?: string;
  totalMessages: number;
}

// Conversation summary types
export interface ConversationSummary {
  id: string;
  type: 'periodic' | 'context_compact' | 'final';
  content: string;
  messageRange: {
    start: number;
    end: number;
  };
  createdAt: Date;
  keyTopics: string[];
  participantContributions: Record<string, string>;
}

// Conversation statistics types
export interface ConversationStatistics {
  totalMessages: number;
  messagesByPersona: Record<string, number>;
  averageMessageLength: number;
  conversationDuration: number;
  responseTimeStats: {
    average: number;
    min: number;
    max: number;
  };
  topicProgression: string[];
  keyInsights: string[];
  conversationFlow: {
    turnsTaken: number;
    averageTurnLength: number;
    topicChanges: number;
  };
}

// Persona configuration
export interface PersonaConfig {
  name: string;
  personality: string;
  speakingStyle: string;
  interests: string[];
  systemPrompt?: string;
}

// Application configuration
export interface Config {
  ollama: {
    baseUrl: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  conversation: {
    maxTurns?: number;
    turnDelay: number;
    contextWindow: number;
  };
  personas: {
    primary: PersonaConfig;
    secondary: PersonaConfig;
  };
}

// AI client types
export interface AIResponse {
  content: string;
  tokensUsed?: number;
  model: string;
  timestamp: Date;
}

export interface AIClientOptions {
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

// Conversation state
export interface ConversationState {
  isActive: boolean;
  currentTurn: number;
  maxTurns?: number;
  history: ConversationHistory;
  currentPersona: 'primary' | 'secondary';
  context: string[];
}

// CLI types
export interface CLIOptions {
  topic?: string;
  maxTurns?: number;
  speed?: 'slow' | 'medium' | 'fast';
  model?: string;
  export?: string;
}

// Error types
export class ConversationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ConversationError';
  }
}

export class AIClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AIClientError';
  }
}

// Utility types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}
