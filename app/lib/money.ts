export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toMoneyNumber(value: unknown): number {
  const parse = (input: unknown, depth: number): number | null => {
    if (depth > 3) return null;
    if (typeof input === "number") return Number.isFinite(input) ? roundMoney(input) : null;
    if (typeof input === "string") {
      const parsed = Number(input);
      return Number.isFinite(parsed) ? roundMoney(parsed) : null;
    }
    if (!input || typeof input !== "object") return null;

    const maybeDecimal = input as {
      value?: unknown;
      toNumber?: () => number;
      toJSON?: () => unknown;
      toString?: () => string;
      valueOf?: () => unknown;
    };

    if (maybeDecimal.value !== undefined) {
      const parsed = parse(maybeDecimal.value, depth + 1);
      if (parsed !== null) return parsed;
    }
    if (typeof maybeDecimal.toNumber === "function") {
      const parsed = maybeDecimal.toNumber();
      if (Number.isFinite(parsed)) return roundMoney(parsed);
    }
    if (typeof maybeDecimal.toJSON === "function") {
      const parsed = parse(maybeDecimal.toJSON(), depth + 1);
      if (parsed !== null) return parsed;
    }
    if (typeof maybeDecimal.valueOf === "function") {
      const parsed = parse(maybeDecimal.valueOf(), depth + 1);
      if (parsed !== null) return parsed;
    }
    if (typeof maybeDecimal.toString === "function") {
      const parsed = Number(maybeDecimal.toString());
      if (Number.isFinite(parsed)) return roundMoney(parsed);
    }
    return null;
  };

  return parse(value, 0) ?? 0;
}

/** Number part only: always two decimal places, locale-aware grouping (e.g. 2,378.80). */
export function formatEurAmount(value: number | string): string {
  const n = toMoneyNumber(value);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseMoneyInput(
  value: unknown,
  options?: { min?: number; max?: number }
): number | null {
  let parsed: number;
  if (typeof value === "number") parsed = value;
  else if (typeof value === "string") parsed = Number(value.replace(",", "."));
  else return null;

  if (!Number.isFinite(parsed)) return null;
  const rounded = roundMoney(parsed);
  if (options?.min !== undefined && rounded < options.min) return null;
  if (options?.max !== undefined && rounded > options.max) return null;
  return rounded;
}
