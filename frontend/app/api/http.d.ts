export function apiFetch(
  path: string,
  options?: RequestInit & { body?: string }
): Promise<unknown>;
