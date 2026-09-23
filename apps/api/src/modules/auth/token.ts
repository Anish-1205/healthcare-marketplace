import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Role } from '@carebridge/shared';
import { env } from '../../config/env';

export interface AccessTokenPayload {
  sub: string;
  /** Informational only — authorization always re-reads roles from the database. */
  roles: Role[];
}

const ISSUER = 'carebridge-api';

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign({ roles: payload.roles }, env.JWT_SECRET, {
    subject: payload.sub,
    issuer: ISSUER,
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

/** Returns the user id, or null if the token is invalid or expired. */
export function verifyAccessToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { issuer: ISSUER, algorithms: ['HS256'] });
    return typeof decoded === 'object' && typeof decoded.sub === 'string' ? decoded.sub : null;
  } catch {
    return null;
  }
}
