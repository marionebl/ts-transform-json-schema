import * as tjs from "typescript-json-schema";

export function fromType<T>(): tjs.Definition | null {
    throw new Error("fromType should not be used during runtime, apply ts-transform-json-schema instead");
}