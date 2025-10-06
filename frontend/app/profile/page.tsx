"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [backendUser, setBackendUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/profile");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchUserFromBackend = async () => {
      try {
        const response = await fetch("http://localhost:3001/api/protected/user", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setBackendUser(data.user);
        }
      } catch (error) {
        console.error("Error fetching user from backend:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchUserFromBackend();
    }
  }, [session]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100">
        <div className="animate-pulse text-xl text-gray-700">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-6"
        >
          ← Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-12">
            <div className="flex items-center gap-6">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-white flex items-center justify-center">
                  <span className="text-4xl font-bold text-indigo-600">
                    {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase()}
                  </span>
                </div>
              )}
              <div className="text-white">
                <h1 className="text-3xl font-bold">
                  {session.user.name || "User"}
                </h1>
                <p className="text-indigo-100 mt-2">{session.user.email}</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Profile Information
              </h2>
              <div className="grid gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="text-sm font-medium text-gray-600">
                    User ID
                  </label>
                  <p className="text-gray-900 mt-1">{session.user.id}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="text-sm font-medium text-gray-600">
                    Email
                  </label>
                  <p className="text-gray-900 mt-1">{session.user.email}</p>
                </div>

                {session.user.name && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="text-sm font-medium text-gray-600">
                      Name
                    </label>
                    <p className="text-gray-900 mt-1">{session.user.name}</p>
                  </div>
                )}
              </div>
            </div>

            {backendUser && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Backend Data
                </h2>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800 mb-2">
                    ✓ Successfully authenticated with backend
                  </p>
                  <pre className="text-xs bg-white p-3 rounded overflow-auto">
                    {JSON.stringify(backendUser, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Session Details
              </h3>
              <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto">
                {JSON.stringify(session, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

