export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (code: string, message: string, details?: unknown) =>
  new AppError(400, code, message, details);

export const unauthorized = (message = 'Authentication is required.', code = 'UNAUTHORIZED') =>
  new AppError(401, code, message);

export const forbidden = (message = 'You do not have permission to perform this action.', code = 'FORBIDDEN') =>
  new AppError(403, code, message);

export const notFound = (entity: string, code = 'NOT_FOUND') =>
  new AppError(404, code, `${entity} was not found.`);

export const conflict = (code: string, message: string) => new AppError(409, code, message);
