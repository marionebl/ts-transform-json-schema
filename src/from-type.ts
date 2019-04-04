import { Args, Definition } from "@marionebl/typescript-json-schema";

export { Args, Definition };

export function fromType<T>(args?: Partial<Args>): Definition | null {
    throw new Error("fromType should not be used during runtime, apply ts-transform-json-schema instead");
}