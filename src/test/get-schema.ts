import requireFromString = require("require-from-string");

export function getSchema(result: string): unknown {
  const lines = result.split("\n").filter(Boolean);
  return requireFromString(lines[lines.length - 1]).schema;
}
