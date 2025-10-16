import {
  IconCashBanknote,
  IconCreditCard,
} from "@tabler/icons-react";

export const accounts = [
  {
    label: "Checking",
    href: "/accounts/checking",
    icon: <IconCashBanknote className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />,
  },
  {
    label: "Savings",
    href: "/accounts/savings",
    icon: <IconCashBanknote className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />,
  },
  {
    label: "Credit Card",
    href: "/accounts/credit-card",
    icon: <IconCreditCard className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />,
  },
];

