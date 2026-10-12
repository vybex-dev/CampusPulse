import { useUIStore } from "@/lib/store";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Client-side fetch. Sends X-Role (logged only) and unwraps the shared error shape. */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Role": useUIStore.getState().role,
      ...init.headers,
    },
  });

  if (!res.ok) {
    let code = "unknown";
    let message = res.statusText || "Request failed";
    try {
      const body = (await res.json()) as {
        error?: { code?: string; message?: string };
      };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
    } catch {
      /* keep defaults */
    }
    throw new ApiError(res.status, code, message);
  }
  return (await res.json()) as T;
}
