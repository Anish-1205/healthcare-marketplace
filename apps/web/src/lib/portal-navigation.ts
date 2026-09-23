import type { Portal } from '@carebridge/shared';

const PORTAL_HOME: Record<Portal, string> = {
  patient: '/',
  doctor: '/doctor',
  organization: '/organization',
  pharmacy: '/pharmacy',
  admin: '/admin',
};

export function portalHome(portal: Portal): string {
  return PORTAL_HOME[portal];
}

/**
 * Only return a pre-login destination when it belongs to the signed-in user's
 * portal. This prevents a stale public/patient route from sending staff back to
 * the generic homepage after authentication.
 */
export function postLoginDestination(portal: Portal, from?: string): string {
  const home = portalHome(portal);
  if (!from || from === '/login') return home;
  if (portal === 'patient') return from;
  return from === home || from.startsWith(`${home}/`) ? from : home;
}
