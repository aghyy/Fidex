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
type Category = { id: string; name: string; color: string | null; icon: string | null };

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

function resolveIcon(name?: string | null) {
  const Comp = (name && iconMap[name]) || iconMap["IconQuestionMark"];
  return <Comp className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />;
}

export default function DynamicCategories({ staggerOffset = 0 }: { staggerOffset?: number }) {
  const categories = useCategories();

  const links = useMemo(
    () =>
      categories.map((c) => ({
        label: c.name,
        href: `/categories/${encodeURIComponent(c.name.toLowerCase())}`,
        icon: resolveIcon(c.icon),
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


