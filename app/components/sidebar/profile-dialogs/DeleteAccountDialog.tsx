"use client";

import { motion } from "motion/react";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { IconAlertTriangle } from "@tabler/icons-react";

interface DeleteAccountDialogProps {
  onBack: () => void;
  isOAuthUser: boolean;
}

export default function DeleteAccountDialog({ onBack, isOAuthUser }: DeleteAccountDialogProps) {
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError("");

    if (!isOAuthUser && !deletePassword) {
      setDeleteError("Password is required");
      return;
    }

    if (!confirm("Are you absolutely sure? This action cannot be undone and all your data will be permanently deleted.")) {
      return;
    }

    setDeleteLoading(true);

    try {
      const response = await fetch("/api/user/delete-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: deletePassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setDeleteError(data.error || "Failed to delete account");
        setDeleteLoading(false);
        return;
      }

      await signOut({ redirect: false });
      window.location.href = "/auth/signin?deleted=true";
    } catch {
      setDeleteError("Something went wrong");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancel = () => {
    setDeletePassword("");
    setDeleteError("");
    onBack();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="p-1 hover:bg-accent rounded transition-colors"
          aria-label="Back to profile"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-destructive">Delete Account</h2>
      </div>

      <div className="rounded-md bg-red-50 dark:bg-red-950 p-4 border border-red-200 dark:border-red-900">
        <div className="flex gap-3">
          <IconAlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
              Danger Zone
            </h3>
            <p className="text-xs text-red-700 dark:text-red-300">
              This action is permanent and cannot be undone. All your data will be permanently deleted.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleDeleteAccount} className="space-y-4">
        {!isOAuthUser && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Confirm Password
            </label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter your password to confirm"
              autoFocus
            />
          </div>
        )}

        {deleteError && (
          <div className="rounded-md bg-red-50 dark:bg-red-950 p-3">
            <p className="text-xs text-red-800 dark:text-red-200">{deleteError}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={deleteLoading}
            className="flex-1 py-2 px-4 text-sm font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deleteLoading ? "Deleting..." : "Delete My Account"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

