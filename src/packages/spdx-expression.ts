export type SpdxNode =
  { type: "license"; id: string; exception?: string } | { type: "and" | "or"; left: SpdxNode; right: SpdxNode };

export class SpdxExpressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpdxExpressionError";
  }
}

function tokenize(expression: string): string[] {
  return expression.replace(/\(/g, " ( ").replace(/\)/g, " ) ").split(/\s+/).filter(Boolean);
}

/**
 * Parse an SPDX licence expression (SPDX spec Annex D): `OR` binds weaker than `AND`,
 * `WITH` attaches an exception to a single licence. Operators are accepted case-insensitively.
 */
export function parseSpdxExpression(expression: string): SpdxNode {
  const tokens = tokenize(expression);
  let position = 0;
  const peek = () => tokens[position];
  const isOperator = (token: string | undefined, operator: string) => token?.toUpperCase() === operator;

  function parseOr(): SpdxNode {
    let left = parseAnd();
    while (isOperator(peek(), "OR")) {
      position++;
      left = { type: "or", left, right: parseAnd() };
    }
    return left;
  }

  function parseAnd(): SpdxNode {
    let left = parsePrimary();
    while (isOperator(peek(), "AND")) {
      position++;
      left = { type: "and", left, right: parsePrimary() };
    }
    return left;
  }

  function parsePrimary(): SpdxNode {
    const token = peek();
    if (token === undefined) throw new SpdxExpressionError(`Unexpected end of expression: "${expression}"`);
    if (token === "(") {
      position++;
      const inner = parseOr();
      if (peek() !== ")") throw new SpdxExpressionError(`Missing closing parenthesis in "${expression}"`);
      position++;
      return inner;
    }
    if (token === ")" || ["AND", "OR", "WITH"].includes(token.toUpperCase())) {
      throw new SpdxExpressionError(`Unexpected "${token}" in "${expression}"`);
    }
    position++;
    if (isOperator(peek(), "WITH")) {
      position++;
      const exception = peek();
      if (!exception || exception === "(" || exception === ")") {
        throw new SpdxExpressionError(`Missing exception after WITH in "${expression}"`);
      }
      position++;
      return { type: "license", id: token, exception };
    }
    return { type: "license", id: token };
  }

  const tree = parseOr();
  if (position !== tokens.length) throw new SpdxExpressionError(`Unexpected "${tokens[position]}" in "${expression}"`);
  return tree;
}

export function spdxLeaves(node: SpdxNode): { id: string; exception?: string }[] {
  if (node.type === "license") return [node.exception ? { id: node.id, exception: node.exception } : { id: node.id }];
  return [...spdxLeaves(node.left), ...spdxLeaves(node.right)];
}

export function spdxOperators(node: SpdxNode): Set<"and" | "or"> {
  if (node.type === "license") return new Set();
  return new Set([node.type, ...spdxOperators(node.left), ...spdxOperators(node.right)]);
}
