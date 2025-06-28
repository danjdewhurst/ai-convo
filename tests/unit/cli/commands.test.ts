import { describe, it, expect, beforeEach } from 'vitest';
import { CLICommands } from '../../../src/cli/commands.js';

describe('CLICommands', () => {
  let commands: CLICommands;

  beforeEach(() => {
    commands = new CLICommands();
  });

  describe('Program setup', () => {
    it('should create a program with the correct name', () => {
      const program = commands.getProgram();
      expect(program.name()).toBe('ai-conversation');
    });

    it('should have the correct version', () => {
      const program = commands.getProgram();
      expect(program.version()).toBe('1.0.0');
    });

    it('should have the start command', () => {
      const program = commands.getProgram();
      const startCommand = program.commands.find(cmd => cmd.name() === 'start');
      expect(startCommand).toBeDefined();
      expect(startCommand?.alias()).toBe('s');
    });

    it('should have the personas command', () => {
      const program = commands.getProgram();
      const personasCommand = program.commands.find(cmd => cmd.name() === 'personas');
      expect(personasCommand).toBeDefined();
      expect(personasCommand?.alias()).toBe('p');
    });

    it('should have the models command', () => {
      const program = commands.getProgram();
      const modelsCommand = program.commands.find(cmd => cmd.name() === 'models');
      expect(modelsCommand).toBeDefined();
      expect(modelsCommand?.alias()).toBe('m');
    });

    it('should have the export command', () => {
      const program = commands.getProgram();
      const exportCommand = program.commands.find(cmd => cmd.name() === 'export');
      expect(exportCommand).toBeDefined();
    });
  });

  describe('Filename generation', () => {
    it('should generate filenames with correct extensions and timestamp pattern', () => {
      const generateFilename = (commands as any).generateFilename.bind(commands);
      
      // Test JSON format
      const jsonFilename = generateFilename('json');
      expect(jsonFilename).toMatch(/^ai-conversation-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/);
      
      // Test markdown format
      const markdownFilename = generateFilename('markdown');
      expect(markdownFilename).toMatch(/^ai-conversation-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.md$/);
    });

    it('should generate different filenames on consecutive calls', async () => {
      const generateFilename = (commands as any).generateFilename.bind(commands);
      
      const filename1 = generateFilename('json');
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      const filename2 = generateFilename('json');
      
      expect(filename1).not.toBe(filename2);
    });
  });

  describe('Persona parsing', () => {
    it('should parse valid persona strings', () => {
      const parsePersonas = (commands as any).parsePersonas.bind(commands);
      
      const result = parsePersonas('alice,bob');
      expect(result).toEqual(['alice', 'bob']);
    });

    it('should handle whitespace in persona strings', () => {
      const parsePersonas = (commands as any).parsePersonas.bind(commands);
      
      const result = parsePersonas('alice, bob');
      expect(result).toEqual(['alice', 'bob']);
    });

    it('should throw error for invalid number of personas', () => {
      const parsePersonas = (commands as any).parsePersonas.bind(commands);
      
      expect(() => parsePersonas('alice')).toThrow('Exactly two personas must be specified');
      expect(() => parsePersonas('alice,bob,charlie')).toThrow('Exactly two personas must be specified');
    });

    it('should throw error for non-existent personas', () => {
      const parsePersonas = (commands as any).parsePersonas.bind(commands);
      
      expect(() => parsePersonas('alice,nonexistent')).toThrow('Persona "nonexistent" not found');
      expect(() => parsePersonas('nonexistent,bob')).toThrow('Persona "nonexistent" not found');
    });
  });

  describe('File extension handling', () => {
    it('should ensure correct extension for JSON format', () => {
      const ensureCorrectExtension = (commands as any).ensureCorrectExtension.bind(commands);
      
      expect(ensureCorrectExtension('myfile', 'json')).toBe('myfile.json');
      expect(ensureCorrectExtension('myfile.json', 'json')).toBe('myfile.json');
      expect(ensureCorrectExtension('myfile.txt', 'json')).toBe('myfile.json');
      expect(ensureCorrectExtension('myfile.md', 'json')).toBe('myfile.json');
    });

    it('should ensure correct extension for markdown format', () => {
      const ensureCorrectExtension = (commands as any).ensureCorrectExtension.bind(commands);
      
      expect(ensureCorrectExtension('myfile', 'markdown')).toBe('myfile.md');
      expect(ensureCorrectExtension('myfile.md', 'markdown')).toBe('myfile.md');
      expect(ensureCorrectExtension('myfile.txt', 'markdown')).toBe('myfile.md');
      expect(ensureCorrectExtension('myfile.json', 'markdown')).toBe('myfile.md');
    });

    it('should handle files with multiple dots in name', () => {
      const ensureCorrectExtension = (commands as any).ensureCorrectExtension.bind(commands);
      
      expect(ensureCorrectExtension('my.file.name', 'json')).toBe('my.file.json');
      expect(ensureCorrectExtension('my.file.name.txt', 'json')).toBe('my.file.name.json');
      expect(ensureCorrectExtension('version.1.0.backup', 'markdown')).toBe('version.1.0.md');
    });

    it('should handle file paths', () => {
      const ensureCorrectExtension = (commands as any).ensureCorrectExtension.bind(commands);
      
      expect(ensureCorrectExtension('/path/to/myfile', 'json')).toBe('/path/to/myfile.json');
      expect(ensureCorrectExtension('./relative/path/myfile.txt', 'markdown')).toBe('./relative/path/myfile.md');
      expect(ensureCorrectExtension('../parent/myfile.json', 'markdown')).toBe('../parent/myfile.md');
    });

    it('should handle edge cases', () => {
      const ensureCorrectExtension = (commands as any).ensureCorrectExtension.bind(commands);
      
      // File with no extension
      expect(ensureCorrectExtension('filename', 'json')).toBe('filename.json');
      
      // File ending with dot
      expect(ensureCorrectExtension('filename.', 'json')).toBe('filename.json');
      
      // Hidden file with extension
      expect(ensureCorrectExtension('.hidden.txt', 'markdown')).toBe('.hidden.md');
      
      // Hidden file without extension
      expect(ensureCorrectExtension('.hidden', 'json')).toBe('.hidden.json');
    });
  });
}); 