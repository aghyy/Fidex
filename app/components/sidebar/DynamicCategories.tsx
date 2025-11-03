"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/category", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setCategories((d.categories as Category[]) ?? []);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
    return () => {
      active = false;
    };
  }, []);

  const links = useMemo(
    () =>
      categories.map((c) => ({
        label: c.name,
        href: `/categories/${encodeURIComponent(c.name.toLowerCase())}`,
        icon: resolveIcon(c.icon),
      })),
    [categories]
  );

  if (!loaded && links.length === 0) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-6 rounded bg-muted/50" />
        ))}
      </div>
    );
  }

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


