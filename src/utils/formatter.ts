import chalk from 'chalk';
import type { ConversationMessage } from '../types/index.js';

export class ConversationFormatter {
  private static readonly SEPARATOR = '─'.repeat(80);
  private static readonly TYPING_INDICATOR = '●●●';

  static formatMessage(message: ConversationMessage): string {
    const timestamp = this.formatTimestamp(message.timestamp);
    const header = this.formatHeader(message.personaName, timestamp);
    const content = this.formatContent(message.content);

    return `${header}\n${content}\n`;
  }

  private static formatHeader(personaName: string, timestamp: string): string {
    const formattedName = this.formatPersonaName(personaName);
    return `${formattedName} ${chalk.gray(`(${timestamp})`)}\n${chalk.gray(this.SEPARATOR)}`;
  }

  private static formatPersonaName(name: string): string {
    // Alternate colors for different personas
    const colors = [
      chalk.cyan.bold,
      chalk.magenta.bold,
      chalk.green.bold,
      chalk.yellow.bold,
    ];

    const hash = this.simpleHash(name);
    const colorFn = colors[hash % colors.length];

    return colorFn(`💬 ${name}`);
  }

  private static formatContent(content: string): string {
    // Wrap long lines and add proper indentation
    const maxWidth = 76; // Account for indentation
    const words = content.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxWidth) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          lines.push(`  ${currentLine}`);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(`  ${currentLine}`);
    }

    return lines.join('\n');
  }

  private static formatTimestamp(timestamp: Date): string {
    return timestamp.toLocaleTimeString();
  }

  private static simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  static formatTypingIndicator(personaName: string): string {
    const formattedName = this.formatPersonaName(personaName);
    return `${formattedName} is typing ${chalk.gray(this.TYPING_INDICATOR)}`;
  }

  static formatConversationStart(topic?: string): string {
    const title = chalk.bold.green('🤖 AI Conversation Started');
    const separator = chalk.green('='.repeat(80));

    let output = `${separator}\n${title}\n`;

    if (topic) {
      output += `${chalk.gray('Topic:')} ${chalk.white(topic)}\n`;
    }

    output += `${chalk.gray('Press Ctrl+C to stop the conversation')}\n${separator}\n`;

    return output;
  }

  static formatConversationEnd(
    totalMessages: number,
    duration: number
  ): string {
    const title = chalk.bold.red('🛑 Conversation Ended');
    const separator = chalk.red('='.repeat(80));
    const stats = `${chalk.gray('Total messages:')} ${totalMessages} | ${chalk.gray('Duration:')} ${this.formatDuration(duration)}`;

    return `\n${separator}\n${title}\n${stats}\n${separator}`;
  }

  private static formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  static formatError(error: Error): string {
    return chalk.red.bold(`❌ Error: ${error.message}`);
  }

  static formatWarning(message: string): string {
    return chalk.yellow.bold(`⚠️  Warning: ${message}`);
  }

  static formatSuccess(message: string): string {
    return chalk.green.bold(`✅ ${message}`);
  }

  static formatInfo(message: string): string {
    return chalk.blue(`ℹ️  ${message}`);
  }
}
