import * as Fs from "fs";
import * as Path from "path";
import * as MemFs from "memfs";
import * as ts from "typescript";
import * as resolve from "resolve";
import { getTransformer } from "../transform";

const pkg = require("../../package");

export interface Env {
  [key: string]: string;
}

declare module "resolve" {
  export interface SyncOpts extends resolve.Opts {
    /** how to read files synchronously (defaults to fs.readFileSync) */
    readFileSync?: (file: string, charset: string) => string | Buffer;
    /** function to synchronously test whether a file exists */
    isFile?: (file: string) => boolean;
    /** function to synchronously test whether a directory exists */
    isDirectory?: (directory: string) => boolean;
  }
}

export function fromFs(
  data: { [path: string]: string },
  opts?: unknown
): { [path: string]: string } {
  MemFs.vol.fromJSON(data);
  const fs = MemFs.fs;

  copy(
    { path: Path.join(__dirname, "../../node_modules/typescript"), fs: Fs },
    { path: "/node_modules/typescript", fs }
  );

  fs.writeFileSync(`/ts-transform-json-schema.js`, `module.exports = {};`);
  fs.writeFileSync(`/ts-transform-json-schema.d.ts`, `declare module "ts-transform-json-schema" { export function fromType<T>(opts?: any); }`);

  fs.writeFileSync(`/b.js`, `module.exports = {};`);
  fs.writeFileSync(`/b.d.ts`, `declare module "b" { export function something(): any; }`);


  const options = {
    strict: true,
    noEmitOnError: true,
    suppressImplicitAnyIndexErrors: true,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    target: ts.ScriptTarget.ES2015,
    module: ts.ModuleKind.CommonJS,
    outDir: "/dist",
    lib: [
      "/node_modules/typescript/lib/lib.d.ts",
      "/node_modules/typescript/lib/lib.es2015.d.ts",
      "/ts-transform-json-schema.d.ts",
      "/b.d.ts"
    ],
    skipLibCheck: true,
    typeRoots: [],
    plugins: [
      {
        transform: "ts-transform-json-schema",
        type: "program",
        options: opts || {}
      } as any
    ]
  };

  const host = ts.createCompilerHost(options);

  host.getDefaultLibLocation = () =>
    "/node_modules/typescript/lib/";

  host.fileExists = file => fs.existsSync(file);

  host.resolveModuleNames = names =>
    names.map(name => {
      return {
        resolvedFileName: Path.resolve('/', `${name}.js`)
      };
    });


  host.getSourceFile = (filename, version) =>
    ts.createSourceFile(filename, String(fs.readFileSync(filename)), version);
  host.writeFile = (filename, data) => {
    mkdirp({ path: Path.dirname(filename), fs });
    fs.writeFileSync(filename, data);
  };

  const program = ts.createProgram(["/index.ts"], options, host);

  const transformers: ts.CustomTransformers = {
    before: [getTransformer(program)],
    after: []
  };

  const { emitSkipped, diagnostics } = program.emit(
    program.getSourceFile("/index.ts"),
    undefined,
    undefined,
    false,
    transformers
  );

  if (emitSkipped) {
    throw new Error(
      diagnostics.map(diagnostic => diagnostic.messageText).join("\n")
    );
  }

  return MemFs.vol.toJSON(["/dist"]);
}

interface FsOrigin<T> {
  fs: T;
  path: string;
}

interface ReadableFs {
  existsSync(path: string): boolean;
  readFileSync(path: string): string | Buffer;
  readdirSync(path: string): (string | Buffer)[];
  statSync(path: string): Fs.Stats;
}
interface WriteableFs {
  writeFileSync(path: string, content: string | Buffer): void;
  mkdirSync(path: string): void;
}

type ReadWritableFs = ReadableFs & WriteableFs;

function mkdirp(at: FsOrigin<ReadWritableFs>): void {
  const not = <V>(fn: (input: V) => boolean) => (input: V) =>
    fn(input) !== true;
  const fragments = at.path.split("/");

  fragments
    .map((_, index) => fragments.slice(0, index + 1).join("/"))
    .filter(Boolean)
    .filter(not(at.fs.existsSync))
    .forEach(path => at.fs.mkdirSync(path));
}

function copy(from: FsOrigin<ReadableFs>, to: FsOrigin<ReadWritableFs>): void {
  list(from.path, from.fs).forEach(subPath => {
    const sourcePath = Path.resolve(from.path, subPath);
    const targetPath = Path.resolve(to.path, subPath);
    mkdirp({ fs: to.fs, path: Path.dirname(targetPath) });
    to.fs.writeFileSync(targetPath, from.fs.readFileSync(sourcePath));
  });
}

function list(dir: string, fs: ReadableFs, basedir?: string): string[] {
  const base = typeof basedir === "string" ? basedir : dir;

  return fs
    .readdirSync(dir)
    .map((subPath: string) => {
      const path = Path.resolve(dir, subPath);
      const stat = fs.statSync(path);

      if (stat.isDirectory()) {
        return list(path, fs, base);
      } else {
        return [Path.relative(base, path)];
      }
    })
    .reduce((acc, ps) => [...acc, ...ps], []);
}
