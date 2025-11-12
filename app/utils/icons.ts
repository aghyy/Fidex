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

export const iconMap: Record<string, (props: { className?: string }) => React.ReactElement> = {
  IconQuestionMark: (p) => React.createElement(IconQuestionMark, p),
  IconBus: (p) => React.createElement(IconBus, p),
  IconMovie: (p) => React.createElement(IconMovie, p),
  IconShoppingCart: (p) => React.createElement(IconShoppingCart, p),
  IconCashBanknote: (p) => React.createElement(IconCashBanknote, p),
  IconTransferIn: (p) => React.createElement(IconTransferIn, p),
  IconTax: (p) => React.createElement(IconTax, p),
  IconBread: (p) => React.createElement(IconBread, p),
};

export function renderIconByName(name?: string | null, backgroundColor?: string | null): React.ReactElement {
  const Comp = (name && iconMap[name]) || iconMap["IconQuestionMark"];
  const textColor = determineTextColor(backgroundColor);
  // Use full class names for Tailwind CSS (not dynamic concatenation)
  const textColorClass = textColor === "black" ? "text-black" : "text-white";
  return React.createElement(Comp, { className: `h-5 w-5 ${textColorClass}` });
}