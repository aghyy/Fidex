"use client";

import { signOut, useSession } from "next-auth/react";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { IconLogout } from "@tabler/icons-react";
import { BasicUser } from "@/types/user";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogSubtitle,
} from "../motion-primitives/morphing-dialog";
import { useSidebar } from "../ui/sidebar";

export default function SidebarFooter({ sessionUser }: { sessionUser?: BasicUser }) {
  const { data: session } = useSession();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<BasicUser | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const firstName = profileData?.firstName || sessionUser?.firstName || "";
  const lastName = profileData?.lastName || sessionUser?.lastName || "";
  const email = sessionUser?.email || "";
  const initials = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : (email?.[0] || "U").toUpperCase();
  const userNameLabel = firstName && lastName ? `${firstName} ${lastName}` : "User";
  const username = profileData?.username || "user";
  const { open } = useSidebar();

  useEffect(() => {
    if (session?.user) {
      setImageLoading(true);
      fetch("/api/user/profile", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setProfileData(data.user);
            if (data.user.image) {
              setProfileImage(data.user.image as string);
            }
          }
        })
        .catch(() => { })
        .finally(() => setImageLoading(false));
    }
  }, [session]);

  return (
    <div className="flex flex-col gap-3">
      {/* TODO: progressive blur behind morphing dialog */}
      {/* TODO: implement edit profile & passkeys in dialog instead of extra page */}
      {/* TODO: responsive, drawer if mobile */}
      <MorphingDialog>
        <div className="flex items-center justify-between gap-2">
          <MorphingDialogTrigger className="flex items-center gap-2 overflow-hidden rounded-md">
            <Avatar className="h-8 w-8 border-2 border-white/30 hover:border-white/50 transition-colors">
              {!imageLoading && profileImage ? (
                <AvatarImage src={profileImage} alt={userNameLabel} />
              ) : (
                <AvatarFallback className="text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>
            <div className={`flex min-w-0 flex-col leading-tight transition-opacity duration-200 ${!open && "opacity-0"}`}>
              <span className="text-[13px] truncate" title={userNameLabel}>
                {userNameLabel}
              </span>
              <span className="text-[11px] text-muted-foreground truncate text-left" title={`@${username}`}>
                @{username}
              </span>
            </div>
          </MorphingDialogTrigger>
        </div>

        <MorphingDialogContainer>
          <MorphingDialogContent className="w-[380px] max-w-[92vw] rounded-2xl bg-popover text-popover-foreground shadow-2xl border p-5">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12 border">
                {!imageLoading && profileImage ? (
                  <AvatarImage src={profileImage} alt={userNameLabel} />
                ) : (
                  <AvatarFallback className="text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="min-w-0 flex-1">
                <MorphingDialogTitle>
                  <div className="text-base font-medium truncate" title={userNameLabel}>{userNameLabel}</div>
                </MorphingDialogTitle>
                <MorphingDialogSubtitle>
                  <div className="text-xs text-muted-foreground truncate">@{username}</div>
                </MorphingDialogSubtitle>
                {sessionUser?.email && (
                  <div className="mt-1 text-xs text-muted-foreground truncate" title={sessionUser.email}>
                    {sessionUser.email}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                href="/profile/passkeys"
                className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                title="Manage passkeys"
              >
                Passkeys
              </Link>
              <Link
                href="/profile/edit"
                className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                title="Edit profile"
              >
                Edit profile
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <AnimatedThemeToggler />

              <button
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                className="flex items-center justify-center rounded-md px-3 py-2 text-sm gap-2 bg-destructive text-destructive-foreground"
                title="Sign out"
                aria-label="Sign out"
              >
                <IconLogout className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </MorphingDialogContent>
        </MorphingDialogContainer>
      </MorphingDialog>
    </div>
  );
}