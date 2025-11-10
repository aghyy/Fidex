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
import DynamicCategories from "./DynamicCategories";
import { useCategories, useCategoriesBootstrap } from "@/state/categories";
import DynamicAccounts from "./DynamicAccounts";
import { useAccountsBootstrap, useAccounts } from "@/state/accounts";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const categoriesState = useCategories();
  const accountsState = useAccounts();
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
  }, [session?.user]);

  // Bootstrap categories global store when authenticated
  useCategoriesBootstrap(Boolean(session?.user));
  // Bootstrap accounts global store when authenticated
  useAccountsBootstrap(Boolean(session?.user));

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
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
          <SidebarBody className="justify-between gap-4 h-full flex flex-col" links={links}>
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
                  <DynamicAccounts staggerOffset={categoriesState.length} />
                </div>
              )}

              {sidebarOpen && (
                <div>
                  <span className="text-xs font-bold text-muted-foreground">Categories</span>
                  <DynamicCategories staggerOffset={categoriesState.length + accountsState.length} />
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
      </div>

      {/* Mobile Dock */}
      <div className="md:hidden">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
          <SidebarBody links={links} />
        </Sidebar>
      </div>

      <main
        className="flex-1 min-w-0 lg:my-2 mr-0 md:mr-2 lg:rounded-[1.2rem] bg-popover text-popover-foreground overflow-y-auto relative pb-20 md:pb-2"
        // style={{
        //   backgroundImage: "url('/backgrounds/m4.png')",
        //   backgroundSize: "cover",
        //   backgroundPosition: "center",
        //   backgroundRepeat: "no-repeat",
        //  }}
        onClick={() => sidebarOpen && setSidebarOpen(false)}
      >
        {children}
      </main>
    </div>
  );
}