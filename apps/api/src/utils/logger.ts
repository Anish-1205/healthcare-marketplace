/* eslint-disable no-console */
type Level = 'debug' | 'info' | 'warn' | 'error';

function serialize(meta?: Record<string, unknown>): string {
  if (!meta) return '';
  const normalized = Object.fromEntries(
    Object.entries(meta).map(([key, value]) =>
      value instanceof Error ? [key, { message: value.message, stack: value.stack }] : [key, value],
    ),
  );
  return ` ${JSON.stringify(normalized)}`;
}

function write(level: Level, message: string, meta?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'test' && level !== 'error') return;
  const line = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} ${message}${serialize(meta)}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

/** Minimal structured logger. Swap for pino/winston when moving beyond the demo. */
export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => write('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => write('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write('error', message, meta),
};
