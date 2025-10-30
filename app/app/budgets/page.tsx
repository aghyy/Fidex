"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";

export default function BudgetsPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signup");
    }
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated") {
    return <LoadingScreen />;
  }

  return (
    <>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold mb-6">Budgets</h1>
      </div>
    </>
  );
}