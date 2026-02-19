"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAtom, useSetAtom } from "jotai";
import Skeleton from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { profileAtom, profileLoadedAtom } from "@/state/profile";

export default function AdvancedSettingsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [profile] = useAtom(profileAtom);
  const [profileLoaded] = useAtom(profileLoadedAtom);
  const setProfile = useSetAtom(profileAtom);
  const [bookAllTransactions, setBookAllTransactions] = useState(Boolean(profile?.bookAllTransactions));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signup");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !profile) return;
    setBookAllTransactions(Boolean(profile.bookAllTransactions));
  }, [status, profile]);

  async function handleAdvancedUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bookAllTransactions }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to update advanced settings");
        setLoading(false);
        return;
      }
      if (profile) {
        setProfile({
          ...profile,
          bookAllTransactions: Boolean(data.user.bookAllTransactions),
        });
      }
      setLoading(false);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  if (status === "loading" || status === "unauthenticated" || !profileLoaded) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-7 w-40" />
        </div>
        <section className="rounded-xl border bg-background p-4 sm:p-6">
          <div className="space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-16 w-full rounded-md" />
            <div className="flex justify-end">
              <Skeleton className="h-9 w-44" />
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.push("/settings")}
          className="p-1 hover:bg-accent rounded transition-colors"
          aria-label="Back to settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold">Advanced Settings</h1>
      </div>

      <section className="rounded-xl border bg-background p-4 sm:p-6">
        <form onSubmit={handleAdvancedUpdate} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Extra behavior and customization options will appear here.
          </p>

          <div className="rounded-md border p-3">
            <label className="flex items-start gap-3">
              <Checkbox
                checked={bookAllTransactions}
                onCheckedChange={(checked) => setBookAllTransactions(checked === true)}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">Book all transactions</span>
                <span className="block text-xs text-muted-foreground">
                  Include pending transactions when calculating balances, totals, charts, and statistics.
                </span>
              </span>
            </label>
          </div>

          {error ? (
            <div className="rounded-md bg-red-50 dark:bg-red-950 p-3">
              <p className="text-xs text-red-800 dark:text-red-200">{error}</p>
            </div>
          ) : null}

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Saving..." : "Save Advanced Settings"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
