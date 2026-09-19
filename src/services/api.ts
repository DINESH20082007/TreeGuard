// Central API service for TreeGuard

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem('treeguard_token') || sessionStorage.getItem('treeguard_token');
  } catch {
    return null;
  }
}

export function setStoredToken(token: string, rememberMe: boolean = false) {
  try {
    if (rememberMe) {
      localStorage.setItem('treeguard_token', token);
      sessionStorage.removeItem('treeguard_token');
    } else {
      sessionStorage.setItem('treeguard_token', token);
      localStorage.removeItem('treeguard_token');
    }
  } catch {
    // Storage access error handling
  }
}

export function clearStoredToken() {
  try {
    localStorage.removeItem('treeguard_token');
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('treeguard_token');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
  } catch {
    // Storage access error handling
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (!(options.body instanceof FormData)) {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    if (response.status === 401 && token) {
      // Clear expired / invalid token from storage
      clearStoredToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('treeguard:auth_expired'));
      }
    }
    const errorMessage = data?.detail || data?.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMessage) as Error & { status?: number; data?: any };
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data as T;
}
