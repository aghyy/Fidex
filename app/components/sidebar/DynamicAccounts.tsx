"use client";

import { JSX, useMemo } from "react";
import { motion } from "framer-motion";
import { SidebarLink } from "../ui/sidebar";
import {
  IconQuestionMark,
  IconCashBanknote,
  IconCreditCard,
  IconShoppingCart,
} from "@tabler/icons-react";

import { useAccounts } from "@/state/accounts";

const iconMap: Record<string, (props: { className?: string }) => JSX.Element> = {
  IconQuestionMark: (p) => <IconQuestionMark {...p} />,
  IconCashBanknote: (p) => <IconCashBanknote {...p} />,
  IconCreditCard: (p) => <IconCreditCard {...p} />,
  IconShoppingCart: (p) => <IconShoppingCart {...p} />,
};

function resolveIcon(name?: string | null) {
  const Comp = (name && iconMap[name]) || iconMap["IconQuestionMark"];
  return <Comp className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />;
}

export default function DynamicAccounts({ staggerOffset = 0 }: { staggerOffset?: number }) {
  const accounts = useAccounts();

  const links = useMemo(
    () =>
      accounts.map((a) => ({
        label: a.name,
        href: `/accounts/${encodeURIComponent(a.name.toLowerCase())}`,
        icon: resolveIcon(a.icon),
      })),
    [accounts]
  );

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.02, delayChildren: staggerOffset * 0.02 },
        },
      }}
    >
      {links.map((link) => (
        <motion.div key={link.href} variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}>
          <SidebarLink link={link} />
        </motion.div>
      ))}
    </motion.div>
  );
}



