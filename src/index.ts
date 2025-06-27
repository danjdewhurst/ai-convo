#!/usr/bin/env node

import { CLICommands } from './cli/commands.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  try {
    const cli = new CLICommands();
    cli.run(process.argv);
  } catch (error) {
    logger.error('Application error', { error });
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', { reason, promise });
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

// Run the application
main().catch((error) => {
  logger.error('Failed to start application', { error });
  process.exit(1);
}); 