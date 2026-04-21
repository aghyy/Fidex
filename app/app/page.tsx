"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TransactionFAB from "@/components/transactions/TransactionFAB";
import DashboardOverview from "@/components/dashboard/DashboardOverview";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signup");
    }
  }, [status, router]);

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <DashboardOverview />
      </div>
      {status === "authenticated" ? <TransactionFAB /> : null}
    </>
  );
}