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
  IconUser,
  IconSettings,
  IconKey,
} from "@tabler/icons-react";
import SidebarHeader from "./SidebarHeader";
import SidebarFooter from "./SidebarFooter";
import { BasicUser } from "@/types/user";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isAuthRoute = pathname?.startsWith("/auth/") ?? false;

  if (isAuthRoute) {
    return <>{children}</>;
  }

  const links = [
    {
      label: "Dashboard",
      href: "/",
      icon: <IconLayoutDashboard className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />,
    },
    {
      label: "Profile",
      href: "/profile",
      icon: <IconUser className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />,
    },
    {
      label: "Settings",
      href: "/profile/edit",
      icon: <IconSettings className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />,
    },
    {
      label: "Passkeys",
      href: "/profile/passkeys",
      icon: <IconKey className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />,
    },
  ];

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex">
      <Sidebar>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            <SidebarHeader />
            
            <div className="mt-8 flex flex-col gap-2">
              {links.map((l) => {
                return (
                  <div key={l.href}>
                    <SidebarLink link={l} />
                  </div>
                );
              })}
            </div>
          </div>

          <SidebarFooter sessionUser={session?.user as BasicUser} />
        </SidebarBody>
      </Sidebar>

      <main className="flex-1 min-w-0 my-2 mr-2 rounded-[1.2rem] bg-popover text-popover-foreground">
        {children}
      </main>
    </div>
  );
}