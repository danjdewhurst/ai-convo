# TypeScript CLI AI Conversation App - Technical Plan

## Project Overview

A TypeScript CLI application that initiates and maintains an autonomous conversation between two AI personas using Ollama. The app starts with user input and then continues the conversation automatically until stopped.

## Architecture Overview

### Core Components

1. **CLI Interface** - Handle user input and display conversation
2. **Conversation Manager** - Orchestrate the conversation flow
3. **AI Client** - Interface with Ollama API
4. **Persona Manager** - Manage distinct AI personas
5. **State Manager** - Track conversation history and context

### Technology Stack

- **Runtime**: Node.js 22
- **Language**: TypeScript 5.x
- **Package Manager**: npm/pnpm
- **CLI Framework**: Commander.js or Inquirer.js
- **AI Integration**: Ollama JavaScript client
- **Testing**: Vitest
- **Linting**: ESLint with TypeScript plugin
- **Formatting**: Prettier
- **Build Tool**: tsx/tsup for development and production builds

## Project Structure

```
ai-conversation-cli/
├── src/
│   ├── index.ts              # Entry point
│   ├── cli/
│   │   ├── commands.ts       # CLI command definitions
│   │   └── prompts.ts        # User input handling
│   ├── conversation/
│   │   ├── manager.ts        # Conversation orchestration
│   │   ├── personas.ts       # AI persona definitions
│   │   └── history.ts        # Conversation history management
│   ├── ai/
│   │   ├── client.ts         # Ollama client wrapper
│   │   └── models.ts         # AI model configurations
│   ├── utils/
│   │   ├── logger.ts         # Logging utilities
│   │   └── formatter.ts      # Output formatting
│   └── types/
│       └── index.ts          # TypeScript type definitions
├── tests/
│   ├── unit/
│   └── integration/
├── .eslintrc.json
├── .prettierrc
├── tsconfig.json
├── vitest.config.ts
├── package.json
└── README.md
```

## Implementation Plan

### Phase 1: Project Setup

1. **Initialize Project**
   - [x] Create package.json with Node 22 engine requirement
   - [x] Install TypeScript and development dependencies
   - [x] Configure TypeScript (tsconfig.json)
   - [x] Set up ESLint with TypeScript rules
   - [x] Configure Prettier
   - [x] Set up Vitest for testing

2. **Development Environment**
   - [x] Configure hot reloading with tsx
   - [x] Set up debug configurations
   - [x] Create npm scripts for common tasks

### Phase 2: Core Infrastructure

1. **CLI Foundation**
   - [x] Implement basic CLI structure using Commander.js
   - [x] Create initial prompt for user input using Inquirer.js
   - [x] Add graceful shutdown handling (Ctrl+C)
   - [x] Implement colored output using chalk

2. **Ollama Integration**
   - [x] Install and configure Ollama client
   - [x] Create abstraction layer for AI interactions
   - [x] Implement error handling for API failures
   - [x] Add configuration for different models

### Phase 3: Conversation Logic

1. **Persona System**
   - [x] Define persona interface with characteristics
   - [x] Create at least two distinct personas
   - [x] Implement persona switching logic
   - [x] Add personality traits to responses

2. **Conversation Manager**
   - [x] Implement turn-based conversation flow
   - [x] Add context window management
   - [x] Create conversation history tracking
   - [x] Implement stopping conditions

3. **State Management**
   - [x] Track conversation state
   - [x] Implement conversation export functionality
   - [ ] Add conversation replay capability

### Phase 4: Features & Polish

1. **Enhanced Features**
   - [ ] Add conversation speed control
   - [ ] Implement conversation themes/topics
   - [ ] Add conversation statistics
   - [ ] Create conversation summaries
   - [ ] Compact context into summaries when context window limit is approached

2. **User Experience**
   - [x] Add loading indicators
   - [x] Implement real-time typing effect
   - [x] Add conversation timestamps
   - [x] Create clear visual separation between speakers

### Phase 5: Testing & Documentation

1. **Testing Strategy**
   - [ ] Unit tests for core logic
   - [ ] Integration tests for Ollama interaction
   - [ ] Mock Ollama responses for testing
   - [ ] Test CLI commands and user flows

2. **Documentation**
   - [ ] API documentation
   - [ ] User guide
   - [ ] Configuration options
   - [ ] Example conversations

## Configuration Schema

```typescript
interface Config {
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

interface PersonaConfig {
  name: string;
  personality: string;
  speakingStyle: string;
  interests: string[];
}
```

## Key Dependencies

```json
{
  "dependencies": {
    "commander": "^12.0.0",
    "inquirer": "^9.2.0",
    "ollama": "^0.5.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.56.0",
    "prettier": "^3.2.0",
    "vitest": "^1.2.0",
    "tsx": "^4.7.0",
    "tsup": "^8.0.0"
  }
}
```

## Development Workflow

1. **Local Development**

   ```bash
   npm run dev          # Start with hot reload
   npm run lint         # Run ESLint
   npm run format       # Run Prettier
   npm run test         # Run tests
   npm run test:watch   # Run tests in watch mode
   ```

2. **Build & Distribution**
   ```bash
   npm run build        # Build for production
   npm run start        # Run production build
   ```

## Error Handling Strategy

1. **Ollama Connection Errors**
   - Retry logic with exponential backoff
   - Graceful degradation
   - Clear error messages

2. **User Input Validation**
   - Validate conversation starters
   - Handle empty inputs
   - Provide helpful error messages

3. **Runtime Errors**
   - Global error handler
   - Logging to file option
   - Debug mode for development

## Performance Considerations

1. **Memory Management**
   - Limit conversation history size
   - Implement circular buffer for long conversations
   - Clear old context periodically

2. **API Optimization**
   - Implement request queuing
   - Add response caching where appropriate
   - Monitor API rate limits

## Security Considerations

1. **Input Sanitization**
   - Sanitize user inputs
   - Prevent prompt injection
   - Validate API responses

2. **Configuration Security**
   - Support environment variables
   - Secure API key storage
   - No sensitive data in logs

## Future Enhancements

1. **Multiple AI Providers**
   - Support for OpenAI, Anthropic, etc.
   - Provider abstraction layer

2. **Advanced Features**
   - Multi-party conversations
   - Voice input/output
   - Web interface option
   - Conversation branching

3. **Analytics**
   - Conversation metrics
   - Response quality tracking
   - User behavior analytics

## Success Criteria

1. **Functionality**
   - Smooth conversation flow
   - Distinct personas
   - Reliable Ollama integration
   - Graceful error handling

2. **Code Quality**
   - 80%+ test coverage
   - No ESLint errors
   - Consistent formatting
   - Well-documented code

3. **User Experience**
   - < 2s response time
   - Clear, intuitive interface
   - Helpful error messages
   - Smooth conversation display

## Notes

- Ensure Ollama is installed and running locally
- Consider Docker setup for easier distribution
- Plan for different conversation styles and topics
- Think about conversation export formats (JSON, Markdown, etc.)
