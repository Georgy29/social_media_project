const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError ||
    (typeof error === "object" &&
      error !== null &&
      "status" in error &&
      "message" in error)
  );
}

export function toApiError(
  error: unknown,
  fallbackStatus = 0,
  fallbackMessage = "Network error. Please try again.",
): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof Error)
    return new ApiError(fallbackStatus, error.message);
  if (isApiError(error)) {
    const status =
      typeof error.status === "number" ? error.status : fallbackStatus;
    const message =
      typeof error.message === "string" ? error.message : fallbackMessage;
    const details = "details" in error ? error.details : undefined;
    return new ApiError(status, message, details);
  }
  return new ApiError(fallbackStatus, fallbackMessage);
}

const TOKEN_KEY = "access_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

type ApiFetchOptions = RequestInit & {
  auth?: boolean;
};

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const body = options.body;

  const isForm =
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob;

  if (body && !isForm && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth !== false) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw toApiError(error);
  }

  if (!res.ok) {
    let details: unknown = null;
    const contentType = res.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      details = await res.json().catch(() => null);
    } else {
      details = await res.text().catch(() => null);
    }

    const message =
      typeof details === "string" && details
        ? details
        : ((details as { detail?: string })?.detail ?? res.statusText);

    throw new ApiError(res.status, message, details);
  }

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }

  return (await res.text()) as unknown as T;
}
