import * as Test from "./test";
import * as MemFs from "memfs";
import * as requireFromString from "require-from-string";
import { fromType } from "./from-type";

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

  const mod = requireFromString(
    String(MemFs.fs.readFileSync("/index.js"))
      .split("\n")
      .find(line => line.indexOf("exports.schema") === 0)
  );

  expect(mod.schema).toEqual(
    expect.objectContaining({
      properties: { a: { type: "string" } }
    })
  );
});

test.skip("creates union schemas", () => {
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

  const mod = requireFromString(
    String(MemFs.fs.readFileSync("/index.js"))
      .split("\n")
      .find(line => line.indexOf("exports.schema") === 0)
  );

  expect(mod.schema).toEqual(
    expect.objectContaining({
      anyOf: [
        {
          $ref: "#/definitions/A"
        },
        {
          $ref: "#/definitions/B"
        }
      ]
    })
  );
});

test("respects required option", () => {
  MemFs.vol.fromJSON({
    "/index.ts": `
    import { fromType } from "ts-transform-json-schema";

    export interface A {
      ab: string;
      cd?: string;
    }

    export const schema = fromType<A>({
      required: true
    });
  `
  });

  Test.compile(MemFs.fs);

  const mod = requireFromString(
    String(MemFs.fs.readFileSync("/index.js"))
      .split("\n")
      .find(line => line.indexOf("exports.schema") === 0)
  );

  expect(mod.schema).toEqual(
    expect.objectContaining({
      $schema: "http://json-schema.org/draft-07/schema#",
      properties: { ab: { type: "string" }, cd: { type: "string" } },
      required: ["ab"]
    })
  );
});

test("handles partials correctly", () => {
  MemFs.vol.fromJSON({
    "/index.ts": `
    import { fromType } from "ts-transform-json-schema";

    export interface A {
      a: string;
      b?: Partial<B>;
    }

    export interface B {
      b: string;
    }

    export const schema = fromType<A>();
  `
  });

  Test.compile(MemFs.fs, { required: true });

  const getModule = () =>
    requireFromString(
      String(MemFs.fs.readFileSync("/index.js"))
        .split("\n")
        .find(line => line.indexOf("exports.schema") === 0)
    );

  expect(() => getModule()).not.toThrow();
});

test("handles null correctly", () => {
  MemFs.vol.fromJSON({
    "/index.ts": `
    import { fromType } from "ts-transform-json-schema";

    export interface A {
      a: null;
    }

    export const schema = fromType<A>();
  `
  });

  Test.compile(MemFs.fs, { required: true });

  const getModule = () =>
    requireFromString(
      String(MemFs.fs.readFileSync("/index.js"))
        .split("\n")
        .find(line => line.indexOf("exports.schema") === 0)
    );

  expect(() => getModule()).not.toThrow();
});

test("picks up passed options", () => {
  MemFs.vol.fromJSON({
    "/index.ts": `
    import { fromType } from "ts-transform-json-schema";

    export interface A {
      a: null;
    }

    export const schema = fromType<A>({
      required: true,
      noExtraProps: true,
      strictNullChecks: true
    });
  `
  });
});
