import { useAuthStore } from '@/stores/auth.store';
import { queryClient } from './query-client';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

function getToken(): string | null {
  // Zustand store is the fast path (already set after first load)
  const storeToken = useAuthStore.getState().accessToken;
  if (storeToken) return storeToken;

  // On new-tab load, the refresh query resolves before useEffect sets the Zustand store.
  // Children's queries fire before the parent's useEffect, so we read the token
  // directly from the query cache as a fallback to avoid the race condition.
  const cached = queryClient.getQueryData<{ accessToken: string; user: unknown }>(['auth', 'session']);
  return cached?.accessToken ?? null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...init } = options;

  let url = `${BASE_URL}/api${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) searchParams.set(k, String(v));
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const token = getToken();
  const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  const body = await res.json();

  if (!res.ok) {
    throw new ApiError(body.error?.message ?? 'Request failed', res.status, body.error?.code);
  }

  return body.data as T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: 'GET', ...options }),
  post: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), ...options }),
  patch: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body), ...options }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: 'DELETE', ...options }),

  // For multipart/form-data (file uploads) — browser sets Content-Type + boundary automatically
  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    const token = getToken();
    const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const res = await fetch(`${BASE_URL}/api${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeader,
      body: formData,
    });

    const body = await res.json();
    if (!res.ok) {
      throw new ApiError(body.error?.message ?? 'Upload failed', res.status, body.error?.code);
    }
    return body.data as T;
  },
};
