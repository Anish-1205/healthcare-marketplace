// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { isValidElement } from 'react';
import type { RouteObject } from 'react-router-dom';
import { NotificationsPage } from '@/pages/doctor/doctor-notifications-page';
import { AddressesPage } from '@/pages/profile/addresses-page';
import { ProfilePage } from '@/pages/profile/profile-page';
import { StaticPage } from '@/pages/static-page';
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

describe('profile and footer routes', () => {
  it.each([
    ['/profile', ProfilePage],
    ['/profile/addresses', AddressesPage],
    ['/about', StaticPage],
    ['/contact', StaticPage],
    ['/privacy', StaticPage],
    ['/terms', StaticPage],
  ])('%s renders a real page', (path, component) => {
    const route = findRoute(router.routes, path);
    if (!isValidElement(route?.element)) throw new Error(`Expected ${path} to render a React element.`);
    expect(route.element.type).toBe(component);
  });
});
