"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
} from "../ui/sidebar";
import {
  IconLayoutDashboard,
  IconWallet,
  IconReceipt,
  IconSettings,
} from "@tabler/icons-react";
import SidebarHeader from "./SidebarHeader";
import SidebarFooter from "./SidebarFooter";
import { BasicUser } from "@/types/user";
import { useState } from "react";
import { accounts } from "./accountsLinks";
import { categories } from "./categoriesLinks";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const isAuthRoute = pathname?.startsWith("/auth/") ?? false;

  if (isAuthRoute) {
    return <>{children}</>;
  }

  // TODO: implement mobile sidebar... either manually open or use dock as sidebar (liquid glass?)
  const links = [
    {
      label: "Dashboard",
      href: "/",
      icon: <IconLayoutDashboard className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />,
    },
    {
      label: "Budgets",
      href: "/budgets",
      icon: <IconWallet className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />,
    },
    {
      label: "Transactions",
      href: "/transactions",
      icon: <IconReceipt className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: <IconSettings className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />,
    },
  ];

  return (
    <div className="h-screen w-full bg-background text-foreground flex overflow-hidden">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
        <SidebarBody className="justify-between gap-4 h-full flex flex-col">
          <SidebarHeader />

          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto gap-4 min-h-0 no-scrollbar">
            <div className="flex flex-col gap-2">
              {links.map((l) => {
                return (
                  <div key={l.href}>
                    <SidebarLink link={l} />
                  </div>
                );
              })}
            </div>

            {sidebarOpen && (
              <div>
                <span className="text-sm font-medium">Accounts</span>
                {accounts.map((a) => {
                  return (
                    <div key={a.href}>
                      <SidebarLink link={a} />
                    </div>
                  );
                })}
              </div>
            )}

            {sidebarOpen && (
              <div>
                <span className="text-sm font-medium">Categories</span>
                {categories.map((c) => {
                  return (
                    <div key={c.href}>
                      <SidebarLink link={c} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <SidebarFooter sessionUser={session?.user as BasicUser} />
        </SidebarBody>
      </Sidebar>

      <main className="flex-1 min-w-0 my-2 mr-2 rounded-[1.2rem] bg-popover text-popover-foreground overflow-y-auto">
        {children}
      </main>
    </div>
  );
}