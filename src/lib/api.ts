export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = 'API_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null): void {
  inMemoryToken = token;
}

export function getAuthToken(): string | null {
  return inMemoryToken;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { isFormData?: boolean } = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('X-Requested-With', 'XMLHttpRequest');

  if (!options.isFormData && options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (inMemoryToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${inMemoryToken}`);
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const message =
      data?.message || data?.error || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data?.code || 'REQUEST_FAILED');
  }

  if (response.status !== 204 && (!isJson || data === null)) {
    throw new ApiError(
      'Received an unexpected non-JSON response from the server.',
      response.status,
      'INVALID_RESPONSE'
    );
  }

  return data as T;
}

export function formatBdt(amount: number): string {
  return `৳${Math.round(amount).toLocaleString('en-US')}`;
}
