"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Skeleton from "@/components/ui/skeleton";
import CategoriesManager from "@/components/categories/CategoriesManager";

export default function ManageCategoriesPage() {
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
          <Skeleton className="h-7 w-64" />
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border bg-background p-6">
            <Skeleton className="h-5 w-40 mb-3" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
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
          <h1 className="text-2xl font-bold">Manage Categories</h1>
        </div>

        <CategoriesManager />
      </div>
    </>
  );
}
