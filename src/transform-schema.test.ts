import Ts from "typescript";
import { Transformer } from "ts-transformer-testing-library";
import * as Test from "./test";
import { getTransformer } from "./transform";

const transformer = new Transformer().addTransformer(getTransformer).addMock({
  name: "ts-transform-json-schema",
  content: `export function fromType<T>(opts?: any) { throw new Error('should be transpiled') }`
});

test("handles partials correctly", () => {
  const result = transformer
    .setCompilerOptions({
      module: Ts.ModuleKind.CommonJS
    })
    .transform(
      `
      import { fromType } from "ts-transform-json-schema";
  
      export interface A {
        a: string;
        b?: Partial<B>;
      }
  
      export interface B {
        b: string;
      }
  
      export const schema = fromType<A>({ required: true, ignoreErrors: true });
    `
    );

  const schema = Test.getSchema(result);

  expect(schema).toEqual(
    expect.objectContaining({
      definitions: expect.objectContaining({
        "Partial<B>": expect.objectContaining({
          type: "object",
          properties: expect.objectContaining({ b: { type: "string" } })
        })
      })
    })
  );
});

test("handles null correctly", () => {
  const result = transformer.setCompilerOptions({
    module: Ts.ModuleKind.CommonJS
  }).transform(`
      import { fromType } from "ts-transform-json-schema";
  
      export interface A {
        a: null;
      }
  
      export const schema = fromType<A>({ ignoreErrors: true });
    `);

  const schema = Test.getSchema(result);
  expect(schema).toEqual(
    expect.objectContaining({
      properties: expect.objectContaining({
        a: {
          type: "null"
        }
      })
    })
  );
});
