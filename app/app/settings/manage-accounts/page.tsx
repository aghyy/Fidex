"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Skeleton from "@/components/ui/skeleton";

export default function ManageAccountsPage() {
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
        <div className="mb-4 flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-7 w-56" />
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border bg-background p-6">
            <Skeleton className="h-5 w-40 mb-3" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="rounded-xl border bg-background p-6">
            <Skeleton className="h-5 w-40 mb-3" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/settings')}
            className="p-1 hover:bg-accent rounded transition-colors"
            aria-label="Back to settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold">Manage Accounts</h1>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border bg-background p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-2">Accounts</h2>
            <p className="text-sm text-muted-foreground">Coming soon: connect and manage your accounts. Configure balances, visibility, and default account settings.</p>
          </section>

          <section className="rounded-xl border bg-background p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-2">Integrations</h2>
            <p className="text-sm text-muted-foreground">Coming soon: bank integrations and automatic syncing.</p>
          </section>
        </div>
      </div>
    </>
  );
}
