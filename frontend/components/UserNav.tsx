"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function UserNav() {
  const { data: session, status } = useSession();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    // Fetch profile data from API if user is logged in
    if (session?.user) {
      setImageLoading(true);
      fetch("/api/user/profile", {
        credentials: "include",
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setProfileData(data.user);
            if (data.user.image) {
              setProfileImage(data.user.image);
            }
          }
        })
        .catch(err => console.error("Failed to fetch profile:", err))
        .finally(() => setImageLoading(false));
    }
  }, [session]);

  if (status === "loading") {
    return (
      <div className="flex items-center gap-4">
        <div className="animate-pulse bg-gray-200 h-10 w-24 rounded-lg"></div>
      </div>
    );
  }

  if (session?.user) {
    const firstName = profileData?.firstName || "";
    const lastName = profileData?.lastName || "";
    const userName = firstName && lastName ? `${firstName} ${lastName}` : "User";
    const userInitials = firstName && lastName 
      ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
      : (session.user.email?.charAt(0) || "U").toUpperCase();
    const username = profileData?.username || "user";

    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
          {/* Show profile image or initials */}
          {!imageLoading && profileImage ? (
            <img
              src={profileImage}
              alt={userName}
              className="w-8 h-8 rounded-full object-cover border-2 border-white/30"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                setProfileImage(null);
              }}
            />
          ) : !imageLoading ? (
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30">
              <span className="text-white text-sm font-bold">{userInitials}</span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse"></div>
          )}
          <div className="text-white">
            <p className="text-sm font-medium">
              {userName}
            </p>
            <p className="text-xs opacity-75">@{username}</p>
          </div>
        </div>
        <Link
          href="/profile"
          className="px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg border border-white/20 hover:bg-white/20 transition-colors"
        >
          Profile
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
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

