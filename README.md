# 🤖 AI Conversation CLI

<div align="center">

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Test Coverage](https://img.shields.io/badge/coverage-80%25-green)](./coverage)

**A powerful TypeScript CLI application that creates autonomous conversations between AI personas using Ollama**

[Features](#-features) • [Installation](#-installation) • [Quick Start](#-quick-start) • [Usage](#-usage) • [Personas](#-personas) • [Development](#-development)

<img src="https://via.placeholder.com/800x400/1a1a2e/16213e?text=AI+Conversation+CLI" alt="AI Conversation CLI Demo" width="600">

</div>

## 🌟 Features

- 🎭 **Multiple AI Personas** - Choose from pre-defined personas with unique personalities and speaking styles
- 💬 **Autonomous Conversations** - Watch AI personas engage in natural, flowing discussions
- 🎨 **Beautiful CLI Interface** - Colored output, typing indicators, and clean formatting
- 🚀 **Multiple Models** - Support for any Ollama-compatible model
- 📊 **Conversation Export** - Save conversations in JSON or Markdown format
- ⚡ **Speed Control** - Adjust conversation pace (slow, medium, fast)
- 🔧 **Flexible Configuration** - Customize models, personas, and conversation parameters
- 🎯 **Interactive & Non-interactive Modes** - Perfect for both manual use and automation

## 📋 Prerequisites

- **Node.js** >= 22.0.0
- **[Ollama](https://ollama.ai/)** installed and running locally
- At least one Ollama model installed (e.g., `ollama pull llama2`)

## 🚀 Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-conversation-cli.git
cd ai-conversation-cli

# Install dependencies
npm install

# Build the project
npm run build

# Link globally (optional)
npm link
```

### Using npm (when published)

```bash
npm install -g ai-conversation-cli
```

## 🎯 Quick Start

1. **Ensure Ollama is running:**

   ```bash
   ollama serve
   ```

2. **Start an interactive conversation:**

   ```bash
   npm run dev start
   # or if installed globally
   ai-conversation start
   ```

3. **Quick conversation with specific personas:**
   ```bash
   npm run dev start --personas alice,bob --prompt "What is consciousness?"
   ```

## 📖 Usage

### Commands

#### `start` - Start a conversation

Start an AI conversation between two personas.

```bash
ai-conversation start [options]
```

**Options:**

- `-t, --topic <topic>` - Set conversation topic
- `-m, --max-turns <number>` - Maximum number of turns (default: unlimited)
- `-s, --speed <speed>` - Conversation speed: slow|medium|fast (default: medium)
- `--model <model>` - Specify Ollama model to use
- `-p, --prompt <prompt>` - Initial conversation prompt
- `--personas <personas>` - Comma-separated persona keys (e.g., alice,bob)
- `-e, --export <format>` - Export format: json|markdown
- `-o, --output <filename>` - Output filename for export
- `--non-interactive` - Run without interactive prompts

**Examples:**

```bash
# Interactive mode (guided setup)
ai-conversation start

# Quick start with specific topic
ai-conversation start --prompt "Discuss the future of AI" --personas alice,bob

# Non-interactive mode with all parameters
ai-conversation start --non-interactive \
  --prompt "What is consciousness?" \
  --personas alice,diana \
  --max-turns 10 \
  --speed fast \
  --model llama2 \
  --output conversation.md
```

#### `personas` - List available personas

Display all available AI personas with their characteristics.

```bash
ai-conversation personas
```

#### `models` - List available models

Show all Ollama models installed on your system.

```bash
ai-conversation models [options]
```

**Options:**

- `--host <host>` - Ollama host URL (default: http://localhost:11434)

### 🎭 Available Personas

| Persona     | Personality              | Interests                                      |
| ----------- | ------------------------ | ---------------------------------------------- |
| **Alice**   | Curious philosopher      | Philosophy, consciousness, ethics, metaphysics |
| **Bob**     | Practical problem-solver | Technology, innovation, engineering, AI        |
| **Charlie** | Empathetic storyteller   | Psychology, emotions, literature, art          |
| **Diana**   | Scientific thinker       | Science, research, data analysis, logic        |

Each persona has unique:

- 🧠 **Personality traits**
- 💭 **Speaking style**
- 🎯 **Areas of interest**
- 📝 **Custom system prompts**

## ⚙️ Configuration

### Conversation Speed

Control the pace of the conversation:

- **Slow**: 3 seconds between messages
- **Medium**: 2 seconds between messages (default)
- **Fast**: 1 second between messages

### Model Selection

The CLI supports any model installed in Ollama:

```bash
# Check available models
ollama list

# Install a new model
ollama pull mistral
```

### Export Formats

#### Markdown Format

```markdown
# AI Conversation

**Topic:** What is consciousness?
**Date:** 2024-01-20
**Duration:** 5m 23s

---

**Alice**: What does it mean to be conscious...

**Bob**: From a practical standpoint...
```

#### JSON Format

```json
{
  "topic": "What is consciousness?",
  "startTime": "2024-01-20T10:30:00Z",
  "messages": [
    {
      "speaker": "Alice",
      "content": "What does it mean to be conscious...",
      "timestamp": "2024-01-20T10:30:01Z"
    }
  ]
}
```

## 🛠️ Development

### Setup Development Environment

```bash
# Install dependencies
npm install

# Run in development mode with hot reload
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

### Project Structure

```
ai-conversation-cli/
├── src/
│   ├── cli/             # CLI commands and prompts
│   ├── conversation/    # Conversation management
│   ├── ai/              # Ollama client integration
│   ├── utils/           # Utilities (logging, formatting)
│   └── types/           # TypeScript type definitions
├── tests/               # Test files
├── coverage/            # Test coverage reports
└── dist/                # Compiled output
```

### Scripts

| Script                  | Description               |
| ----------------------- | ------------------------- |
| `npm run dev`           | Start in development mode |
| `npm run build`         | Build for production      |
| `npm start`             | Run production build      |
| `npm test`              | Run tests                 |
| `npm run test:watch`    | Run tests in watch mode   |
| `npm run test:coverage` | Generate coverage report  |
| `npm run lint`          | Run ESLint                |
| `npm run format`        | Format code with Prettier |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Write tests for new features
- Follow the existing code style
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 📝 API Documentation

### ConversationManager

The core class that orchestrates AI conversations.

```typescript
const manager = new ConversationManager(config);

// Events
manager.on('started', () => {});
manager.on('thinking', (personaName: string) => {});
manager.on('message', (message: Message) => {});
manager.on('error', (error: Error) => {});
manager.on('ended', (stats: ConversationStats) => {});

// Methods
await manager.startConversation(prompt, options);
manager.stopConversation();
manager.exportConversation(format);
```

### Custom Personas

Create your own personas:

```typescript
const customPersona: PersonaConfig = {
  name: 'Echo',
  personality: 'Mysterious and poetic sage',
  speakingStyle: 'Cryptic and metaphorical',
  interests: ['mysteries', 'riddles', 'ancient wisdom'],
  systemPrompt: 'You are Echo, a mysterious sage...',
};
```

## 🐛 Troubleshooting

### Common Issues

1. **"Failed to connect to Ollama"**
   - Ensure Ollama is running: `ollama serve`
   - Check if Ollama is accessible at http://localhost:11434

2. **"No models found"**
   - Install at least one model: `ollama pull llama2`
   - Verify with: `ollama list`

3. **"Node version error"**
   - This project requires Node.js 22 or higher
   - Check your version: `node --version`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai/) for providing local LLM capabilities
- [Commander.js](https://github.com/tj/commander.js/) for CLI framework
- [Inquirer.js](https://github.com/SBoudrias/Inquirer.js/) for interactive prompts
- [Chalk](https://github.com/chalk/chalk) for terminal styling

---

<div align="center">

Made with ❤️ by the Daniel Dewhurst

[⬆ Back to top](#-ai-conversation-cli)

</div>
