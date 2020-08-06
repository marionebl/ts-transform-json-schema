import * as ts from "typescript";
import * as tjs from "typescript-json-schema";
import * as JSON5 from "json5";

export interface TransformerOptions {
  env: { [key: string]: string };
}

export const getTransformer = (program: ts.Program) => {
  const typeChecker = program.getTypeChecker();

  function getVisitor(ctx: ts.TransformationContext, sf: ts.SourceFile) {
    const visitor: ts.Visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
      if (ts.isCallExpression(node)) {
        if (
          typeof node.typeArguments === "undefined" ||
          node.typeArguments.length === 0
        ) {
          return node;
        }

        const signature = typeChecker.getResolvedSignature(node);

        if (signature !== undefined && signature.declaration !== undefined) {
          const sourceName = signature.declaration.getSourceFile().fileName;

          if (!sourceName.includes("ts-transform-json-schema")) {
            return ts.visitEachChild(node, visitor, ctx);
          }

          const typeArgument = node.typeArguments[0];

          const type = typeChecker.getTypeFromTypeNode(typeArgument);
          const symbol = type.aliasSymbol || type.symbol;

          const argNode = node.arguments[0];
          const options = argNode ? getOptions(argNode) : {};

          if (typeof symbol === "undefined" || symbol === null) {
            throw new Error(`Could not find symbol for passed type`);
          }

          const compilerOptions = ctx.getCompilerOptions();
          const apiFiles = program.getSourceFiles().map(f => f.fileName).filter(n => n.endsWith('api.d.ts'));
          const apiProgram = tjs.getProgramFromFiles(apiFiles, compilerOptions);
          const generator = tjs.buildGenerator(apiProgram, options);
          const namespacedTypeName = typeChecker.getFullyQualifiedName(symbol).replace(/".*"\./, "");
          const schema = generator.getSchemaForSymbol(namespacedTypeName);

          return toLiteral(schema);
        }
      }

      if (ts.isImportDeclaration(node)) {
        const rawSpec = node.moduleSpecifier.getText();
        const spec = rawSpec.substring(1, rawSpec.length - 1);

        if (spec === "@env0/ts-transform-json-schema") {
          return;
        }
      }

      return ts.visitEachChild(node, visitor, ctx);
    };

    return visitor;
  }

  return (ctx: ts.TransformationContext): ts.Transformer<ts.SourceFile> => (
    sf: ts.SourceFile
  ) => ts.visitNode(sf, getVisitor(ctx, sf));
};

// TODO: Factor out, test
function toLiteral(input: unknown): ts.PrimaryExpression {
  if (
    typeof input === "string" ||
    typeof input === "boolean" ||
    typeof input === "number"
  ) {
    return ts.createLiteral(input);
  }

  if (typeof input === "object" && Array.isArray(input)) {
    return ts.createArrayLiteral(input.map(toLiteral));
  }

  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    const ob = input as object;
    return ts.createObjectLiteral(
      Object.keys(ob).map(key =>
        ts.createPropertyAssignment(ts.createLiteral(key), toLiteral(ob[key]))
      )
    );
  }

  return ts.createNull();
}

function getOptions(node: ts.Node): unknown {
  try {
    return JSON5.parse(node.getText());
  } catch (err) {
    return;
  }
}
