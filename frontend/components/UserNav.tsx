"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function UserNav() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center gap-4">
        <div className="animate-pulse bg-gray-200 h-10 w-24 rounded-lg"></div>
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
          {session.user.image && (
            <img
              src={session.user.image}
              alt={session.user.name || "User"}
              className="w-8 h-8 rounded-full"
            />
          )}
          <div className="text-white">
            <p className="text-sm font-medium">
              {session.user.name || session.user.email}
            </p>
            <p className="text-xs opacity-75">{session.user.email}</p>
          </div>
        </div>
        <Link
          href="/profile"
          className="px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg border border-white/20 hover:bg-white/20 transition-colors"
        >
          Profile
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="px-4 py-2 bg-red-500/80 backdrop-blur-sm text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Link
        href="/auth/signin"
        className="px-4 py-2 text-white hover:text-gray-200 transition-colors"
      >
        Sign In
      </Link>
      <Link
        href="/auth/signup"
        className="px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-gray-100 transition-colors font-medium"
      >
        Sign Up
      </Link>
    </div>
  );
}

