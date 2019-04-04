import * as JsonSchema from "../lib/from-type";

export interface SomeInterface {
  a: string;
  b: number;
  c?: boolean;
}

export const schema = JsonSchema.fromType<SomeInterface>();

otherThing();

function otherThing() {

}