// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { isValidElement } from 'react';
import type { RouteObject } from 'react-router-dom';
import { NotificationsPage } from '@/pages/doctor/doctor-notifications-page';
import { router } from './router';

function findRoute(routes: RouteObject[], path: string): RouteObject | undefined {
  for (const route of routes) {
    if (route.path === path) return route;
    const child = route.children && findRoute(route.children, path);
    if (child) return child;
  }
  return undefined;
}

describe('patient notification route', () => {
  it('renders the real notification list instead of the coming-soon placeholder', () => {
    const route = findRoute(router.routes, '/notifications');
    expect(route).toBeDefined();
    expect(isValidElement(route?.element)).toBe(true);
    if (!isValidElement(route?.element)) throw new Error('Expected /notifications to render a React element.');
    expect(route.element.type).toBe(NotificationsPage);
  });
});
