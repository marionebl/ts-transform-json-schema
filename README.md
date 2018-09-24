# ts-transform-json-schema

* 🌳 Generate inline JSON schema from TypeScript types

## Example

**In**

```ts
import * as JsonSchema from "ts-transform-json-schema";

export interface SomeInterface {
  a: string;
  b: number;
  c?: boolean;
}

export const schema = JsonSchema.fromType<SomeInterface>();
```

```js 
// tsconfig.json
{
  "compilerOptions": {
    "target": "es2015",
    "plugins": [
      {
        "transform": "ts-transform-json-schema",
        "type": "program"
      }
    ]
  }
}
```

**Out**

```ts
import * as JsonSchema from "ts-transform-json-schema";
export const schema = { 
  type: "object", 
  properties: { 
    a: { type: "string" }, 
    b: { type: "number" }, 
    c: { type: "boolean" } 
  }, 
  $schema: "http://json-schema.org/draft-07/schema#" 
};
```

## Installation

```sh
npm install ts-transform-json-schema ttypescript --save-dev
```

## Usage


```js 
// tsconfig.json
{
  "compilerOptions": {
    "target": "es2015",
    "plugins": [
      {
        "transform": "../lib",
        "type": "program"
      }
    ]
  }
}
```

See [TTypeScript](https://github.com/cevek/ttypescript#how-to-use) for docs about integration with other toolchains.

---

See [./example](./example) for a basic setup based on [TTypeScript](https://github.com/cevek/ttypescript)

## License

MIT