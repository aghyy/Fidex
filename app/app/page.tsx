"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Skeleton from "@/components/ui/skeleton";
import TransactionFAB from "@/components/transactions/TransactionFAB";
import DashboardOverview from "@/components/dashboard/DashboardOverview";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signup");
    }
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-7 w-40" />
        </div>
        <div className="rounded-2xl border bg-card p-8">
          <Skeleton className="h-6 w-56 mb-4" />
          <Skeleton className="h-4 w-80 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        {session ? <DashboardOverview /> : null}
      </div>
      <TransactionFAB />
    </>
  );
}