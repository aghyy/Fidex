export function hexToRgb(hex: string) {
  const [r, g, b] = hex.match(/[0-9A-Fa-f]{2}/g)?.map(c => parseInt(c, 16)) ?? [0, 0, 0];
  return { r, g, b };
}

function clampChannel(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function rgbToHex(r: number, g: number, b: number) {
  const toComponent = (channel: number) => clampChannel(channel).toString(16).padStart(2, "0");
  return `#${toComponent(r)}${toComponent(g)}${toComponent(b)}`.toUpperCase();
}

export function rgbaArrayToHex(value: unknown) {
  if (!Array.isArray(value) || value.length < 3) return null;
  const [r, g, b] = value;
  return rgbToHex(Number(r), Number(g), Number(b));
}

export function isBrightSimple(r: number, g: number, b: number): boolean {
  const brightness = 0.299 * r + 0.587 * g + 0.114 * b; // range [0,255]
  return brightness > 180;
}

export function determineTextColor(backgroundColor?: string | null) {
  if (!backgroundColor) return "white";
  const { r, g, b } = hexToRgb(backgroundColor);
  return isBrightSimple(r, g, b) ? "black" : "white";
}