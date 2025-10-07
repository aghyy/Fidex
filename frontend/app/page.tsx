"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UserNav from "../components/UserNav";
import LoadingScreen from "../components/LoadingScreen";

export default function Home() {
  const [msg, setMsg] = useState("");
  const { data: session, status } = useSession();
  const router = useRouter();
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signup");
    }
  }, [status, router]);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/tests`)
      .then(res => res.json())
      .then(data => setMsg(data.message))
      .catch(err => console.error("Failed to fetch from backend:", err));
  }, []);

  // Show loading state while checking authentication or redirecting
  if (status === "loading" || status === "unauthenticated") {
    return <LoadingScreen />;
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
      <nav className="w-full px-8 py-4 backdrop-blur-sm bg-white/10 border-b border-white/20">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Fidex</h1>
          </div>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-8 py-16">
        <div className="text-center text-white mb-12">
          <h2 className="text-5xl font-bold mb-4">
            Welcome to Fidex
          </h2>
          {msg && (
            <p className="mt-4 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg inline-block">
              Backend says: <strong>{msg}</strong>
            </p>
          )}
        </div>

        {session && (
          <div className="mt-12 bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-4">
              You&apos;re signed in! 🎉
            </h3>
            <p className="text-white/80 mb-4">
              Welcome back, <strong>{(session.user as { firstName?: string; lastName?: string }).firstName} {(session.user as { firstName?: string; lastName?: string }).lastName}</strong>!
            </p>
            <p className="text-white/80 text-sm">
              You now have access to protected routes and can interact with the backend API securely.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}