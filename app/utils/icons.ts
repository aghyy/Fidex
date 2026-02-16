import React from "react";
import { determineTextColor } from "./colors";
import {
  IconQuestionMark,
  IconBread,
  IconBus,
  IconMovie,
  IconShoppingCart,
  IconCashBanknote,
  IconTransferIn,
  IconTax,
} from "@tabler/icons-react";

type TablerIconComponent = typeof IconQuestionMark;

export const iconMap: Record<string, TablerIconComponent> = {
  IconQuestionMark,
  IconBus,
  IconMovie,
  IconShoppingCart,
  IconCashBanknote,
  IconTransferIn,
  IconTax,
  IconBread,
};

export function renderIconByName(
  name?: string | null,
  backgroundColor?: string | null,
  dynamicColor?: boolean
): React.ReactElement {
  const Comp = (name && iconMap[name]) || iconMap["IconQuestionMark"];
  const textColor = determineTextColor(backgroundColor);
  return React.createElement(Comp, { className: `h-5 w-5`, style: dynamicColor ? { color: textColor } : undefined });
}
