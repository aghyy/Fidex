import { signOut, useSession } from "next-auth/react";
import { useSidebar } from "../ui/sidebar";
import ThemeToggle from "../theme/ThemeToggle";
import { IconLogout } from "@tabler/icons-react";
import { BasicUser } from "@/types/user";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useEffect, useState } from "react";

export default function SidebarFooter({ sessionUser }: { sessionUser?: BasicUser }) {
  const { open } = useSidebar();
  const { data: session } = useSession();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<{ image?: string; firstName?: string; lastName?: string; username?: string } | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

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
        .catch(() => {})
        .finally(() => setImageLoading(false));
    }
  }, [session]);
  const firstName = profileData?.firstName || sessionUser?.firstName || "";
  const lastName = profileData?.lastName || sessionUser?.lastName || "";
  const email = sessionUser?.email || "";
  const initials = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : (email?.[0] || "U").toUpperCase();
  const userNameLabel = firstName && lastName ? `${firstName} ${lastName}` : "User";
  const username = profileData?.username || "user";

  return (
    <div className="mt-8 pt-4 border-t flex flex-col gap-3">
      <ThemeToggle />

      <button
        onClick={() => signOut({ callbackUrl: "/auth/signin" })}
        className={`flex items-center rounded-md ${open ? "px-3 py-2 text-sm gap-2" : "h-8 w-8 justify-center"}`}
        title="Sign out"
        aria-label="Sign out"
      >
        <IconLogout className="h-4 w-4" />
        {open && <span>Sign out</span>}
      </button>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <Avatar className="h-8 w-8 border-2 border-white/30 hover:border-white/50 transition-colors">
            {!imageLoading && profileImage ? (
              <AvatarImage src={profileImage} alt={userNameLabel} />
            ) : (
              <AvatarFallback className="text-xs font-semibold">
                {initials}
              </AvatarFallback>
            )}
          </Avatar>
          {open && (
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="text-[13px] truncate" title={userNameLabel}>
                {userNameLabel}
              </span>
              <span className="text-[11px] text-muted-foreground truncate" title={`@${username}`}>
                @{username}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}