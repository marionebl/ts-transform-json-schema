import * as Test from "./test";
import * as MemFs from "memfs";

jest.mock("typescript-json-schema", () => ({
  generateSchema: jest.fn()
}));

beforeEach(() => {
  MemFs.vol.reset();
});

afterEach(() => {
  jest.resetAllMocks();
});

test("creates basic schema", () => {
  const result = Test.fromString(`
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

  Test.fromString(`
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
  const result = Test.fromString(`
    import { fromType } from "ts-transform-json-schema";
    console.log(fromType);
  `);

  expect(result).not.toContain("ts-transform-json-schema");
});

test("keeps other imports intact", async () => {
  const result = Test.fromString(`
    import { fromType } from "ts-transform-json-schema";
    import * as B from "b";
    console.log(fromType, B);
  `);

  expect(result).not.toContain("ts-transform-json-schema");
  expect(result).toContain('require("b")');
});
