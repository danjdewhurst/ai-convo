import { Command } from 'commander';
import { promises as fs } from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import type { CLIOptions, Config } from '../types/index.js';
import { ConversationManager } from '../conversation/manager.js';
import { OllamaClient } from '../ai/client.js';
import { CLIPrompts, type ConversationInput } from './prompts.js';
import { ConversationFormatter } from '../utils/formatter.js';
import { DEFAULT_PERSONAS } from '../conversation/personas.js';
import { logger } from '../utils/logger.js';

export class CLICommands {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name('ai-conversation')
      .description(
        'A CLI tool for creating autonomous conversations between AI personas'
      )
      .version('1.0.0');

    // Main conversation command
    this.program
      .command('start')
      .alias('s')
      .description('Start an AI conversation')
      .option('-t, --topic <topic>', 'conversation topic')
      .option('-m, --max-turns <number>', 'maximum number of turns', parseInt)
      .option(
        '-s, --speed <speed>',
        'conversation speed (slow|medium|fast)',
        'medium'
      )
      .option('--model <model>', 'AI model to use')
      .option('-p, --prompt <prompt>', 'initial conversation prompt')
      .option(
        '--personas <personas>',
        'comma-separated persona keys (e.g., alice,bob)'
      )
      .option('-e, --export <format>', 'export format (json|markdown)')
      .option('-o, --output <filename>', 'output filename for export')
      .option('--non-interactive', 'run without interactive prompts')
      .action(
        async (
          options: CLIOptions & {
            prompt?: string;
            personas?: string;
            nonInteractive?: boolean;
            output?: string;
          }
        ) => {
          await this.handleStartCommand(options);
        }
      );

    // List personas command
    this.program
      .command('personas')
      .alias('p')
      .description('List available AI personas')
      .action(() => {
        this.handlePersonasCommand();
      });

    // List models command
    this.program
      .command('models')
      .alias('m')
      .description('List available Ollama models')
      .option('--host <host>', 'Ollama host URL', 'http://localhost:11434')
      .action(async (options: { host: string }) => {
        await this.handleModelsCommand(options);
      });

