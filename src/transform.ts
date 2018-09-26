import * as Path from "path";
import * as ts from "typescript";
import * as tjs from "typescript-json-schema";
import * as readPkgUp from "read-pkg-up";

export interface TransformerOptions {
  env: { [key: string]: string };
}

const SOURCES = new Set(["from-type.ts", "from-type.d.ts"]);

export const getTransformer = (program: ts.Program) => {
  function getVisitor(ctx: ts.TransformationContext, sf: ts.SourceFile) {
    const typeChecker = program.getTypeChecker();
    const compilerOptions = ctx.getCompilerOptions();
    const plugins = (compilerOptions.plugins || []) as any[];

    const plugin = plugins
      .filter(p => typeof p === "object" && p.hasOwnProperty("transform"))
      .find(p => p.transform === "ts-transform-json-schema");

    const options = plugin ? plugin.options || {} : {};

    const visitor: ts.Visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
      if (ts.isCallExpression(node)) {
        const signature = typeChecker.getResolvedSignature(node);

        if (
          signature !== undefined &&
          signature.declaration !== undefined &&
          node.typeArguments !== undefined &&
          node.typeArguments.length === 1
        ) {
          const sourceName = signature.declaration.getSourceFile().fileName;

          if (!SOURCES.has(Path.basename(sourceName))) {
            return ts.visitEachChild(node, visitor, ctx);
          }

          const pkg = readPkgUp.sync({ cwd: Path.dirname(sourceName) }).pkg || {
            name: ""
          };

          if (pkg.name !== "ts-transform-json-schema") {
            return ts.visitEachChild(node, visitor, ctx);
          }

          const typeArgument = node.typeArguments[0];
          const type = typeChecker.getTypeFromTypeNode(typeArgument);
          const schema = tjs.generateSchema(
            program,
            (type.symbol || type.aliasSymbol).name,
            options
          );
          return toLiteral(schema);
        }
      }

      if (
        ts.isImportDeclaration(node) &&
        node.moduleSpecifier.getText() === "ts-transform-json-schema"
      ) {
        return ts.addSyntheticLeadingComment(
          node,
          ts.SyntaxKind.SingleLineCommentTrivia,
          ""
        );
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

  if (typeof input === "object" && !Array.isArray(input)) {
    const ob = input as object;
    return ts.createObjectLiteral(
      Object.keys(ob).map(key =>
        ts.createPropertyAssignment(
          ts.createLiteral(key),
          toLiteral(ob[key])
        )
      )
    );
  }

  return ts.createNull();
}
