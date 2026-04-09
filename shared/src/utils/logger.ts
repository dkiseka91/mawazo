import pino from 'pino';

/**
 * Create a named pino logger. Each package gets its own named logger
 * so log lines can be filtered by component.
 *
 * @example
 *   const logger = createLogger('webhook');
 *   logger.info({ phone }, 'Received message');
 */
export function createLogger(name: string): pino.Logger {
  return pino({
    name,
    level: process.env.LOG_LEVEL ?? 'info',
    ...(process.env.NODE_ENV !== 'production' && {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss' },
      },
    }),
  });
}
