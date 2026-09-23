import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  const started = process.hrtime.bigint();

  res.on('finish', () => {
    if (!env.LOG_REQUESTS) return;
    const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`, {
      requestId: req.requestId,
      userId: req.auth?.userId,
    });
  });

  next();
}
