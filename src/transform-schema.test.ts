import * as Test from "./test";

test("handles partials correctly", () => {
  const result = Test.fromString(`
      import { fromType } from "ts-transform-json-schema";
  
      export interface A {
        a: string;
        b?: Partial<B>;
      }
  
      export interface B {
        b: string;
      }
  
      export const schema = fromType<A>({ required: true });
    `);

  const schema = Test.getSchema(result);

  expect(schema).toEqual(
    expect.objectContaining({
      definitions: expect.objectContaining({
        "Partial<B>": { type: "object", properties: { b: { type: "string" } } }
      })
    })
  );
});

test("handles null correctly", () => {
  const result = Test.fromString(`
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
