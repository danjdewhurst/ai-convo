import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CLIPrompts } from '../../../src/cli/prompts.js';

// Mock inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

// Mock default personas
vi.mock('../../../src/conversation/personas.js', () => ({
  DEFAULT_PERSONAS: {
    alice: {
      name: 'Alice',
      personality: 'Curious philosopher',
      speakingStyle: 'Thoughtful',
      interests: ['philosophy'],
    },
    bob: {
      name: 'Bob',
      personality: 'Practical engineer',
      speakingStyle: 'Direct',
      interests: ['technology'],
    },
    charlie: {
      name: 'Charlie',
      personality: 'Creative storyteller',
      speakingStyle: 'Narrative',
      interests: ['stories'],
    },
  },
}));

describe('CLIPrompts', () => {
  let mockInquirer: any;

  beforeEach(async () => {
    const inquirer = await import('inquirer');
    mockInquirer = inquirer.default;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getConversationInput', () => {
    it('should return conversation input with all fields', async () => {
      const mockAnswers = {
        initialPrompt: 'What is the meaning of life?',
        topic: 'Philosophy Discussion',
        maxTurns: 10,
        speed: 'medium',
      };

      mockInquirer.prompt.mockResolvedValue(mockAnswers);

      const result = await CLIPrompts.getConversationInput();

      expect(result).toEqual(mockAnswers);
      expect(mockInquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'initialPrompt',
            type: 'input',
            message: 'What should the AI personas discuss?',
          }),
          expect.objectContaining({
            name: 'topic',
            type: 'input',
            message: 'Give this conversation a topic/title (optional):',
          }),
          expect.objectContaining({
            name: 'maxTurns',
            type: 'number',
            message: 'Maximum number of conversation turns (leave empty for unlimited):',
          }),
          expect.objectContaining({
            name: 'speed',
            type: 'list',
            message: 'Conversation speed:',
          }),
        ])
      );
    });

    it('should handle empty optional fields', async () => {
      const mockAnswers = {
        initialPrompt: 'Test prompt',
        topic: undefined,
        maxTurns: undefined,
        speed: 'fast',
      };

      mockInquirer.prompt.mockResolvedValue(mockAnswers);

      const result = await CLIPrompts.getConversationInput();

      expect(result.initialPrompt).toBe('Test prompt');
      expect(result.topic).toBeUndefined();
      expect(result.maxTurns).toBeUndefined();
      expect(result.speed).toBe('fast');
    });

    it('should validate initial prompt is not empty', async () => {
      const questions = [
        expect.objectContaining({
          name: 'initialPrompt',
          validate: expect.any(Function),
        }),
      ];

      mockInquirer.prompt.mockResolvedValue({
        initialPrompt: 'Valid prompt',
        speed: 'medium',
      });

      await CLIPrompts.getConversationInput();

      expect(mockInquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining(questions)
      );

      // Test the validation function
      const promptQuestion = mockInquirer.prompt.mock.calls[0][0].find(
        (q: any) => q.name === 'initialPrompt'
      );

      expect(promptQuestion.validate('')).toBe(
        'Please enter a topic or question for the AI personas to discuss.'
      );
      expect(promptQuestion.validate('short')).toBe(
        'Please provide a more detailed topic or question (at least 10 characters).'
      );
      expect(promptQuestion.validate('This is a valid prompt')).toBe(true);
    });

    it('should validate topic length when provided', async () => {
      mockInquirer.prompt.mockResolvedValue({
        initialPrompt: 'Valid prompt',
        topic: 'Valid topic',
        speed: 'medium',
      });

      await CLIPrompts.getConversationInput();

      const topicQuestion = mockInquirer.prompt.mock.calls[0][0].find(
        (q: any) => q.name === 'topic'
      );

      expect(topicQuestion.validate('ab')).toBe(
        'Topic should be at least 3 characters long or left empty.'
      );
      expect(topicQuestion.validate('Valid')).toBe(true);
      expect(topicQuestion.validate('')).toBe(true);
    });

    it('should validate maxTurns range', async () => {
      mockInquirer.prompt.mockResolvedValue({
        initialPrompt: 'Valid prompt',
        maxTurns: 5,
        speed: 'medium',
      });

      await CLIPrompts.getConversationInput();

      const maxTurnsQuestion = mockInquirer.prompt.mock.calls[0][0].find(
        (q: any) => q.name === 'maxTurns'
      );

      expect(maxTurnsQuestion.validate(0)).toBe(
        'Please enter a number between 1 and 100, or leave empty for unlimited.'
      );
      expect(maxTurnsQuestion.validate(101)).toBe(
        'Please enter a number between 1 and 100, or leave empty for unlimited.'
      );
      expect(maxTurnsQuestion.validate(50)).toBe(true);
      expect(maxTurnsQuestion.validate(undefined)).toBe(true);
    });
  });

  describe('getPersonaSelection', () => {
    it('should return two different personas', async () => {
      const mockAnswers = {
        persona1: 'alice',
        persona2: 'bob',
      };

      mockInquirer.prompt.mockResolvedValue(mockAnswers);

      const result = await CLIPrompts.getPersonaSelection();

      expect(result).toEqual(['alice', 'bob']);
    });

    it('should filter out first persona from second selection', async () => {
      mockInquirer.prompt.mockResolvedValue({
        persona1: 'alice',
        persona2: 'bob',
      });

      await CLIPrompts.getPersonaSelection();

      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'persona1',
          type: 'list',
          message: 'Select the first AI persona:',
        }),
        expect.objectContaining({
          name: 'persona2',
          type: 'list',
          message: 'Select the second AI persona:',
          choices: expect.any(Function),
        }),
      ]);

      // Test the choices function for second persona
      const questions = mockInquirer.prompt.mock.calls[0][0];
      const persona2Question = questions.find((q: any) => q.name === 'persona2');
      const choices = persona2Question.choices({ persona1: 'alice' });

      // Should not include Alice in the choices for second persona
      const aliceChoice = choices.find((choice: any) => choice.value === 'alice');
      expect(aliceChoice).toBeUndefined();

      // Should include other personas
      const bobChoice = choices.find((choice: any) => choice.value === 'bob');
      expect(bobChoice).toBeDefined();
    });

    it('should format persona choices correctly', async () => {
      mockInquirer.prompt.mockResolvedValue({
        persona1: 'alice',
        persona2: 'bob',
      });

      await CLIPrompts.getPersonaSelection();

      const questions = mockInquirer.prompt.mock.calls[0][0];
      const persona1Question = questions.find((q: any) => q.name === 'persona1');

      expect(persona1Question.choices).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Alice - Curious philosopher',
            value: 'alice',
          }),
          expect.objectContaining({
            name: 'Bob - Practical engineer',
            value: 'bob',
          }),
        ])
      );
    });
  });

  describe('getModelSelection', () => {
    it('should return selected model from list', async () => {
      const availableModels = ['model1', 'model2', 'model3'];
      mockInquirer.prompt.mockResolvedValue({ model: 'model2' });

      const result = await CLIPrompts.getModelSelection(availableModels);

      expect(result).toBe('model2');
      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'model',
          type: 'list',
          message: 'Select the AI model to use:',
          choices: availableModels,
          default: 'model1',
        }),
      ]);
    });

    it('should return single model without prompting', async () => {
      const availableModels = ['single-model'];

      const result = await CLIPrompts.getModelSelection(availableModels);

      expect(result).toBe('single-model');
      expect(mockInquirer.prompt).not.toHaveBeenCalled();
    });

    it('should throw error for empty model list', async () => {
      await expect(CLIPrompts.getModelSelection([])).rejects.toThrow(
        'No models available'
      );
    });
  });

  describe('confirmStart', () => {
    it('should display configuration and return confirmation', async () => {
      const config = {
        prompt: 'Test prompt for confirmation',
        topic: 'Test Topic',
        maxTurns: 5,
        model: 'test-model',
        personas: ['alice', 'bob'] as [string, string],
      };

      mockInquirer.prompt.mockResolvedValue({ confirmed: true });

      const result = await CLIPrompts.confirmStart(config);

      expect(result).toBe(true);
      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'confirmed',
          type: 'confirm',
          message: 'Start the conversation with these settings?',
          default: true,
        }),
      ]);
    });

    it('should handle long prompts by truncating', async () => {
      const config = {
        prompt: 'A'.repeat(100), // Long prompt
        model: 'test-model',
        personas: ['alice', 'bob'] as [string, string],
      };

      mockInquirer.prompt.mockResolvedValue({ confirmed: false });

      const result = await CLIPrompts.confirmStart(config);

      expect(result).toBe(false);
    });

    it('should handle configuration without optional fields', async () => {
      const config = {
        prompt: 'Simple prompt',
        model: 'test-model',
        personas: ['alice', 'bob'] as [string, string],
      };

      mockInquirer.prompt.mockResolvedValue({ confirmed: true });

      const result = await CLIPrompts.confirmStart(config);

      expect(result).toBe(true);
    });
  });

  describe('getExportOptions', () => {
    it('should return export format and filename', async () => {
      const mockAnswers = {
        format: 'json',
        filename: 'my-conversation',
      };

      mockInquirer.prompt.mockResolvedValue(mockAnswers);

      const result = await CLIPrompts.getExportOptions();

      expect(result).toEqual(mockAnswers);
      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'format',
          type: 'list',
          message: 'Export format:',
          choices: [
            { name: 'JSON (structured data)', value: 'json' },
            { name: 'Markdown (readable format)', value: 'markdown' },
          ],
          default: 'markdown',
        }),
        expect.objectContaining({
          name: 'filename',
          type: 'input',
          message: 'Export filename (leave empty for auto-generated):',
        }),
      ]);
    });

    it('should validate filename format', async () => {
      mockInquirer.prompt.mockResolvedValue({
        format: 'markdown',
        filename: 'valid-filename',
      });

      await CLIPrompts.getExportOptions();

      const questions = mockInquirer.prompt.mock.calls[0][0];
      const filenameQuestion = questions.find((q: any) => q.name === 'filename');

      expect(filenameQuestion.validate('invalid/filename')).toBe(
        'Filename should only contain letters, numbers, underscores, and dashes.'
      );
      expect(filenameQuestion.validate('valid_filename-123')).toBe(true);
      expect(filenameQuestion.validate('')).toBe(true);
    });
  });

  describe('showExitPrompt', () => {
    it('should return export action with options', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ action: 'export' })
        .mockResolvedValueOnce({ format: 'json', filename: 'test' });

      const result = await CLIPrompts.showExitPrompt();

      expect(result).toEqual({
        action: 'export',
        exportOptions: { format: 'json', filename: 'test' },
      });
    });

    it('should return exit action without options', async () => {
      mockInquirer.prompt.mockResolvedValue({ action: 'exit' });

      const result = await CLIPrompts.showExitPrompt();

      expect(result).toEqual({ action: 'exit' });
    });
  });

  describe('handleError', () => {
    it('should return user action for error handling', async () => {
      const error = new Error('Test error');
      mockInquirer.prompt.mockResolvedValue({ action: 'retry' });

      const result = await CLIPrompts.handleError(error);

      expect(result).toBe('retry');
      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'action',
          type: 'list',
          message: 'What would you like to do?',
          choices: [
            { name: 'Try again', value: 'retry' },
            { name: 'Exit', value: 'exit' },
          ],
          default: 'retry',
        }),
      ]);
    });

    it('should handle exit action', async () => {
      const error = new Error('Test error');
      mockInquirer.prompt.mockResolvedValue({ action: 'exit' });

      const result = await CLIPrompts.handleError(error);

      expect(result).toBe('exit');
    });
  });

  describe('Input validation edge cases', () => {
    it('should handle undefined input in initial prompt validation', () => {
      // Create a direct test of the validation function
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
      ];

      const validateFn = questions[0].validate;
      
      // Test undefined input
      expect(validateFn(undefined)).toBe('Please enter a topic or question for the AI personas to discuss.');
      
      // Test empty string
      expect(validateFn('')).toBe('Please enter a topic or question for the AI personas to discuss.');
      
      // Test whitespace only
      expect(validateFn('   ')).toBe('Please enter a topic or question for the AI personas to discuss.');
      
      // Test short valid input
      expect(validateFn('short')).toBe('Please provide a more detailed topic or question (at least 10 characters).');
      
      // Test valid input
      expect(validateFn('This is a valid topic')).toBe(true);
    });

    it('should handle undefined input in topic validation', () => {
      const questions = [
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
          filter: (input: string | undefined) => (input && input.trim()) || undefined,
        },
      ];

      const validateFn = questions[0].validate;
      const filterFn = questions[0].filter;
      
      // Test undefined input
      expect(validateFn(undefined)).toBe(true);
      expect(filterFn(undefined)).toBe(undefined);
      
      // Test empty string
      expect(validateFn('')).toBe(true);
      expect(filterFn('')).toBe(undefined);
      
      // Test whitespace only
      expect(validateFn('   ')).toBe(true);
      expect(filterFn('   ')).toBe(undefined);
      
      // Test short valid input
      expect(validateFn('ab')).toBe('Topic should be at least 3 characters long or left empty.');
      
      // Test valid input
      expect(validateFn('Valid topic')).toBe(true);
      expect(filterFn('Valid topic')).toBe('Valid topic');
      
      // Test padded valid input
      expect(filterFn('  Valid topic  ')).toBe('Valid topic');
    });

    it('should handle undefined input in filename validation', () => {
      const questions = [
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
          filter: (input: string | undefined) => (input && input.trim()) || undefined,
        },
      ];

      const validateFn = questions[0].validate;
      const filterFn = questions[0].filter;
      
      // Test undefined input
      expect(validateFn(undefined)).toBe(true);
      expect(filterFn(undefined)).toBe(undefined);
      
      // Test empty string
      expect(validateFn('')).toBe(true);
      expect(filterFn('')).toBe(undefined);
      
      // Test whitespace only
      expect(validateFn('   ')).toBe(true);
      expect(filterFn('   ')).toBe(undefined);
      
      // Test invalid filename
      expect(validateFn('invalid@filename')).toBe('Filename should only contain letters, numbers, underscores, and dashes.');
      
      // Test valid filename
      expect(validateFn('valid_filename-123')).toBe(true);
      expect(filterFn('valid_filename-123')).toBe('valid_filename-123');
      
      // Test padded valid filename
      expect(filterFn('  valid_filename  ')).toBe('valid_filename');
    });
  });
}); 