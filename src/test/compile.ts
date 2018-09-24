import * as Path from "path";
import * as MemFs from "memfs";
import * as ts from "typescript";
import { getTransformer } from "../transform";
import * as resolve from "resolve";

const resolveFrom = require("resolve-from");
const pkg = require("../../package.json");

export interface Env {
  [key: string]: string;
}

export function compile(fs: MemFs.IFs): void {
  const options = {
    strict: true,
    noEmitOnError: true,
    suppressImplicitAnyIndexErrors: true,
    moduleResolution: ts.ModuleResolutionKind.NodeJs, 
    target: ts.ScriptTarget.ES2015,
    module: ts.ModuleKind.CommonJS,
    outDir: '/'
  };

  const host = ts.createCompilerHost(options);

  const _fileExists = host.fileExists;
  host.fileExists = file => fs.existsSync(file) || _fileExists(file);

  host.resolveModuleNames = (names, containingFile) => {
    const self = names.filter(n => n === pkg.name);
    const other = names.filter(n => n !== pkg.name);

    return [
      ...self.map(_ => ({ resolvedFileName: require.resolve("../") })),
      ...other
        .map(o => ts.resolveModuleName(o, containingFile, options, host))
        .map(r => r.resolvedModule ? r.resolvedModule : undefined)
    ];
  };

  const _getSourceFile = host.getSourceFile;
  host.getSourceFile = (filename, version) =>
    fs.existsSync(filename)
      ? ts.createSourceFile(
          filename,
          String(fs.readFileSync(filename)),
          version
        )
      : _getSourceFile(filename, version);

  host.writeFile = (filename, data) => fs.writeFileSync(filename, data);

  const program = ts.createProgram(['/index.ts'], options, host);

  const transformers: ts.CustomTransformers = {
    before: [getTransformer(program)],
    after: []
  };

  const { emitSkipped, diagnostics } = program.emit(
    program.getSourceFile('/index.ts'),
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
}
