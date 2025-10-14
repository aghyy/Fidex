"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
  useSidebar,
} from "./ui/sidebar";
import { useTheme } from "./ThemeProvider";
import Image from "next/image";
import {
  IconLayoutDashboard,
  IconUser,
  IconSettings,
  IconKey,
  IconLogout,
  IconSun,
  IconMoon,
  IconDeviceDesktop,
} from "@tabler/icons-react";
// removed motion import; not needed after simplifying Logo

type BasicUser = { firstName?: string; lastName?: string; email?: string };

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { open } = useSidebar();

  const cycleTheme = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
  };

  const icon = theme === "light" ? (
    <IconSun className="h-4 w-4" />
  ) : theme === "dark" ? (
    <IconMoon className="h-4 w-4" />
  ) : (
    <IconDeviceDesktop className="h-4 w-4" />
  );

  return (
    <button
      onClick={cycleTheme}
      aria-label={`Theme: ${theme}`}
      title={`Theme: ${theme} (click to change)`}
      className={`rounded-md border ${open ? "px-3 py-2 text-sm flex items-center gap-2" : "h-8 w-8 flex items-center justify-center"}`}
    >
      {icon}
      {open && <span>Theme</span>}
    </button>
  );
}

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
            <Logo />
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

          <FooterSection sessionUser={session?.user as BasicUser} />
        </SidebarBody>
      </Sidebar>

      <main className="flex-1 min-w-0 my-2 mr-2 rounded-[1.2rem] bg-popover text-popover-foreground">
        {children}
      </main>
    </div>
  );
}

function FooterSection({ sessionUser }: { sessionUser?: BasicUser }) {
  const { open } = useSidebar();
  const initials = (() => {
    const f = sessionUser?.firstName || "";
    const l = sessionUser?.lastName || "";
    const email = sessionUser?.email || "";
    if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
    return (email?.[0] || "U").toUpperCase();
  })();

  return (
    <div className="mt-8 pt-4 border-t flex flex-col gap-3">
      <ThemeToggle />

      <button
        onClick={() => signOut({ callbackUrl: "/auth/signin" })}
        className={`flex items-center justify-center rounded-md ${open ? "px-3 py-2 text-sm gap-2 bg-destructive text-destructive-foreground" : "h-8 w-8"}`}
        title="Sign out"
        aria-label="Sign out"
      >
        <IconLogout className="h-4 w-4" />
        {open && <span>Sign out</span>}
      </button>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold select-none">
            {initials}
          </div>
          {open && (
            <span
              className="text-sm truncate"
              title={`${sessionUser?.firstName || ""} ${sessionUser?.lastName || ""}`.trim()}
            >
              {(sessionUser?.firstName || "") + (sessionUser?.lastName ? ` ${sessionUser.lastName}` : "")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Logo() {
  const { open } = useSidebar();
  return (
    <Link
      href="/"
      aria-label="Fidex"
      className={`relative z-20 flex items-center gap-2 py-1 text-sm w-full ${open ? "justify-start px-2" : "justify-center"}`}
      title="Fidex"
    >
      <Image src="/icon.svg" alt="Fidex" width={32} height={32} />
      {open && <span className="font-medium whitespace-pre">Fidex</span>}
    </Link>
  );
}