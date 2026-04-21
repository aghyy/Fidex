"use client";

import { useAtom } from "jotai";
import { accentAtom } from "@/state/theme";
import {
  ColorSwatchPicker,
  DEFAULT_COLOR_SWATCHES,
  normalizeHexColor,
} from "@/components/ui/color-swatch-picker";

const DEFAULT_SWATCH = "#38bdf8";

export default function AccentColorPicker() {
  const [accent, setAccent] = useAtom(accentAtom);
  const currentAccent = normalizeHexColor(accent, DEFAULT_SWATCH);

  return (
    <div className="w-full max-w-full overflow-x-auto no-scrollbar pr-1">
      <ColorSwatchPicker
        value={currentAccent}
        onChange={(hex) => setAccent(hex)}
        colors={DEFAULT_COLOR_SWATCHES}
        showAlphaSlider={false}
      />
    </div>
  );
}
