import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConsoleLogger } from '../../../src/utils/logger.js';

describe('ConsoleLogger', () => {
  let logger: ConsoleLogger;
  let consoleSpy: {
    log: any;
    warn: any;
    error: any;
  };

  beforeEach(() => {
    // Spy on console methods
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };

    logger = new ConsoleLogger();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create logger with default log level "info"', () => {
      const defaultLogger = new ConsoleLogger();
      expect(defaultLogger).toBeDefined();
    });

    it('should create logger with specified log level', () => {
      const debugLogger = new ConsoleLogger('debug');
      expect(debugLogger).toBeDefined();
    });
  });

  describe('debug', () => {
    it('should log debug messages when log level is debug', () => {
      const debugLogger = new ConsoleLogger('debug');
      debugLogger.debug('test debug message');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG test debug message')
      );
    });

    it('should not log debug messages when log level is info', () => {
      const infoLogger = new ConsoleLogger('info');
      infoLogger.debug('test debug message');

      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should include additional arguments', () => {
      const debugLogger = new ConsoleLogger('debug');
      const additionalData = { key: 'value' };
      debugLogger.debug('test message', additionalData);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('test message'),
        additionalData
      );
    });
  });

  describe('info', () => {
    it('should log info messages when log level is info or lower', () => {
      logger.info('test info message');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('INFO  test info message')
      );
    });

    it('should not log info messages when log level is warn', () => {
      const warnLogger = new ConsoleLogger('warn');
      warnLogger.info('test info message');

      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should format message with timestamp and level', () => {
      logger.info('test message');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO  test message/)
      );
    });
  });

  describe('warn', () => {
    it('should log warn messages when log level is warn or lower', () => {
      logger.warn('test warn message');

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARN  test warn message')
      );
    });

    it('should not log warn messages when log level is error', () => {
      const errorLogger = new ConsoleLogger('error');
      errorLogger.warn('test warn message');

      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should always log error messages', () => {
      logger.error('test error message');

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR test error message')
      );
    });

    it('should log error messages even with debug log level', () => {
      const debugLogger = new ConsoleLogger('debug');
      debugLogger.error('test error message');

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR test error message')
      );
    });
  });

  describe('setLogLevel', () => {
    it('should update log level and affect message logging', () => {
      logger.setLogLevel('debug');
      logger.debug('debug message');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG debug message')
      );

      logger.setLogLevel('error');
      consoleSpy.log.mockClear();
      logger.info('info message');

      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe('log level hierarchy', () => {
    const testCases = [
      { level: 'debug', shouldLog: { debug: true, info: true, warn: true, error: true } },
      { level: 'info', shouldLog: { debug: false, info: true, warn: true, error: true } },
      { level: 'warn', shouldLog: { debug: false, info: false, warn: true, error: true } },
      { level: 'error', shouldLog: { debug: false, info: false, warn: false, error: true } },
    ];

    testCases.forEach(({ level, shouldLog }) => {
      it(`should respect log level hierarchy for level: ${level}`, () => {
        const testLogger = new ConsoleLogger(level as any);

        testLogger.debug('debug');
        testLogger.info('info');
        testLogger.warn('warn');
        testLogger.error('error');

        expect(consoleSpy.log).toHaveBeenCalledTimes(
          (shouldLog.debug ? 1 : 0) + (shouldLog.info ? 1 : 0)
        );
        expect(consoleSpy.warn).toHaveBeenCalledTimes(shouldLog.warn ? 1 : 0);
        expect(consoleSpy.error).toHaveBeenCalledTimes(shouldLog.error ? 1 : 0);
      });
    });
  });

  describe('message formatting', () => {
    it('should include ISO timestamp in formatted message', () => {
      logger.info('test');
      
      const [[message]] = consoleSpy.log.mock.calls;
      expect(message).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    it('should pad log level to 5 characters', () => {
      logger.info('test');
      logger.warn('test');
      logger.error('test');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('INFO '), // Note the space for padding
      );
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARN '),
      );
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR'),
      );
    });
  });
}); 