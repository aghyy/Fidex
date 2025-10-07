"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import UserNav from "../components/UserNav";

export default function Home() {
  const [msg, setMsg] = useState("");
  const { data: session } = useSession();

  useEffect(() => {
    fetch("http://localhost:3001/api/tests")
      .then(res => res.json())
      .then(data => setMsg(data.message))
      .catch(err => console.error("Failed to fetch from backend:", err));
  }, []);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
      <nav className="w-full px-8 py-4 backdrop-blur-sm bg-white/10 border-b border-white/20">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Fidex</h1>
            <span className="px-3 py-1 bg-white/20 text-white text-xs rounded-full">
              NextAuth Demo
            </span>
          </div>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-8 py-16">
        <div className="text-center text-white mb-12">
          <h2 className="text-5xl font-bold mb-4">
            Welcome to Fidex
          </h2>
          <p className="text-xl opacity-90">
            Next.js Fullstack App with NextAuth v5
          </p>
          {msg && (
            <p className="mt-4 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg inline-block">
              Backend says: <strong>{msg}</strong>
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20">
            <div className="text-4xl mb-4">🔐</div>
            <h3 className="text-xl font-bold text-white mb-2">Authentication</h3>
            <p className="text-white/80 text-sm">
              Secure authentication with NextAuth v5, supporting credentials and OAuth providers
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20">
            <div className="text-4xl mb-4">💾</div>
            <h3 className="text-xl font-bold text-white mb-2">Database</h3>
            <p className="text-white/80 text-sm">
              PostgreSQL database with Prisma ORM for type-safe database access
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-white mb-2">Fullstack</h3>
            <p className="text-white/80 text-sm">
              Separate frontend and backend with Next.js App Router and API routes
            </p>
          </div>
        </div>

        {session && (
          <div className="mt-12 bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-4">
              You&apos;re signed in! 🎉
            </h3>
            <p className="text-white/80 mb-4">
              Welcome back, <strong>{session.user.name || session.user.email}</strong>!
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