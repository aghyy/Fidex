"use client";

import { signOut } from "next-auth/react";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
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
import { useEffect, useState, useMemo, useRef } from "react";

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const triggerContentRef = useRef<{
    image: string | null;
    initials: string;
    userName: string;
    username: string;
  } | null>(null);

  const triggerFirstName = profileData?.firstName || sessionUser?.firstName || "";
  const triggerLastName = profileData?.lastName || sessionUser?.lastName || "";
  const triggerEmail = sessionUser?.email || "";
  const triggerUsername = profileData?.username || "user";
  const triggerInitials = triggerFirstName && triggerLastName
    ? `${triggerFirstName[0]}${triggerLastName[0]}`.toUpperCase()
    : (triggerEmail?.[0] || "U").toUpperCase();
  const triggerUserNameLabel = triggerFirstName && triggerLastName ? `${triggerFirstName} ${triggerLastName}` : "User";

  const { open } = useSidebar();

  const { displayImage, displayInitials, displayUserName, displayUsername } = useMemo(() => {
    if (isDialogOpen && triggerContentRef.current) {
      return {
        displayImage: triggerContentRef.current.image,
        displayInitials: triggerContentRef.current.initials,
        displayUserName: triggerContentRef.current.userName,
        displayUsername: triggerContentRef.current.username,
      };
    }
    return {
      displayImage: profileImage,
      displayInitials: triggerInitials,
      displayUserName: triggerUserNameLabel,
      displayUsername: triggerUsername,
    };
  }, [isDialogOpen, profileImage, triggerInitials, triggerUserNameLabel, triggerUsername]);

  // TODO: dont allow change username more than 3 times in 30 days but one can always change to old username for 14 days (new table for reserved usernames)
  // TODO: allow change email but with verification email (new table for email verification tokens)
  // TODO: change theme like vercel? toggle with 3 options (liquid glass? animations? blur?)

  useEffect(() => {
    // no-op: dialog now shows read-only info
  }, [sessionUser]);

  useEffect(() => {
    const handleDialogOpen = () => {
      triggerContentRef.current = {
        image: profileImage,
        initials: triggerInitials,
        userName: triggerUserNameLabel,
        username: triggerUsername,
      };
      setIsDialogOpen(true);
    };

    const handleDialogClose = () => {
      setIsDialogOpen(false);
      setTimeout(() => triggerContentRef.current = null, 300);
    };

    window.addEventListener('morphing-dialog:opened', handleDialogOpen);
    window.addEventListener('morphing-dialog:closed', handleDialogClose);

    return () => {
      window.removeEventListener('morphing-dialog:opened', handleDialogOpen);
      window.removeEventListener('morphing-dialog:closed', handleDialogClose);
    };
  }, [profileImage, triggerInitials, triggerUserNameLabel, triggerUsername, profileData, sessionUser]);

  // All profile editing moved to settings page; dialog is read-only now

  const triggerContent = useMemo(() => (
    <Avatar className="h-8 w-8 border-2 border-white/30 hover:border-white/50 transition-colors">
      {!imageLoading && displayImage ? (
        <AvatarImage src={displayImage} alt={displayUserName} />
      ) : (
        <AvatarFallback className="text-xs font-semibold">
          {displayInitials}
        </AvatarFallback>
      )}
    </Avatar>
  ), [imageLoading, displayImage, displayInitials, displayUserName]);

  const triggerText = useMemo(() => (
    <div className={`flex min-w-0 flex-col leading-tight transition-opacity duration-200 ${!open && "opacity-0"}`}>
      <span className="text-[13px] truncate" title={displayUserName}>
        {displayUserName}
      </span>
      <span className="text-[11px] text-muted-foreground truncate text-left" title={`@${displayUsername}`}>
        @{displayUsername}
      </span>
    </div>
  ), [open, displayUserName, displayUsername]);

  return (
    <div className={`flex flex-col transition-all duration-200 gap-2`}>
      <MorphingDialog>
        <div className="flex items-center justify-between gap-2">
          <MorphingDialogTrigger
            className="flex items-center gap-2 overflow-hidden rounded-md"
            style={isDialogOpen ? {
              pointerEvents: 'none',
              position: 'fixed',
              zIndex: -1,
              opacity: 0
            } : undefined}
          >
            {triggerContent}
            {triggerText}
          </MorphingDialogTrigger>
        </div>

        <MorphingDialogContainer>
          <MorphingDialogContent className="w-[420px] max-w-[92vw] rounded-2xl bg-popover text-popover-foreground shadow-2xl border p-6 max-h-[90vh] overflow-y-auto">
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-20 w-20 border-2">
                  {!imageLoading && displayImage ? (
                    <AvatarImage src={displayImage} alt={displayUserName} />
                  ) : (
                    <AvatarFallback className="text-xl font-semibold">
                      {displayInitials}
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
                <AnimatedThemeToggler />
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