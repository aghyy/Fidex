"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LoadingScreen from "../components/LoadingScreen";

export default function Home() {
  const { data: session, status } = useSession();
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
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

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
    </>
  );
}