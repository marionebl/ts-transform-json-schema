import { fromFs } from "./from-fs";

export function fromString(code: string, opts?: unknown): string {
  const results = fromFs({ "/index.ts": code }, opts);
  return results["/dist/index.js"];
}
