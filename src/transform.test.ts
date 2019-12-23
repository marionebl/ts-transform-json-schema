import * as Test from "./test";
import { Transformer, transformFile } from "ts-transformer-testing-library";
import Ts from "typescript";
import { getTransformer } from "./transform";

const transformer = new Transformer().addTransformer(getTransformer).addMock({
  name: "ts-transform-json-schema",
  content: `export function fromType<T>(opts?: any) { throw new Error('should be transpiled') }`
});

jest.mock("typescript-json-schema", () => ({
  generateSchema: jest.fn()
}));

afterEach(() => {
  jest.resetAllMocks();
});

test("creates basic schema", () => {
  const result = transformer.transform(`
    import { fromType } from "ts-transform-json-schema";

    export interface A {
      a: string;
    }

    export const schema = fromType<A>();
  `);

  expect(result).not.toContain("fromType");
});

test("calls typescript-json-schema with options", async () => {
  const options = { required: true };
  const tjs = await import("typescript-json-schema");

  transformer.transform(`
    import { fromType } from "ts-transform-json-schema";

    export interface A {
      ab: string;
      cd?: string;
    }

    export const schema = fromType<A>(${JSON.stringify(options)});
  `);

  expect(tjs.generateSchema).toHaveBeenCalledWith(expect.any(Object), "A", {
    required: true
  });
});

test("removes ts-transform-json-schema import", async () => {
  const result = transformer.transform(`
    import { fromType } from "ts-transform-json-schema";
    console.log(fromType);
  `);

  expect(result).not.toContain("ts-transform-json-schema");
});

test("keeps other imports intact", async () => {
  const result = transformer.addMock({ name: "b", content: "export {}" })
    .transform(`
      import { fromType } from "ts-transform-json-schema";
      import * as B from "b";
      console.log(fromType, B);
    `);

  expect(result).not.toContain("ts-transform-json-schema");
  expect(result).toContain('import * as B from "b"');
});
