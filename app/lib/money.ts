export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toMoneyNumber(value: unknown): number {
  if (typeof value === "number") return roundMoney(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? roundMoney(parsed) : 0;
  }
  if (value && typeof value === "object") {
    const maybeDecimal = value as { toNumber?: () => number; toString?: () => string };
    if (typeof maybeDecimal.toNumber === "function") {
      return roundMoney(maybeDecimal.toNumber());
    }
    if (typeof maybeDecimal.toString === "function") {
      const parsed = Number(maybeDecimal.toString());
      return Number.isFinite(parsed) ? roundMoney(parsed) : 0;
    }
  }
  return 0;
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
