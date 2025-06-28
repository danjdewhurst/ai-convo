import inquirer from 'inquirer';
import { DEFAULT_PERSONAS } from '../conversation/personas.js';

export interface ConversationInput {
  initialPrompt: string;
  topic?: string;
  maxTurns?: number;
  personas?: [string, string];
  speed?: 'slow' | 'medium' | 'fast';
  model?: string;
}

export class CLIPrompts {
  static async getConversationInput(): Promise<ConversationInput> {
    const questions = [
      {
        type: 'input',
        name: 'initialPrompt',
        message: 'What should the AI personas discuss?',
        validate: (input: string | undefined) => {
          if (!input || !input.trim()) {
            return 'Please enter a topic or question for the AI personas to discuss.';
          }
          if (input.trim().length < 10) {
            return 'Please provide a more detailed topic or question (at least 10 characters).';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'topic',
        message: 'Give this conversation a topic/title (optional):',
        validate: (input: string | undefined) => {
          if (input && input.trim() && input.trim().length < 3) {
            return 'Topic should be at least 3 characters long or left empty.';
          }
          return true;
        },
        filter: (input: string | undefined) =>
          (input && input.trim()) || undefined,
      },
      {
        type: 'number',
        name: 'maxTurns',
        message:
          'Maximum number of conversation turns (leave empty for unlimited):',
        validate: (input: number) => {
          if (
            input !== undefined &&
            (isNaN(input) || input < 1 || input > 100)
          ) {
            return 'Please enter a number between 1 and 100, or leave empty for unlimited.';
          }
          return true;
        },
        filter: (input: number) => {
          if (isNaN(input) || input === 0) {
            return undefined;
          }
          return input;
        },
      },
      {
        type: 'list',
        name: 'speed',
        message: 'Conversation speed:',
        choices: [
          { name: 'Slow (3 seconds between messages)', value: 'slow' },
          { name: 'Medium (2 seconds between messages)', value: 'medium' },
          { name: 'Fast (1 second between messages)', value: 'fast' },
        ],
        default: 'medium',
      },
    ];

    const answers = await inquirer.prompt(questions);
    return answers as ConversationInput;
  }

  static async getPersonaSelection(): Promise<[string, string]> {
    const personaNames = Object.keys(DEFAULT_PERSONAS);
    const personaChoices = personaNames.map(key => ({
      name: `${DEFAULT_PERSONAS[key].name} - ${DEFAULT_PERSONAS[key].personality}`,
      value: key,
    }));

    const questions = [
      {
        type: 'list',
        name: 'persona1',
        message: 'Select the first AI persona:',
        choices: personaChoices,
      },
      {
        type: 'list',
        name: 'persona2',
        message: 'Select the second AI persona:',
        choices: (answers: { persona1: string }) =>
          personaChoices.filter(choice => choice.value !== answers.persona1),
      },
    ];

    const answers = (await inquirer.prompt(questions)) as {
      persona1: string;
      persona2: string;
    };
    return [answers.persona1, answers.persona2];
  }

  static async getModelSelection(availableModels: string[]): Promise<string> {
    if (availableModels.length === 0) {
      throw new Error('No models available');
    }

    if (availableModels.length === 1) {
      return availableModels[0];
    }

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'model',
        message: 'Select the AI model to use:',
        choices: availableModels,
        default: availableModels[0],
      },
    ]);

    return answer.model;
  }

  static async confirmStart(config: {
    prompt: string;
    topic?: string;
    maxTurns?: number;
    model: string;
    personas: [string, string];
  }): Promise<boolean> {
    // eslint-disable-next-line no-console
    console.log('\n📋 Conversation Configuration:');
    // eslint-disable-next-line no-console
    console.log(`   Topic: ${config.topic || 'Not specified'}`);
    // eslint-disable-next-line no-console
    console.log(
      `   Initial prompt: ${config.prompt.substring(0, 80)}${config.prompt.length > 80 ? '...' : ''}`
    );
    // eslint-disable-next-line no-console
    console.log(`   Max turns: ${config.maxTurns || 'Unlimited'}`);
    // eslint-disable-next-line no-console
    console.log(`   Model: ${config.model}`);
    // eslint-disable-next-line no-console
    console.log(
      `   Personas: ${DEFAULT_PERSONAS[config.personas[0]].name} & ${DEFAULT_PERSONAS[config.personas[1]].name}`
    );

    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'Start the conversation with these settings?',
        default: true,
      },
    ]);

    return answer.confirmed;
  }

  static async getExportOptions(): Promise<{
    format: 'json' | 'markdown';
    filename?: string;
  }> {
    const questions = [
      {
        type: 'list',
        name: 'format',
        message: 'Export format:',
        choices: [
          { name: 'JSON (structured data)', value: 'json' },
          { name: 'Markdown (readable format)', value: 'markdown' },
        ],
        default: 'markdown',
      },
      {
        type: 'input',
        name: 'filename',
        message: 'Export filename (leave empty for auto-generated):',
        validate: (input: string | undefined) => {
          if (input && input.trim() && !/^[a-zA-Z0-9_-]+$/.test(input.trim())) {
            return 'Filename should only contain letters, numbers, underscores, and dashes.';
          }
          return true;
        },
        filter: (input: string | undefined) =>
          (input && input.trim()) || undefined,
      },
    ];

    return await inquirer.prompt(questions);
  }

  static async showExitPrompt(): Promise<{
    action: 'export' | 'exit';
    exportOptions?: { format: 'json' | 'markdown'; filename?: string };
  }> {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Export conversation', value: 'export' },
          { name: 'Exit without exporting', value: 'exit' },
        ],
        default: 'export',
      },
    ]);

    if (answer.action === 'export') {
      const exportOptions = await this.getExportOptions();
      return { action: 'export', exportOptions };
    }

    return { action: 'exit' };
  }

  static async handleError(error: Error): Promise<'retry' | 'exit'> {
    // eslint-disable-next-line no-console
    console.error(`\n❌ Error: ${error.message}`);

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Try again', value: 'retry' },
          { name: 'Exit', value: 'exit' },
        ],
        default: 'retry',
      },
    ]);

    return answer.action;
  }
}
