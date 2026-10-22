import type { User } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: "same-origin",
      ...options,
    });
  } catch {
    throw new ApiError(
      "Cannot reach Desk. Check your connection and try again.",
      0,
    );
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      "Desk returned an unreadable response. Please try again.",
      response.status,
    );
  }
  if (!response.ok)
    throw new ApiError(
      data.error || "Something went wrong. Please try again.",
      response.status,
    );
  return data;
}

export function signIn(email: string, password: string) {
  return request<User>("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}
