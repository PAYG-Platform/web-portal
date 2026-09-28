/**
 * Extracts and cleans the root domain from environment settings.
 * Example: "https://app.example.com" or "example.com" -> "example.com"
 */
export const getRootDomain = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_URL || '';
  if (
    !envUrl ||
    envUrl.includes('localhost') ||
    envUrl.includes('127.0.0.1') ||
    envUrl.includes('api-gateway')
  ) {
    return '';
  }

  try {
    const parsed = new URL(envUrl.startsWith('http') ? envUrl : `https://${envUrl}`);
    // Extract base domain e.g. "app.example.com" -> "example.com"
    const hostParts = parsed.hostname.split('.');
    if (hostParts.length > 2) {
      return hostParts.slice(-2).join('.');
    }
    return parsed.hostname;
  } catch {
    return envUrl.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');
  }
};

/**
 * Resolves the absolute or relative target URL for any microservice endpoint.
 * In development, returns relative paths for the Vite dev proxy.
 * In subdomain production, dynamically routes to the respective microservice subdomain.
 */
export const resolveEndpointUrl = (endpoint: string): string => {
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const domain = getRootDomain();

  // 1. Local / Docker Dev Gateway Mode
  if (!domain) {
    return cleanPath;
  }

  // 2. Production Multi-Subdomain Resolution Mode
  const protocol = window.location.protocol === 'http:' ? 'http:' : 'https:';

  if (cleanPath.startsWith('/api/iam')) {
    return `${protocol}//iam.${domain}${cleanPath.replace('/api/iam', '')}`;
  }
  if (cleanPath.startsWith('/api/node')) {
    return `${protocol}//node.${domain}${cleanPath.replace('/api/node', '')}`;
  }
  if (cleanPath.startsWith('/api/billing')) {
    return `${protocol}//billing.${domain}${cleanPath.replace('/api/billing', '')}`;
  }
  if (cleanPath.startsWith('/api/support')) {
    return `${protocol}//support.${domain}${cleanPath.replace('/api/support', '')}`;
  }
  if (cleanPath.startsWith('/api/notifications')) {
    return `${protocol}//notifications.${domain}${cleanPath.replace('/api/notifications', '/notifications')}`;
  }
  if (cleanPath.startsWith('/notifications')) {
    return `${protocol}//notifications.${domain}${cleanPath}`;
  }
  if (cleanPath.startsWith('/api/config')) {
    return `${protocol}//config.${domain}${cleanPath.replace('/api/config', '')}`;
  }
  if (cleanPath.startsWith('/api/traffic')) {
    return `${protocol}//traffic.${domain}${cleanPath.replace('/api/traffic', '')}`;
  }
  if (cleanPath.startsWith('/uploads/receipts/')) {
    return `${protocol}//billing.${domain}${cleanPath}`;
  }
  if (cleanPath.startsWith('/uploads/tickets/')) {
    return `${protocol}//support.${domain}${cleanPath}`;
  }
  if (cleanPath.startsWith('/uploads')) {
    return `${protocol}//support.${domain}${cleanPath}`;
  }
  if (cleanPath.startsWith('/sub/')) {
    return `${protocol}//node.${domain}${cleanPath}`;
  }

  return cleanPath;
};

/**
 * Legacy base URL helper.
 */
export const getBaseUrl = (): string => {
  const domain = getRootDomain();
  if (!domain) return '';
  const protocol = window.location.protocol === 'http:' ? 'http:' : 'https:';
  return `${protocol}//${domain}`;
};

export interface ApiErrorOptions {
  status: number;
  statusText: string;
  data?: any;
}

export class ApiError extends Error {
  status: number;
  statusText: string;
  data?: any;

  constructor(message: string, options: ApiErrorOptions) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.statusText = options.statusText;
    this.data = options.data;
  }
}

/**
 * Sanitizes technical or raw browser error strings into clean, user-friendly messages.
 */
function formatFriendlyErrorMessage(rawMessage: string, status?: number): string {
  const lower = (rawMessage || '').toLowerCase();

  // Network / Connection / Offline / CORS Errors
  if (
    lower.includes('networkerror') ||
    lower.includes('failed to fetch') ||
    lower.includes('net::err') ||
    lower.includes('network error') ||
    status === 0
  ) {
    return 'Unable to connect to the server gateway. Please check your internet connection.';
  }

  // Server Crashes (500)
  if (status === 500) {
    return 'An unexpected server error occurred. Please try again shortly or contact support.';
  }

  // Gateway / Bad Gateway / Unavailable (502, 503, 504)
  if (status === 502 || status === 503 || status === 504) {
    return 'The API service is temporarily unavailable or restarting. Please try again in a few seconds.';
  }

  return rawMessage;
}

/**
 * Core API Request Handler for PAYG VPN Platform.
 * Intercepts requests, handles HttpOnly cookies, FormData, subdomain routing, and formats clean error messages.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = resolveEndpointUrl(endpoint);
  const isFormData = options.body instanceof FormData;

  // Do not set default Content-Type for FormData so the browser can attach multipart boundaries
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (isFormData && headers['Content-Type']) {
    delete headers['Content-Type'];
  }

  const config: RequestInit = {
    ...options,
    credentials: 'include', // Automatically sends and receives HttpOnly session cookies across subdomains
    headers,
  };

  try {
    const response = await fetch(url, config);

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {} as T;
    }

    // Handle HTTP Error Responses (4xx, 5xx)
    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      let errorData: any = null;

      try {
        errorData = await response.json();

        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          // Format FastAPI Pydantic validation error array cleanly
          errorMessage = errorData.detail
            .map((err: any) => `${err.loc?.join('.') || 'Field'}: ${err.msg}`)
            .join('; ');
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        errorMessage = response.statusText || errorMessage;
      }

      const friendlyMessage = formatFriendlyErrorMessage(errorMessage, response.status);

      throw new ApiError(friendlyMessage, {
        status: response.status,
        statusText: response.statusText,
        data: errorData,
      });
    }

    // Parse and return JSON on success
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const rawMsg = (error as Error).message || '';
    const friendlyMessage = formatFriendlyErrorMessage(rawMsg, 0);

    throw new ApiError(friendlyMessage, {
      status: 0,
      statusText: 'NETWORK_ERROR',
    });
  }
}

/**
 * Helper to resolve media/upload asset URLs.
 */
export const getMediaUrl = (url?: string): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  
  return resolveEndpointUrl(url);
};

/**
 * REST Helper Methods
 */
export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: any, options?: RequestInit) => {
    const isFormData = body instanceof FormData;
    return apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });
  },

  put: <T>(endpoint: string, body?: any, options?: RequestInit) => {
    const isFormData = body instanceof FormData;
    return apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });
  },

  patch: <T>(endpoint: string, body?: any, options?: RequestInit) => {
    const isFormData = body instanceof FormData;
    return apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });
  },

  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};