/**
 * Tiny helpers shared by route handlers: consistent JSON + error envelopes.
 */
import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Wrap a handler so thrown errors become a 500 JSON envelope instead of crashing. */
export function handle<T extends unknown[]>(fn: (...args: T) => Promise<Response>) {
  return async (...args: T): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Internal error";
      return fail(message, 500);
    }
  };
}
