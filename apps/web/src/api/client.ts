import type { ApiFailure } from '@carebridge/shared';
import { API_URL } from '@/config/env';
import { useAuthStore } from '@/store/auth-store';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequestOptions {
  params?: object;
  signal?: AbortSignal;
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(`${API_URL}${path}`, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function request<T>(method: string, path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  const token = useAuthStore.getState().token;
  const res = await fetch(buildUrl(path, options?.params), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options?.signal,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json() : null;

  if (!res.ok) {
    const failure = payload as ApiFailure | null;
    if (res.status === 401 && failure?.error.code !== 'INVALID_CREDENTIALS') {
      // Session is no longer valid anywhere in the app — clear it so the UI reflects signed-out state.
      useAuthStore.getState().clear();
    }
    throw new ApiError(res.status, failure?.error.code ?? 'UNKNOWN_ERROR', failure?.error.message ?? 'Something went wrong.', failure?.error.details);
  }

  return payload as T;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<{ success: true; data: T }>('GET', path, undefined, options).then((r) => r.data),
  getPaginated: <T>(path: string, options?: RequestOptions) => request<{ success: true; data: T[]; meta: Paginated<T>['meta'] }>('GET', path, undefined, options).then((r) => ({ data: r.data, meta: r.meta })),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<{ success: true; data: T }>('POST', path, body, options).then((r) => r.data),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<{ success: true; data: T }>('PATCH', path, body, options).then((r) => r.data),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<{ success: true; data: T }>('PUT', path, body, options).then((r) => r.data),
  del: <T>(path: string, options?: RequestOptions) => request<{ success: true; data: T }>('DELETE', path, undefined, options).then((r) => r.data),
};
