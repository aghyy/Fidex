"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSetAtom } from "jotai";
import { profileAtom, profileLoadedAtom, type UserProfile } from "@/state/profile";

function ProfileBootstrapper() {
  const { status } = useSession();
  const setProfile = useSetAtom(profileAtom);
  const setLoaded = useSetAtom(profileLoadedAtom);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (status !== "authenticated") {
        setProfile(null);
        setLoaded(false);
        return;
      }
      setLoaded(false);
      try {
        const res = await fetch("/api/user/profile", { credentials: "include" });
        const data = await res.json();
        if (cancelled) return;
        const user = (data?.user ?? {}) as Partial<UserProfile>;
        const profile: UserProfile = {
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          username: user.username || "",
          email: user.email || "",
          image: user.image || "",
          isOAuthUser: Boolean((data?.user as any)?.isOAuthUser),
        };
        setProfile(profile);
      } catch {
        setProfile(null);
      } finally {
        setLoaded(true);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [status, setProfile, setLoaded]);

  return null;
}

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextAuthSessionProvider
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      <ProfileBootstrapper />
      {children}
    </NextAuthSessionProvider>
  );
}

