"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { SidebarLink } from "../ui/sidebar";

import { useAccounts } from "@/state/accounts";
import { renderIconByName } from "@/utils/icons";

function resolveIcon(name?: string | null, color?: string | null) {
  if (!color) {
    return renderIconByName(name);
  }

  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: color }}>
      {renderIconByName(name, color, true)}
    </span>
  );
}

export default function DynamicAccounts({ staggerOffset = 0 }: { staggerOffset?: number }) {
  const accounts = useAccounts();

  const links = useMemo(
    () =>
      accounts.map((a) => ({
        label: a.name,
        href: `/accounts/${encodeURIComponent(a.id)}`,
        icon: resolveIcon(a.icon, a.color),
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



