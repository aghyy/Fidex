"use client";

import { signOut } from "next-auth/react";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import AccentColorPicker from "@/components/settings/AccentColorPicker";
import { IconLogout } from "@tabler/icons-react";
import { BasicUser } from "@/types/user";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
} from "../motion-primitives/morphing-dialog";
import { useSidebar } from "../ui/sidebar";
import { useMemo } from "react";

interface SidebarFooterProps {
  sessionUser?: BasicUser;
  profileImage: string | null;
  profileData: BasicUser | null;
  imageLoading: boolean;
}

export default function SidebarFooter({
  sessionUser,
  profileImage,
  profileData,
  imageLoading
}: SidebarFooterProps) {
  const triggerFirstName = profileData?.firstName || sessionUser?.firstName || "";
  const triggerLastName = profileData?.lastName || sessionUser?.lastName || "";
  const triggerEmail = sessionUser?.email || "";
  const triggerUsername = profileData?.username || "user";
  const triggerInitials = useMemo(() => {
    const first = triggerFirstName.trim();
    const last = triggerLastName.trim();
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
    if (first) return first.slice(0, 2).toUpperCase();
    if (last) return last.slice(0, 2).toUpperCase();
    if (triggerUsername) return triggerUsername.slice(0, 2).toUpperCase();
    if (triggerEmail) return triggerEmail.slice(0, 2).toUpperCase();
    return "U";
  }, [triggerFirstName, triggerLastName, triggerUsername, triggerEmail]);
  const triggerUserNameLabel = triggerFirstName && triggerLastName ? `${triggerFirstName} ${triggerLastName}` : "User";

  const { open } = useSidebar();

  // TODO: dont allow change username more than 3 times in 30 days but one can always change to old username for 14 days (new table for reserved usernames)
  // TODO: allow change email but with verification email (new table for email verification tokens)

  const triggerContent = useMemo(() => (
    <Avatar
      key={profileImage ?? "no-image"}
      className="h-10 w-10 border-2 border-white/30 hover:border-white/50 transition-colors"
    >
      {!imageLoading && profileImage ? (
        <AvatarImage src={profileImage} alt={triggerUserNameLabel} />
      ) : (
        <AvatarFallback className="text-xs font-semibold">
          {triggerInitials}
        </AvatarFallback>
      )}
    </Avatar>
  ), [imageLoading, profileImage, triggerInitials, triggerUserNameLabel]);

  const triggerText = useMemo(() => (
    <div
      className={`flex min-w-0 flex-col leading-tight transition-all duration-200 ${
        !open ? "w-0 overflow-hidden opacity-0" : "opacity-100"
      }`}
    >
      <span className="text-[13px] truncate" title={triggerUserNameLabel}>
        {triggerUserNameLabel}
      </span>
      <span className="text-[11px] text-muted-foreground truncate text-left" title={`@${triggerUsername}`}>
        @{triggerUsername}
      </span>
    </div>
  ), [open, triggerUserNameLabel, triggerUsername]);

  return (
    <div className={`flex flex-col transition-all duration-200 gap-2`}>
      <MorphingDialog lockSidebar>
        <div className="flex items-center justify-between gap-2">
          <MorphingDialogTrigger
            className={`flex w-full items-center overflow-visible rounded-md gap-2 -ml-[0.125rem]`}
          >
            {triggerContent}
            {triggerText}
          </MorphingDialogTrigger>
        </div>

        <MorphingDialogContainer>
          <MorphingDialogContent
            className="w-[420px] max-w-[92vw] rounded-2xl glass-dialog shadow-2xl p-6"
            style={{ overflow: "visible" }}
          >
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3">
                <Avatar key={profileImage ?? "no-image-dialog"} className="h-20 w-20 border-2">
                  {!imageLoading && profileImage ? (
                    <AvatarImage src={profileImage} alt={triggerUserNameLabel} />
                  ) : (
                    <AvatarFallback className="text-xl font-semibold">
                      {triggerInitials}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="text-center">
                  <div className="text-base font-semibold">{triggerUserNameLabel || 'User'}</div>
                  <div className="text-sm text-muted-foreground">@{triggerUsername}</div>
                  <div className="text-sm text-muted-foreground">{triggerEmail}</div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex flex-col gap-2">
                  <span className="text-xs leading-none uppercase font-semibold text-muted-foreground">Mode</span>
                  <AnimatedThemeToggler />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs leading-none uppercase font-semibold text-muted-foreground">Accent color</span>
                  <AccentColorPicker />
                </div>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-colors"
                >
                  <IconLogout className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          </MorphingDialogContent>
        </MorphingDialogContainer>
      </MorphingDialog>
    </div>
  );
}