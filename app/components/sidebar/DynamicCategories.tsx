"use client";

import { JSX, useMemo } from "react";
import { motion } from "framer-motion";
import { SidebarLink } from "../ui/sidebar";
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

import { useCategories } from "@/state/categories";
import { determineTextColor } from "@/utils/colors";

const iconMap: Record<string, (props: { className?: string }) => JSX.Element> = {
  IconQuestionMark: (p) => <IconQuestionMark {...p} />,
  IconBread: (p) => <IconBread {...p} />,
  IconBus: (p) => <IconBus {...p} />,
  IconMovie: (p) => <IconMovie {...p} />,
  IconShoppingCart: (p) => <IconShoppingCart {...p} />,
  IconCashBanknote: (p) => <IconCashBanknote {...p} />,
  IconTransferIn: (p) => <IconTransferIn {...p} />,
  IconTax: (p) => <IconTax {...p} />,
};

function resolveIcon(name?: string | null, color?: string | null) {
  const Comp = (name && iconMap[name]) || iconMap["IconQuestionMark"];
  if (!color) {
    return <Comp className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />;
  }

  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: color }}>
      <Comp className="h-4 w-4" style={{ color: determineTextColor(color) }} />
    </span>
  );
}

export default function DynamicCategories({ staggerOffset = 0 }: { staggerOffset?: number }) {
  const categories = useCategories();

  const links = useMemo(
    () =>
      categories.map((c) => ({
        label: c.name,
        href: `/categories/${encodeURIComponent(c.id)}`,
        icon: resolveIcon(c.icon, c.color),
      })),
    [categories]
  );

  // Skeleton handled by parent if needed

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


