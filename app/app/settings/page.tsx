"use client";

import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Skeleton from "@/components/ui/skeleton";
import Link from "next/link";
import { IconUser, IconCategory, IconWallet, IconLogout, IconAdjustmentsHorizontal } from "@tabler/icons-react";

export default function SettingsPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signup");
    }
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="h-7 w-40 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-background p-5">
              <div className="flex items-start gap-3">
                <Skeleton className="h-5 w-5 rounded mb-1" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-40 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/settings/profile" className="rounded-xl border bg-background p-5 hover:bg-accent hover:text-accent-foreground transition-colors">
            <div className="flex items-start gap-3">
              <IconUser className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h2 className="text-base font-semibold">Profile</h2>
                <p className="text-sm text-muted-foreground">Update your name, username, and profile picture. Manage passkeys, password, and account deletion.</p>
              </div>
            </div>
          </Link>

          <Link href="/settings/manage-accounts" className="rounded-xl border bg-background p-5 hover:bg-accent hover:text-accent-foreground transition-colors">
            <div className="flex items-start gap-3">
              <IconWallet className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h2 className="text-base font-semibold">Manage Accounts</h2>
                <p className="text-sm text-muted-foreground">Connect and manage your accounts. Configure balances and visibility.</p>
              </div>
            </div>
          </Link>

          <Link href="/settings/manage-categories" className="rounded-xl border bg-background p-5 hover:bg-accent hover:text-accent-foreground transition-colors">
            <div className="flex items-start gap-3">
              <IconCategory className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h2 className="text-base font-semibold">Manage Categories</h2>
                <p className="text-sm text-muted-foreground">Create, edit, and organize your categories.</p>
              </div>
            </div>
          </Link>

          <Link href="/settings/advanced" className="rounded-xl border bg-background p-5 hover:bg-accent hover:text-accent-foreground transition-colors">
            <div className="flex items-start gap-3">
              <IconAdjustmentsHorizontal className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h2 className="text-base font-semibold">Advanced Settings</h2>
                <p className="text-sm text-muted-foreground">Configure booking behavior and future advanced customization options.</p>
              </div>
            </div>
          </Link>

          <div className="md:hidden block">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-colors"
            >
              <IconLogout className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}