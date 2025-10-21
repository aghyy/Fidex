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
import { useState, useEffect } from "react";
import { accounts } from "./accountsLinks";
import { categories } from "./categoriesLinks";
import { motion } from "framer-motion";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<BasicUser | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      setImageLoading(true);
      fetch("/api/user/profile", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setProfileData(data.user);
            if (data.user.image) {
              setProfileImage(data.user.image as string);
            }
          }
        })
        .catch(() => { })
        .finally(() => setImageLoading(false));
    }
  }, [session?.user?.id]);

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

          <div className={`flex flex-1 flex-col overflow-x-hidden overflow-y-auto gap-4 min-h-0 no-scrollbar ${sidebarOpen ? "mt-0" : "mt-2"} transition-all duration-300`}>
            <div className={`flex flex-col transition-all duration-300 ${sidebarOpen ? "gap-0" : "gap-3"}`}>
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
                <span className="text-xs font-bold text-muted-foreground">Accounts</span>
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.02,
                      },
                    },
                  }}
                >
                  {accounts.map((a) => {
                    return (
                      <motion.div
                        key={a.href}
                        variants={{
                          hidden: { opacity: 0, x: -10 },
                          visible: { opacity: 1, x: 0 },
                        }}
                      >
                        <SidebarLink link={a} />
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            )}

            {sidebarOpen && (
              <div>
                <span className="text-xs font-bold text-muted-foreground">Categories</span>
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.02,
                        delayChildren: accounts.length * 0.02,
                      },
                    },
                  }}
                >
                  {categories.map((c) => {
                    return (
                      <motion.div
                        key={c.href}
                        variants={{
                          hidden: { opacity: 0, x: -10 },
                          visible: { opacity: 1, x: 0 },
                        }}
                      >
                        <SidebarLink link={c} />
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            )}
          </div>

          <SidebarFooter 
            sessionUser={session?.user as BasicUser}
            profileImage={profileImage}
            profileData={profileData}
            imageLoading={imageLoading}
          />
        </SidebarBody>
      </Sidebar>

      <main 
        className="flex-1 min-w-0 my-2 mr-2 rounded-[1.2rem] bg-popover text-popover-foreground overflow-y-auto relative"
        onClick={() => sidebarOpen && setSidebarOpen(false)}
      >
        {children}
      </main>
    </div>
  );
}