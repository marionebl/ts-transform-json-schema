import * as Path from "path";
import * as ts from "typescript";
import * as tjs from "typescript-json-schema";

export interface TransformerOptions {
  env: { [key: string]: string; }
}

const SOURCES = new Set([
  "from-type.ts", 
  "from-type.d.ts",
  "from-type.js"
].map(basename => Path.join(__dirname, basename)));

export const getTransformer = (program: ts.Program) => {
  function getVisitor(ctx: ts.TransformationContext, sf: ts.SourceFile) {
    const typeChecker = program.getTypeChecker();

    const visitor: ts.Visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {

      if (ts.isCallExpression(node)) {
        const signature = typeChecker.getResolvedSignature(node);

        if (
          signature !== undefined
          && signature.declaration !== undefined
          && SOURCES.has(Path.resolve(signature.declaration.getSourceFile().fileName))
          && node.typeArguments !== undefined
          && node.typeArguments.length === 1
        ) {
          const typeArgument = node.typeArguments[0];
          const type = typeChecker.getTypeFromTypeNode(typeArgument);
          const schema = tjs.generateSchema(program, (type.symbol || type.aliasSymbol).name);
          return schemaToLiteral(schema);
        }
      }

      if (ts.isImportDeclaration(node) && node.moduleSpecifier.getText() === "ts-transform-json-schema") {
        return ts.addSyntheticLeadingComment(node, ts.SyntaxKind.SingleLineCommentTrivia, '');
      }

      return ts.visitEachChild(node, visitor, ctx);
    };

    return visitor;
  }

  return (ctx: ts.TransformationContext): ts.Transformer<ts.SourceFile> => (
    sf: ts.SourceFile
  ) => ts.visitNode(sf, getVisitor(ctx, sf));
};

function schemaToLiteral(input: tjs.Definition | null): ts.NullLiteral | ts.ObjectLiteralExpression {
  if (input === null) {
    return ts.createNull();
  }

  return ts.createObjectLiteral(
    Object.keys(input)
      .map(key => {
        const value = input[key];
        if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
          return ts.createPropertyAssignment(key, ts.createLiteral(value));
        }
        if (typeof value === "object" && !Array.isArray(value)) {
          return ts.createPropertyAssignment(key, schemaToLiteral(value));
        }
        if (Array.isArray(value)) {
          return ts.createPropertyAssignment(key, ts.createArrayLiteral(value.map(schemaToLiteral)));
        }
      })
      .filter((assignment): assignment is ts.PropertyAssignment => typeof assignment !== 'undefined')
  );
}