    // Export command
    this.program
      .command('export <file>')
      .description('Export a conversation file to different formats')
      .option(
        '-f, --format <format>',
        'export format (json|markdown)',
        'markdown'
      )
      .option('-o, --output <filename>', 'output filename')
      .action(
        async (file: string, options: { format: string; output?: string }) => {
          await this.handleExportCommand(file, options);
        }
      );
  }

  private async handleStartCommand(
    options: CLIOptions & {
      prompt?: string;
      personas?: string;
      nonInteractive?: boolean;
      output?: string;
    }
  ): Promise<void> {
    try {
      let input: ConversationInput;
      let selectedPersonas: [string, string];

      if (options.nonInteractive) {
        // Non-interactive mode - use provided options or defaults
        if (!options.prompt) {
          throw new Error('--prompt is required in non-interactive mode');
        }

        input = {
          initialPrompt: options.prompt,
          topic: options.topic,
          maxTurns: options.maxTurns,
          speed: (options.speed as 'slow' | 'medium' | 'fast') || 'medium',
        };

        selectedPersonas = options.personas
          ? this.parsePersonas(options.personas)
          : ['alice', 'bob'];
      } else {
        // Interactive mode
        // eslint-disable-next-line no-console
        console.log(chalk.cyan.bold('\n🤖 AI Conversation CLI\n'));

        if (options.prompt) {
          input = {
            initialPrompt: options.prompt,
            topic: options.topic,
            maxTurns: options.maxTurns,
            speed: (options.speed as 'slow' | 'medium' | 'fast') || 'medium',
          };
        } else {
          input = await CLIPrompts.getConversationInput();
        }

        selectedPersonas = await CLIPrompts.getPersonaSelection();
      }

      // Setup AI client and get available models
      const tempClient = new OllamaClient({
        model: 'gemma3n:e4b', // temporary, will be replaced
        baseUrl: 'http://localhost:11434',
      });

      const spinner = ora('Checking Ollama connection...').start();

      const isConnected = await tempClient.checkConnection();
      if (!isConnected) {
        spinner.fail('Failed to connect to Ollama');
        // eslint-disable-next-line no-console
        console.log(
          chalk.red(
            '\n❌ Please ensure Ollama is running and accessible at http://localhost:11434'
          )
        );
        process.exit(1);
      }

      const availableModels = await tempClient.listAvailableModels();
      spinner.succeed('Connected to Ollama');

      // Model selection
      let selectedModel: string;
      if (options.model) {
        if (!availableModels.includes(options.model)) {
          throw new Error(
            `Model "${options.model}" not found. Available models: ${availableModels.join(', ')}`
          );
        }
        selectedModel = options.model;
      } else if (options.nonInteractive) {
        selectedModel = availableModels[0]; // Use first available model
      } else {
        selectedModel = await CLIPrompts.getModelSelection(availableModels);
      }

      // Build configuration
      const config: Config = this.buildConfig(
        input,
        selectedPersonas,
        selectedModel
      );

      // Confirmation in interactive mode
      if (!options.nonInteractive) {
        const confirmed = await CLIPrompts.confirmStart({
          prompt: input.initialPrompt,
          topic: input.topic,
          maxTurns: input.maxTurns,
          model: selectedModel,
          personas: selectedPersonas,
        });

        if (!confirmed) {
          // eslint-disable-next-line no-console
          console.log(chalk.yellow('Conversation cancelled.'));
          return;
        }
      }

      // Start conversation
      await this.runConversation(config, input, options.output);
    } catch (error) {
      logger.error('Failed to start conversation', { error });

      if (!options.nonInteractive && error instanceof Error) {
        const action = await CLIPrompts.handleError(error);
        if (action === 'retry') {
          return this.handleStartCommand(options);
        }
      }

      process.exit(1);
    }
  }

  private parsePersonas(personasString: string): [string, string] {
    const personas = personasString.split(',').map(p => p.trim());

    if (personas.length !== 2) {
      throw new Error(
        'Exactly two personas must be specified (e.g., alice,bob)'
      );
    }

    const [persona1, persona2] = personas;

    if (!DEFAULT_PERSONAS[persona1]) {
      throw new Error(`Persona "${persona1}" not found`);
    }

    if (!DEFAULT_PERSONAS[persona2]) {
      throw new Error(`Persona "${persona2}" not found`);
    }

    return [persona1, persona2];
  }

  private buildConfig(
    input: ConversationInput,
    personas: [string, string],
    model: string
  ): Config {
    const speedDelays = {
      slow: 3000,
      medium: 2000,
      fast: 1000,
    };

    return {
      ollama: {
        baseUrl: 'http://localhost:11434',
        model,
        temperature: 0.7,
        maxTokens: 2000,
      },
      conversation: {
        maxTurns: input.maxTurns,
        turnDelay: speedDelays[input.speed || 'medium'],
        contextWindow: 20,
      },
      personas: {
        primary: DEFAULT_PERSONAS[personas[0]],
        secondary: DEFAULT_PERSONAS[personas[1]],
      },
    };
  }

  private async runConversation(
    config: Config,
    input: ConversationInput,
    outputFile?: string
  ): Promise<void> {
    const manager = new ConversationManager(config);
    let spinner: ora.Ora | null = null;

    // Setup event handlers
    manager.on('started', () => {
      // eslint-disable-next-line no-console
      console.log(ConversationFormatter.formatConversationStart(input.topic));
    });

    manager.on('thinking', (personaName: string) => {
      if (spinner) {
        spinner.stop();
      }
      spinner = ora(
        ConversationFormatter.formatTypingIndicator(personaName)
      ).start();
    });

    manager.on('message', message => {
      if (spinner) {
        spinner.stop();
        spinner = null;
      }
      // eslint-disable-next-line no-console
      console.log(ConversationFormatter.formatMessage(message));
    });

    manager.on('error', error => {
      if (spinner) {
        spinner.fail();
        spinner = null;
      }
      // eslint-disable-next-line no-console
      console.error(ConversationFormatter.formatError(error));
    });

    manager.on('ended', stats => {
      if (spinner) {
        spinner.stop();
        spinner = null;
      }
      // eslint-disable-next-line no-console
      console.log(
        ConversationFormatter.formatConversationEnd(
          stats.totalMessages,
          stats.duration
        )
      );
    });

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      if (spinner) {
        spinner.stop();
      }
      // eslint-disable-next-line no-console
      console.log(chalk.yellow('\n\n🛑 Stopping conversation...'));
      manager.stopConversation();
    });

    // Start the conversation
    await manager.startConversation(input.initialPrompt, {
      topic: input.topic,
      maxTurns: input.maxTurns,
    });

    // Handle export
    if (outputFile || (!outputFile && process.stdin.isTTY)) {
      await this.handlePostConversationExport(manager, outputFile);
    }
  }

  private async handlePostConversationExport(
    manager: ConversationManager,
    outputFile?: string
  ): Promise<void> {
    try {
      if (outputFile) {
        // Direct export with specified filename
        const format = outputFile.endsWith('.json') ? 'json' : 'markdown';
        const content = manager.exportConversation(format);
        await fs.writeFile(outputFile, content, 'utf-8');
        // eslint-disable-next-line no-console
        console.log(
          ConversationFormatter.formatSuccess(
            `Conversation exported to ${outputFile}`
          )
        );
        return;
      }

      // Interactive export prompt
      const exitAction = await CLIPrompts.showExitPrompt();

      if (exitAction.action === 'export' && exitAction.exportOptions) {
        const { format, filename } = exitAction.exportOptions;
        const content = manager.exportConversation(format);

        const finalFilename = filename || this.generateFilename(format);
        await fs.writeFile(finalFilename, content, 'utf-8');

        // eslint-disable-next-line no-console
        console.log(
          ConversationFormatter.formatSuccess(
            `Conversation exported to ${finalFilename}`
          )
        );
      }
    } catch (error) {
      logger.error('Failed to export conversation', { error });
      // eslint-disable-next-line no-console
      console.error(
        ConversationFormatter.formatError(
          error instanceof Error ? error : new Error('Export failed')
        )
      );
    }
  }

  private generateFilename(format: 'json' | 'markdown'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `ai-conversation-${timestamp}.${format === 'json' ? 'json' : 'md'}`;
  }

  private handlePersonasCommand(): void {
    // eslint-disable-next-line no-console
    console.log(chalk.cyan.bold('\n🎭 Available AI Personas:\n'));

    Object.entries(DEFAULT_PERSONAS).forEach(([key, persona]) => {
      // eslint-disable-next-line no-console
      console.log(chalk.bold(`${persona.name} (${key})`));
      // eslint-disable-next-line no-console
      console.log(`  Personality: ${persona.personality}`);
      // eslint-disable-next-line no-console
      console.log(`  Speaking Style: ${persona.speakingStyle}`);
      // eslint-disable-next-line no-console
      console.log(`  Interests: ${persona.interests.join(', ')}\n`);
    });
  }

  private async handleModelsCommand(options: { host: string }): Promise<void> {
    try {
      const spinner = ora('Fetching available models...').start();

      const client = new OllamaClient({
        model: 'temp',
        baseUrl: options.host,
      });

      const models = await client.listAvailableModels();
      spinner.succeed('Models fetched successfully');

      // eslint-disable-next-line no-console
      console.log(chalk.cyan.bold('\n🤖 Available Ollama Models:\n'));

      if (models.length === 0) {
        // eslint-disable-next-line no-console
        console.log(
          chalk.yellow(
            'No models found. Please install models using: ollama pull <model-name>'
          )
        );
      } else {
        models.forEach((model, index) => {
          // eslint-disable-next-line no-console
          console.log(`${index + 1}. ${chalk.green(model)}`);
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        ConversationFormatter.formatError(
          error instanceof Error ? error : new Error('Failed to fetch models')
        )
      );
      process.exit(1);
    }
  }

  private async handleExportCommand(
    _file: string,
    _options: { format: string; output?: string }
  ): Promise<void> {
    try {
      // This would be used for converting existing conversation files
      // For now, we'll show a placeholder message
      // eslint-disable-next-line no-console
      console.log(
        chalk.yellow(
          'Export command is not yet implemented. Use the conversation export feature instead.'
        )
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        ConversationFormatter.formatError(
          error instanceof Error ? error : new Error('Export failed')
        )
      );
      process.exit(1);
    }
  }

  run(argv?: string[]): void {
    this.program.parse(argv);
  }

  getProgram(): Command {
    return this.program;
  }
}
