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
  let transport: { target: string; options: Record<string, unknown> } | undefined;

  if (process.env.NODE_ENV !== 'production') {
    try {
      require.resolve('pino-pretty');
      transport = { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } };
    } catch {
      // pino-pretty not installed (production build) — fall back to plain JSON logging
    }
  }

  return pino({
    name,
    level: process.env.LOG_LEVEL ?? 'info',
    ...(transport && { transport }),
  });
}
