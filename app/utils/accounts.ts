import React from "react";
import { Account, AccountDraft } from "@/types/accounts";
import { Currency } from "@/types/currencies";

export function toDraft(account: Account): AccountDraft {
  return {
    name: account.name,
    color: account.color ?? null,
    icon: account.icon ?? null,
  };
}

export function formatBalance(balance: number, currency: Currency): React.ReactElement {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const parts = formatter.formatToParts(balance);
  const signPart = parts.find((part) => part.type === "minusSign" || part.type === "plusSign")?.value ?? "";
  const currencyPart = parts.find((part) => part.type === "currency")?.value ?? getCurrencySymbol(currency);
  const integerPart = parts
    .filter((part) => part.type === "integer" || part.type === "group")
    .map((part) => part.value)
    .join("");

  const decimalIndex = parts.findIndex((part) => part.type === "decimal");
  const decimalPart =
    decimalIndex >= 0 ? parts.slice(decimalIndex).map((part) => part.value).join("") : "";

  const majorText = `${signPart}${currencyPart}${integerPart}`;

  const children: React.ReactNode[] = [
    React.createElement("span", { key: "major", className: "leading-none" }, majorText),
  ];

  if (decimalPart) {
    children.push(
      React.createElement(
        "span",
        {
          key: "minor",
          className: "ml-1",
          style: { fontSize: "0.75rem", transform: "translateY(0.3px)" },
        },
        decimalPart,
      ),
    );
  }

  return React.createElement("span", { className: "inline-flex items-end" }, ...children);
}

export function getCurrencySymbol(currency: Currency): string {
  try {
    const formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "symbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    const parts = formatter.formatToParts(0);
    const currencyPart = parts.find((part) => part.type === "currency");

    return currencyPart?.value ?? currency;
  } catch {
    return currency;
  }
}