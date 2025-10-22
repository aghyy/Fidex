"use client";

import { signOut, useSession } from "next-auth/react";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { IconLogout, IconPencil, IconX, IconKey, IconTrash } from "@tabler/icons-react";
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
import imageCompression from "browser-image-compression";
import PasswordDialog from "./profile-dialogs/PasswordDialog";
import DeleteAccountDialog from "./profile-dialogs/DeleteAccountDialog";
import PasskeysDialog from "./profile-dialogs/PasskeysDialog";

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
  const { update } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogView, setDialogView] = useState<'profile' | 'password' | 'delete' | 'passkeys'>('profile');
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [isOAuthUser, setIsOAuthUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const triggerContentRef = useRef<{
    image: string | null;
    initials: string;
    userName: string;
    username: string;
  } | null>(null);

  const dialogInitials = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : (email?.[0] || "U").toUpperCase();
  const dialogUserNameLabel = firstName && lastName ? `${firstName} ${lastName}` : "User";

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
    if (!sessionUser) return;

    fetch("/api/user/profile", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setFirstName(data.user.firstName || "");
          setLastName(data.user.lastName || "");
          setUsername(data.user.username || "");
          setEmail(data.user.email || "");
          setIsOAuthUser(data.user.isOAuthUser || false);
          if (data.user.image) {
            setImage(data.user.image);
            setImagePreview(data.user.image);
          }
        }
      })
      .catch(err => console.error("Error fetching profile:", err));
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
      setDialogView('profile');

      // Reset form to original values
      setFirstName(profileData?.firstName || sessionUser?.firstName || "");
      setLastName(profileData?.lastName || sessionUser?.lastName || "");
      setUsername(profileData?.username || "");
      setEmail(sessionUser?.email || "");
      setImage(profileImage || "");
      setImagePreview(profileImage || "");
      setError("");

      setTimeout(() => triggerContentRef.current = null, 300);
    };

    window.addEventListener('morphing-dialog:opened', handleDialogOpen);
    window.addEventListener('morphing-dialog:closed', handleDialogClose);

    return () => {
      window.removeEventListener('morphing-dialog:opened', handleDialogOpen);
      window.removeEventListener('morphing-dialog:closed', handleDialogClose);
    };
  }, [profileImage, triggerInitials, triggerUserNameLabel, triggerUsername, profileData, sessionUser]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
        fileType: file.type,
      });

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImage(base64String);
        setImagePreview(base64String);
      };
      reader.readAsDataURL(compressedFile);
    } catch (err) {
      console.error("Error compressing image:", err);
      setError("Failed to process image. Please try a different file.");
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setImage("");
    setImagePreview("");
    setError("");

    const fileInput = document.getElementById('profile-pic-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ firstName, lastName, username, image }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update profile");
        setLoading(false);
        return;
      }

      await update({
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        username: data.user.username,
      });

      // Reload immediately to update the sidebar avatar
      window.location.reload();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

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
    <div className={`flex flex-col border-t transition-all duration-200 ${!isDialogOpen ? "gap-2 pt-2" : "gap-1 pt-4"}`}>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/auth/signin" })}
        className={`w-full flex items-center rounded-md px-[6px] text-sm gap-3 ${!isDialogOpen && "py-2"}`}
        title="Sign out"
        aria-label="Sign out"
      >
        <IconLogout className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
        {open && (
          <span className={`transition-opacity duration-200 truncate text-muted-foreground ${!open && "opacity-0"}`}>Sign out</span>
        )}
      </button>

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
            {dialogView === 'profile' && (
              <form onSubmit={handleProfileUpdate} className="space-y-5">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative group">
                    <input
                      type="file"
                      id="profile-pic-upload"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      disabled={isOAuthUser}
                    />
                    <Avatar className="h-20 w-20 border-2 cursor-pointer" key={imagePreview || 'no-image'}>
                      {imagePreview ? (
                        <AvatarImage src={imagePreview} alt={dialogUserNameLabel} />
                      ) : (
                        <AvatarFallback className="text-xl font-semibold">
                          {dialogInitials}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    {!isOAuthUser && (
                      <>
                        <label
                          htmlFor="profile-pic-upload"
                          className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <IconPencil className="h-6 w-6 text-white" />
                        </label>
                        {imagePreview && (
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors shadow-lg z-10"
                            title="Remove profile picture"
                          >
                            <IconX className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  {isOAuthUser && (
                    <p className="text-xs text-muted-foreground text-center">
                      Profile picture managed by your Google account
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={isOAuthUser}
                      className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={isOAuthUser}
                      className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="username"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    3-20 characters, letters, numbers, and underscores
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full px-3 py-2 text-sm border rounded-md bg-muted text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Email cannot be changed
                  </p>
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 dark:bg-red-950 p-3">
                    <p className="text-xs text-red-800 dark:text-red-200">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDialogView('passkeys')}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <IconKey className="h-4 w-4" />
                      Manage Passkeys
                    </button>

                    {!isOAuthUser && (
                      <button
                        type="button"
                        onClick={() => setDialogView('password')}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <IconKey className="h-4 w-4" />
                        Change Password
                      </button>
                    )}
                  </div>

                  <AnimatedThemeToggler />

                  <button
                    type="button"
                    onClick={() => setDialogView('delete')}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-destructive text-destructive px-3 py-2 text-sm hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <IconTrash className="h-4 w-4" />
                    Delete Account
                  </button>
                </div>
              </form>
            )}

            {dialogView === 'password' && (
              <PasswordDialog onBack={() => setDialogView('profile')} />
            )}

            {dialogView === 'delete' && (
              <DeleteAccountDialog
                onBack={() => setDialogView('profile')}
                isOAuthUser={isOAuthUser}
              />
            )}

            {dialogView === 'passkeys' && (
              <PasskeysDialog
                onBack={() => setDialogView('profile')}
                isOAuthUser={isOAuthUser}
              />
            )}
          </MorphingDialogContent>
        </MorphingDialogContainer>
      </MorphingDialog>
    </div>
  );
}