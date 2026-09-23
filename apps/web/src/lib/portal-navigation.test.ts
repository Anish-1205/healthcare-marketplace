import { describe, expect, it } from 'vitest';
import type { Portal } from '@carebridge/shared';
import { postLoginDestination } from './portal-navigation';

describe('postLoginDestination', () => {
  it.each([
    ['Patient', 'patient', '/'],
    ['Doctor', 'doctor', '/doctor'],
    ['Clinic', 'organization', '/organization'],
    ['Hospital', 'organization', '/organization'],
    ['Pharmacy', 'pharmacy', '/pharmacy'],
    ['Platform Employee', 'admin', '/admin'],
    ['Platform Admin', 'admin', '/admin'],
    ['Super Admin', 'admin', '/admin'],
  ] as const)('routes the %s demo account to its portal', (_label, portal, expected) => {
    expect(postLoginDestination(portal, '/')).toBe(expected);
  });

  it('preserves a protected destination inside the same portal', () => {
    expect(postLoginDestination('doctor', '/doctor/appointments')).toBe('/doctor/appointments');
  });

  it('does not let a stale destination cross portal boundaries', () => {
    const cases: Array<[Portal, string]> = [
      ['doctor', '/appointments'],
      ['organization', '/'],
      ['pharmacy', '/medicines'],
      ['admin', '/appointments'],
    ];
    for (const [portal, from] of cases) {
      expect(postLoginDestination(portal, from)).not.toBe(from);
    }
  });
});
