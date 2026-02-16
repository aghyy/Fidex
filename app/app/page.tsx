"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Skeleton from "@/components/ui/skeleton";
import TransactionFAB from "@/components/transactions/TransactionFAB";

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
        <p className="mb-4 text-sm text-muted-foreground">Currently only EUR is available across accounts and transactions.</p>

        {session && (
          <div className="bg-card p-8 rounded-2xl border">
            <h3 className="text-2xl font-bold mb-4">
              You&apos;re signed in! 🎉
            </h3>
            <p className="opacity-80 mb-4">
              Welcome back, <strong>{(session.user as { firstName?: string; lastName?: string }).firstName} {(session.user as { firstName?: string; lastName?: string }).lastName}</strong>!
            </p>
            <p className="opacity-80 text-sm">
              You now have access to protected routes and can interact with the backend API securely.
            </p>
          </div>
        )}
      </div>
      <TransactionFAB />
    </>
  );
}