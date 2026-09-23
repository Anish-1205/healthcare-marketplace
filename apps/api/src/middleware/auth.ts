import type { NextFunction, Request, Response } from 'express';
import type { Permission, Role } from '@carebridge/shared';
import { verifyAccessToken } from '../modules/auth/token';
import { loadAuth } from '../services/auth-context.service';
import { forbidden, unauthorized } from '../utils/errors';

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

async function resolveAuth(req: Request, required: boolean) {
  const token = bearerToken(req);
  if (!token) {
    if (required) throw unauthorized();
    return;
  }

  const userId = verifyAccessToken(token);
  if (!userId) throw unauthorized('Your session has expired. Please sign in again.', 'INVALID_TOKEN');

  const loaded = await loadAuth(userId);
  if (!loaded) throw unauthorized('Your session is no longer valid. Please sign in again.', 'INVALID_TOKEN');
  if (loaded.status !== 'ACTIVE') throw forbidden('This account is not active.', 'ACCOUNT_INACTIVE');

  req.auth = loaded.context;
}

/** Requires a valid access token. Populates req.auth. */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  await resolveAuth(req, true);
  next();
}

/** Populates req.auth when a valid token is present; anonymous requests pass through. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  await resolveAuth(req, false);
  next();
}

/** Requires the user to hold at least one of the given roles. Use after `authenticate`. */
export function requireRoles(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) throw unauthorized();
    if (!req.auth.roles.some((role) => roles.includes(role))) throw forbidden();
    next();
  };
}

/** Requires at least one of the given permissions (from the shared RBAC matrix). Use after `authenticate`. */
export function requirePermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) throw unauthorized();
    if (!permissions.some((permission) => req.auth!.permissions.has(permission))) throw forbidden();
    next();
  };
}

/** Narrow req.auth for handlers mounted behind `authenticate`. */
export function getAuth(req: Request) {
  if (!req.auth) throw unauthorized();
  return req.auth;
}
