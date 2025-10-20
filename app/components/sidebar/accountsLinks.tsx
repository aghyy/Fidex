import {
  IconCashBanknote,
  IconCreditCard,
} from "@tabler/icons-react";

// TODO: allow user to create own accounts
// TODO: allow user to delete accounts
// TODO: allow user to edit accounts
// TODO: allow user to reorder accounts
// TODO: allow user to add accounts
// TODO: allow user to remove accounts
// TODO: allow user to rename accounts
// TODO: allow user to change account type
// TODO: allow user to change account currency
// TODO: allow user to change account color
// TODO: allow user to change account icon
// TODO: allow user to change account balance

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

