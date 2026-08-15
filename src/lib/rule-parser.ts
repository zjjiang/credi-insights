// Rule pattern parser for MCP server
// Supports format: "field operator value"
// Examples:
//   "merchant contains 美团"
//   "amount >= 100"
//   "merchant startsWith 星巴克"

type Operator =
  | "contains"
  | "equals"
  | "startsWith"
  | "endsWith"
  | ">"
  | "<"
  | ">="
  | "<=";

interface ParsedRule {
  field: string;
  operator: Operator;
  value: string;
}

export function parseRulePattern(pattern: string): ParsedRule {
  const trimmed = pattern.trim();

  // Try to match: field operator value
  const match = trimmed.match(
    /^(\w+)\s+(contains|equals|startsWith|endsWith|>=|<=|>|<)\s+(.+)$/i
  );

  if (!match) {
    throw new Error(
      `Invalid pattern format: "${pattern}". Expected: "field operator value"`
    );
  }

  const [, field, operator, value] = match;

  return {
    field: field.toLowerCase(),
    operator: operator.toLowerCase() as Operator,
    value: value.trim(),
  };
}

export function matchesRule(
  transaction: { merchant: string; amount: number; type: string },
  rule: ParsedRule
): boolean {
  const { field, operator, value } = rule;

  if (field === "merchant") {
    const merchantLower = transaction.merchant.toLowerCase();
    const valueLower = value.toLowerCase();

    switch (operator) {
      case "contains":
        return merchantLower.includes(valueLower);
      case "equals":
        return merchantLower === valueLower;
      case "startsWith":
        return merchantLower.startsWith(valueLower);
      case "endsWith":
        return merchantLower.endsWith(valueLower);
      default:
        throw new Error(`Operator ${operator} not supported for merchant`);
    }
  }

  if (field === "amount") {
    const amount = transaction.amount;
    const threshold = parseFloat(value);

    if (isNaN(threshold)) {
      throw new Error(`Invalid amount value: ${value}`);
    }

    switch (operator) {
      case ">":
        return amount > threshold;
      case "<":
        return amount < threshold;
      case ">=":
        return amount >= threshold;
      case "<=":
        return amount <= threshold;
      case "equals":
        return amount === threshold;
      default:
        throw new Error(`Operator ${operator} not supported for amount`);
    }
  }

  throw new Error(`Unsupported field: ${field}`);
}
