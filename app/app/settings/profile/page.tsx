"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import imageCompression from "browser-image-compression";
import PasswordDialog from "@/components/sidebar/profile-dialogs/PasswordDialog";
import DeleteAccountDialog from "@/components/sidebar/profile-dialogs/DeleteAccountDialog";
import PasskeysDialog from "@/components/sidebar/profile-dialogs/PasskeysDialog";
import { IconX } from "@tabler/icons-react";

export default function ProfileSettingsPage() {
  const { status, data: session, update } = useSession();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [isOAuthUser, setIsOAuthUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signup");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    setProfileLoaded(false);
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
          } else {
            setImage("");
            setImagePreview("");
          }
        }
      })
      .catch(() => { })
      .finally(() => setProfileLoaded(true));
  }, [status]);

  const initials = useMemo(() => {
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
    const mail = session?.user?.email || "U";
    return (mail[0] || "U").toUpperCase();
  }, [firstName, lastName, session?.user?.email]);

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
    } catch {
      setError("Failed to process image. Please try a different file.");
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImage("");
    setImagePreview("");
    const fileInput = document.getElementById('settings-profile-pic-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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
      setLoading(false);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  if (status === "loading" || status === "unauthenticated" || !profileLoaded) {
    return <LoadingScreen />;
  }

  return (
    <>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/settings')}
            className="p-1 hover:bg-accent rounded transition-colors"
            aria-label="Back to settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>

        <section className="rounded-xl border bg-background p-4 sm:p-6">
          <form onSubmit={handleProfileUpdate} className="space-y-5">
            <div className="flex items-center md:justify-start justify-center gap-4">
              <div className="relative group">
                <input
                  type="file"
                  id="settings-profile-pic-upload"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={isOAuthUser}
                />
                <label htmlFor="settings-profile-pic-upload" className="cursor-pointer">
                  <Avatar className="h-20 w-20 border-2" key={imagePreview || 'no-image-settings'}>
                    {imagePreview ? (
                      <AvatarImage src={imagePreview} alt={firstName || "User"} />
                    ) : (
                      <AvatarFallback className="text-xl font-semibold">
                        {initials}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </label>
                {!isOAuthUser && imagePreview && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors shadow-lg"
                    title="Remove profile picture"
                  >
                    <IconX className="h-4 w-4" />
                  </button>
                )}
              </div>
              {isOAuthUser && (
                <p className="text-xs text-muted-foreground">
                  Profile picture managed by your Google account
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">First Name</label>
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
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Last Name</label>
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
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="username"
              />
              <p className="text-[10px] text-muted-foreground mt-1">3-20 characters, letters, numbers, and underscores</p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-3 py-2 text-sm border rounded-md bg-muted text-muted-foreground cursor-not-allowed"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Email cannot be changed</p>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-950 p-3">
                <p className="text-xs text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </section>

        <div className="mt-6 space-y-4">
          <div className="flex md:flex-row flex-col gap-4">
            <div className="rounded-lg border p-4 flex-1">
              {!isOAuthUser ? (
                <PasswordDialog />
              ) : (
                <p className="text-xs text-muted-foreground">Password managed by your Google account</p>
              )}
            </div>
            <div className="rounded-lg border p-4 flex-1">
              <PasskeysDialog isOAuthUser={isOAuthUser} />
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <DeleteAccountDialog isOAuthUser={isOAuthUser} />
          </div>
        </div>
      </div>
    </>
  );
}
