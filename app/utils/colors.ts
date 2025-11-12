export function hexToRgb(hex: string) {
  const [r, g, b] = hex.match(/[0-9A-Fa-f]{2}/g)?.map(c => parseInt(c, 16)) ?? [0, 0, 0];
  return { r, g, b };
}

export function isBrightSimple(r: number, g: number, b: number): boolean {
  // Perceived brightness formula
  const brightness = 0.299 * r + 0.587 * g + 0.114 * b; // range [0,255]
  return brightness > 128; // Midpoint threshold; adjust if needed
}

export function determineTextColor(backgroundColor?: string | null) {
  if (!backgroundColor) return "white";
  const { r, g, b } = hexToRgb(backgroundColor);
  return isBrightSimple(r, g, b) ? "black" : "white";
}