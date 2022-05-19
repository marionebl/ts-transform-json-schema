import { Config, Definition } from "ts-json-schema-generator";

export { Config, Definition };

export function fromType<T>(args?: Partial<Config>): Definition | null {
    throw new Error("fromType should not be used during runtime, apply ts-transform-json-schema instead");
}
