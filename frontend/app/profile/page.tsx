"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import LoadingScreen from "../../components/LoadingScreen";

interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  image?: string;
  isOAuthUser?: boolean;
  createdAt?: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [backendUser, setBackendUser] = useState<UserProfile | null>(null);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signup?callbackUrl=/profile");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch user profile data (includes latest image)
        const profileResponse = await fetch("/api/user/profile", {
          credentials: "include",
        });
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          console.log("📸 Profile data fetched:", {
            hasImage: !!profileData.user?.image,
            imageSize: profileData.user?.image?.length || 0,
            imageSizeKB: Math.round((profileData.user?.image?.length || 0) / 1024) + " KB",
            firstName: profileData.user?.firstName,
            lastName: profileData.user?.lastName,
            username: profileData.user?.username,
            email: profileData.user?.email,
          });
          setProfileData(profileData.user);
          
          // Also set as backend user for display (same data)
          setBackendUser(profileData.user);
        } else {
          console.error("❌ Failed to fetch profile:", profileResponse.status);
        }
      } catch (error) {
        console.error("❌ Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchUserData();
    }
  }, [session]);

  if (status === "loading" || status === "unauthenticated" || loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-6"
        >
          ← Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {profileData?.image ? (
                  <img
                    src={profileData.image}
                    alt={`${profileData?.firstName} ${profileData?.lastName}` || "User"}
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
                    onError={(e) => {
                      console.error("Image failed to load");
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-white flex items-center justify-center"
                  style={{ display: profileData?.image ? 'none' : 'flex' }}
                >
                  <span className="text-4xl font-bold text-indigo-600">
                    {profileData?.firstName && profileData?.lastName
                      ? `${profileData.firstName.charAt(0)}${profileData.lastName.charAt(0)}`.toUpperCase()
                      : profileData?.firstName
                        ? `${profileData.firstName.charAt(0)}`.toUpperCase()
                        : session.user.email?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                <div className="text-white">
                  <h1 className="text-3xl font-bold">
                    {profileData?.firstName && profileData?.lastName 
                      ? `${profileData.firstName} ${profileData.lastName}` 
                      : "User"}
                  </h1>
                  <p className="text-indigo-100 mt-1">@{profileData?.username}</p>
                  <p className="text-indigo-200 text-sm mt-1">{session.user.email}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/profile/edit"
                  className="px-6 py-3 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium shadow-lg"
                >
                  Edit Profile
                </Link>
                <Link
                  href="/profile/passkeys"
                  className="px-6 py-3 bg-white/90 text-indigo-600 rounded-lg hover:bg-white transition-colors font-medium shadow-lg flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Passkeys
                </Link>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Profile Information
              </h2>
              <div className="grid gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="text-sm font-medium text-gray-600">
                    User ID
                  </label>
                  <p className="text-gray-900 mt-1">{session.user.id}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="text-sm font-medium text-gray-600">
                    Email
                  </label>
                  <p className="text-gray-900 mt-1">{session.user.email}</p>
                </div>

                {((profileData?.firstName && profileData?.lastName) || ('name' in session.user && session.user.name)) && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="text-sm font-medium text-gray-600">
                      Name
                    </label>
                    <p className="text-gray-900 mt-1">
                      {profileData?.firstName && profileData?.lastName 
                        ? `${profileData.firstName} ${profileData.lastName}` 
                        : ('name' in session.user ? session.user.name : '')}
                    </p>
                  </div>
                )}

                {profileData?.image && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="text-sm font-medium text-gray-600">
                      Profile Picture
                    </label>
                    <p className="text-gray-900 mt-1 text-xs">
                      {profileData.image.length > 50 
                        ? `Base64 image (${Math.round(profileData.image.length / 1024)} KB)` 
                        : profileData.image}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {backendUser && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Backend Data
                </h2>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800 mb-2">
                    ✓ Successfully authenticated with backend
                  </p>
                  <pre className="text-xs bg-white text-gray-900 p-3 rounded overflow-auto">
                    {JSON.stringify(backendUser, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Session Details
              </h3>
              <pre className="bg-gray-50 text-gray-900 p-4 rounded-lg text-xs overflow-auto">
                {JSON.stringify(session, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

