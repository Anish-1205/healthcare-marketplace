import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { isProduction } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: { code: 'ROUTE_NOT_FOUND', message: `No route for ${req.method} ${req.path}.` },
  });
}

function fromPrisma(error: Prisma.PrismaClientKnownRequestError): AppError | null {
  switch (error.code) {
    case 'P2002':
      return new AppError(409, 'DUPLICATE_RECORD', 'A record with these details already exists.', {
        target: error.meta?.target,
      });
    case 'P2003':
      return new AppError(400, 'INVALID_REFERENCE', 'A referenced record does not exist.');
    case 'P2025':
      return new AppError(404, 'NOT_FOUND', 'The requested record was not found.');
    default:
      return null;
  }
}

// Express identifies error handlers by arity, so `_next` must stay.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  let appError: AppError | null = null;

  if (err instanceof AppError) appError = err;
  else if (err instanceof Prisma.PrismaClientKnownRequestError) appError = fromPrisma(err);
  else if (err instanceof SyntaxError && 'body' in err) {
    appError = new AppError(400, 'INVALID_JSON', 'Request body is not valid JSON.');
  }

  if (!appError) {
    logger.error('Unhandled error', { requestId: req.requestId, path: req.path, error: err });
    appError = new AppError(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
  } else if (appError.status >= 500) {
    logger.error(appError.message, { requestId: req.requestId, code: appError.code });
  }

  res.status(appError.status).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details !== undefined ? { details: appError.details } : {}),
      ...(!isProduction && appError.status === 500 && err instanceof Error ? { debug: err.message } : {}),
    },
  });
}
