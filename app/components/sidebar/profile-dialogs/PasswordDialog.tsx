"use client";

import { motion } from "motion/react";
import { useState } from "react";

interface PasswordDialogProps {
  onBack: () => void;
}

export default function PasswordDialog({ onBack }: PasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setPasswordLoading(true);

    try {
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordError(data.error || "Failed to change password");
      } else {
        setPasswordMessage(data.message || "Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setPasswordMessage("");
          onBack();
        }, 1500);
      }
    } catch {
      setPasswordError("Something went wrong");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCancel = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordMessage("");
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
        <h2 className="text-lg font-semibold">Change Password</h2>
      </div>
      
      <form onSubmit={handlePasswordChange} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Current Password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Enter current password"
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Min 6 characters"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Confirm new password"
          />
        </div>

        {passwordMessage && (
          <div className="rounded-md bg-green-50 dark:bg-green-950 p-3">
            <p className="text-xs text-green-800 dark:text-green-200">{passwordMessage}</p>
          </div>
        )}
        {passwordError && (
          <div className="rounded-md bg-red-50 dark:bg-red-950 p-3">
            <p className="text-xs text-red-800 dark:text-red-200">{passwordError}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={passwordLoading}
            className="flex-1 py-2 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {passwordLoading ? "Changing..." : "Change Password"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

