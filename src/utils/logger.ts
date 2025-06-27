import chalk from 'chalk';
import type { Logger, LogLevel } from '../types/index.js';

class ConsoleLogger implements Logger {
  private logLevel: LogLevel;

  constructor(logLevel: LogLevel = 'info') {
    this.logLevel = logLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);

    switch (level) {
      case 'debug':
        return chalk.gray(`[${timestamp}] ${levelStr} ${message}`);
      case 'info':
        return chalk.blue(`[${timestamp}] ${levelStr} ${message}`);
      case 'warn':
        return chalk.yellow(`[${timestamp}] ${levelStr} ${message}`);
      case 'error':
        return chalk.red(`[${timestamp}] ${levelStr} ${message}`);
      default:
        return `[${timestamp}] ${levelStr} ${message}`;
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      // eslint-disable-next-line no-console
      console.log(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      // eslint-disable-next-line no-console
      console.log(this.formatMessage('info', message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      // eslint-disable-next-line no-console
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      // eslint-disable-next-line no-console
      console.error(this.formatMessage('error', message), ...args);
    }
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
}

// Export a default logger instance
export const logger = new ConsoleLogger();

// Export the class for custom instances
export { ConsoleLogger };
