"use client";

import { useAtom } from "jotai";
import { accentAtom } from "@/state/theme";
import { ColorPickerPopover } from "@/components/ui/color-picker";
import { rgbaArrayToHex } from "@/utils/colors";
import { Button } from "@/components/ui/button";

const DEFAULT_SWATCH = "#38bdf8";

export default function AccentColorPicker() {
  const [accent, setAccent] = useAtom(accentAtom);
  const isActive = Boolean(accent);
  const popoverValue = accent ?? DEFAULT_SWATCH;

  const handleChange = (input: unknown) => {
    const hex = rgbaArrayToHex(input);
    if (typeof hex === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(hex)) {
      setAccent(hex);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <ColorPickerPopover
        value={popoverValue}
        onChange={handleChange}
        isActive={isActive}
        showAlphaSlider={false}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setAccent(null)}
        disabled={!isActive}
      >
        Use default
      </Button>
    </div>
  );
}
