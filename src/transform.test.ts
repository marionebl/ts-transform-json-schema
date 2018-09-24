import * as Test from "./test";
import * as MemFs from "memfs";
import * as requireFromString from "require-from-string";

beforeEach(() => {
  MemFs.vol.reset();
});

test("creates basic schema", () => {
  MemFs.vol.fromJSON({
    "/index.ts": `
    import { fromType } from "ts-transform-json-schema";

    export interface A {
      a: string;
    }

    export const schema = fromType<A>();
  `
  });

  Test.compile(MemFs.fs);

  const mod = requireFromString(String(MemFs.fs.readFileSync("/index.js")).split('\n')
    .find(line => line.indexOf('exports.schema') === 0));

  expect(mod.schema).toEqual(expect.objectContaining({
    properties: { a: { type: "string" } }
  }));
});

test("creates union schemas", () => {
  MemFs.vol.fromJSON({
    "/index.ts": `
    import { fromType } from "ts-transform-json-schema";

    export interface A {
      a: string;
    }

    export interface B {
      b: number;
    }

    export type C = A | B;

    export const schema = fromType<C>();
  `
  });

  Test.compile(MemFs.fs);

  const mod = requireFromString(String(MemFs.fs.readFileSync("/index.js")).split('\n')
    .find(line => line.indexOf('exports.schema') === 0));

  expect(mod.schema).toEqual(expect.objectContaining({
    anyOf: [
      {
        "$ref": "#/definitions/A"
      },
      {
        "$ref": "#/definitions/B"
      }
    ]
  }));
});
