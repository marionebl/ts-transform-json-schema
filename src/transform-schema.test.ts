import * as Ts from "typescript";
import { transformFile } from "ts-transformer-testing-library";
import * as Test from "./test";
import { getTransformer } from "./transform";

const transform = (contents: string) =>
  transformFile(
    {
      path: "/index.ts",
      contents
    },
    {
      transform: getTransformer,
      compilerOptions: {
        module: Ts.ModuleKind.CommonJS
      },
      mocks: [
        {
          name: "ts-transform-json-schema",
          content: `export function fromType<T>(opts?: any) { throw new Error('should be transpiled') }`
        },
        {
          name: "b",
          content: `export {}`
        }
      ]
    }
  );

test("handles partials correctly", () => {
  const result = transform(
    `
      import { fromType } from "ts-transform-json-schema";
  
      export interface A {
        a: string;
        b?: Partial<B>;
      }
  
      export interface B {
        b: string;
      }
  
      export const schema = fromType<A>({ required: true });
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
  const result = transform(`
      import { fromType } from "ts-transform-json-schema";
  
      export interface A {
        a: null;
      }
  
      export const schema = fromType<A>();
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
