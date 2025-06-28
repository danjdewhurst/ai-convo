import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { CLICommands } from '../../../src/cli/commands.js';

describe('CLICommands Output Directory', () => {
  let commands: CLICommands;
  const outputDir = 'output';

  beforeEach(() => {
    commands = new CLICommands();
  });

  afterEach(async () => {
    // Clean up test output directory
    try {
      await fs.rm(outputDir, { recursive: true });
    } catch {
      // Directory might not exist, ignore error
    }
  });

  describe('Output directory functionality', () => {
    it('should ensure output directory exists', async () => {
      // Use reflection to access private method for testing
      const ensureOutputDirectory = (commands as any).ensureOutputDirectory.bind(commands);
      
      const dir = await ensureOutputDirectory();
      expect(dir).toBe('output');
      
      // Verify directory was created
      const stats = await fs.stat(outputDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should write files to output directory', async () => {
      const writeFileToOutput = (commands as any).writeFileToOutput.bind(commands);
      
      const filename = 'test-file.txt';
      const content = 'Test content';
      
      const fullPath = await writeFileToOutput(filename, content);
      expect(fullPath).toBe(join(outputDir, filename));
      
      // Verify file was created with correct content
      const fileContent = await fs.readFile(fullPath, 'utf-8');
      expect(fileContent).toBe(content);
    });

    it('should generate filenames with correct extensions', () => {
      const generateFilename = (commands as any).generateFilename.bind(commands);
      
      // Test automatic timestamp generation
      const jsonFilename = generateFilename('json');
      const markdownFilename = generateFilename('markdown');
      
      expect(jsonFilename).toMatch(/^ai-conversation-.*\.json$/);
      expect(markdownFilename).toMatch(/^ai-conversation-.*\.md$/);
    });

    it('should handle custom filenames with extensions', () => {
      const generateFilename = (commands as any).generateFilename.bind(commands);
      
      // Test custom filename with extension
      const customWithExt = generateFilename('json', 'my-conversation.json');
      expect(customWithExt).toBe('my-conversation.json');
      
      // Test custom filename without extension
      const customWithoutExt = generateFilename('markdown', 'my-conversation');
      expect(customWithoutExt).toBe('my-conversation.md');
    });

    it('should add correct extensions based on format', () => {
      const generateFilename = (commands as any).generateFilename.bind(commands);
      
      // Test JSON format
      const jsonFile = generateFilename('json', 'test');
      expect(jsonFile).toBe('test.json');
      
      // Test markdown format  
      const mdFile = generateFilename('markdown', 'test');
      expect(mdFile).toBe('test.md');
    });
  });
}); 