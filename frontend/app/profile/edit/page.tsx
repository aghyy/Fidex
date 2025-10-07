"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import imageCompression from "browser-image-compression";
import LoadingScreen from "../../../components/LoadingScreen";

export default function EditProfile() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [image, setImage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  
  const [isOAuthUser, setIsOAuthUser] = useState(false);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signup?callbackUrl=/profile/edit");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      // Fetch user data including image from API (not from session)
      fetchUserProfile();
      
      // Check if user signed up via OAuth (no password means OAuth user)
      checkIfOAuthUser();
    }
  }, [session]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/user/profile", {
        credentials: "include",
      });
      const data = await response.json();
      if (data.user) {
        setFirstName(data.user.firstName || "");
        setLastName(data.user.lastName || "");
        setUsername(data.user.username || "");
        if (data.user.image) {
          setImage(data.user.image);
          setImagePreview(data.user.image);
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const checkIfOAuthUser = async () => {
    try {
      const response = await fetch("/api/user/profile", {
        credentials: "include",
      });
      const data = await response.json();
      // If user has no password, they're an OAuth user
      setIsOAuthUser(data.user?.isOAuthUser || false);
    } catch (error) {
      console.error("Error checking user type:", error);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Clear any previous errors
      setError("");
      
      // Check file type
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }

      try {
        // Compress image before uploading
        const options = {
          maxSizeMB: 0.5, // Maximum size: 500KB
          maxWidthOrHeight: 1024, // Maximum dimension: 1024px
          useWebWorker: true,
          fileType: file.type,
        };

        console.log(`🖼️ Original image: ${(file.size / 1024).toFixed(2)} KB`);
        const compressedFile = await imageCompression(file, options);
        console.log(`✅ Compressed image: ${(compressedFile.size / 1024).toFixed(2)} KB`);

        setImageFile(compressedFile);
        
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Error compressing image:", error);
        setError("Failed to process image. Please try a different file.");
      }
    }
  };

  const handleRemoveImage = () => {
    setImage("");
    setImageFile(null);
    setImagePreview("");
    setError("");
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      let imageToSave = image;
      
      // If user uploaded a new image, convert to base64
      if (imageFile) {
        const reader = new FileReader();
        imageToSave = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(imageFile);
        });
      }

      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ firstName, lastName, username, image: imageToSave }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update profile");
        setLoading(false);
        return;
      }

      setMessage("Profile updated successfully!");
      
      // Update session (firstName, lastName, username - not image to avoid token overflow)
      await update({
        ...session,
        user: {
          ...session?.user,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          username: data.user.username,
          // Don't include image in session - it's too large for JWT
        },
      });

      setLoading(false);
      
      // Redirect back to profile after 1.5 seconds
      setTimeout(() => {
        router.push("/profile");
      }, 1500);
    } catch (error) {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError("");
    setPasswordMessage("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      setPasswordLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      setPasswordLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordError(data.error || "Failed to change password");
        setPasswordLoading(false);
        return;
      }

      setPasswordMessage("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordLoading(false);
    } catch (error) {
      setPasswordError("Something went wrong");
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError("");

    try {
      const response = await fetch("/api/user/delete-account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          password: deletePassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setDeleteError(data.error || "Failed to delete account");
        setDeleteLoading(false);
        return;
      }

      // Account deleted successfully - sign out and redirect
      window.location.href = "/auth/signin?deleted=true";
    } catch (error) {
      setDeleteError("Something went wrong");
      setDeleteLoading(false);
    }
  };

  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/profile"
          className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-6"
        >
          ← Back to Profile
        </Link>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-8">
            <h1 className="text-3xl font-bold text-white">Edit Profile</h1>
            <p className="text-indigo-100 mt-2">Update your personal information and password</p>
          </div>

          <div className="p-8 space-y-8">
            {/* Profile Information Form */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Profile Information
              </h2>

              <form onSubmit={handleProfileUpdate} className="space-y-6">
                {isOAuthUser && (
                  <div className="rounded-md bg-blue-50 p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      ℹ️ You signed in with Google. Your name and profile picture are managed by your Google account, but you can change your username below.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      First Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={isOAuthUser}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="First name"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={isOAuthUser}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400"
                    placeholder="Username (3-20 chars, letters, numbers, underscore)"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    3-20 characters, letters, numbers, and underscores only
                  </p>
                </div>

                {!isOAuthUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profile Picture
                    </label>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="Profile preview"
                            className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center border-4 border-gray-200">
                            <span className="text-3xl font-bold text-indigo-600">
                              {firstName && lastName 
                                ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
                                : firstName 
                                  ? `${firstName.charAt(0)}`.toUpperCase()
                                  : "?"}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                        <div className="flex gap-2">
                          <label
                            htmlFor="image-upload"
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
                          >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Choose Image
                          </label>
                          {(imagePreview || image) && (
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Remove
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          PNG, JPG, GIF (automatically compressed to max 500KB)
                        </p>
                        {imageFile && (
                          <p className="text-sm text-green-600 mt-2">
                            ✓ {imageFile.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={session.user.email || ""}
                    disabled
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                {message && (
                  <div className="rounded-md bg-green-50 p-4">
                    <p className="text-sm text-green-800">{message}</p>
                  </div>
                )}

                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </div>

            <hr className="border-gray-200" />

            {/* Change Password Form */}
            {!isOAuthUser && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Change Password
                </h2>

                <form onSubmit={handlePasswordChange} className="space-y-6">
                <div>
                  <label
                    htmlFor="currentPassword"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Current Password
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400"
                    placeholder="Enter current password"
                  />
                </div>

                <div>
                  <label
                    htmlFor="newPassword"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400"
                    placeholder="Enter new password (min 6 characters)"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400"
                    placeholder="Confirm new password"
                  />
                </div>

                {passwordMessage && (
                  <div className="rounded-md bg-green-50 p-4">
                    <p className="text-sm text-green-800">{passwordMessage}</p>
                  </div>
                )}

                {passwordError && (
                  <div className="rounded-md bg-red-50 p-4">
                    <p className="text-sm text-red-800">{passwordError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {passwordLoading ? "Changing..." : "Change Password"}
                </button>
              </form>
            </div>
            )}

            {isOAuthUser && (
              <div className="rounded-md bg-gray-50 p-6 border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Password Change Unavailable</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You signed in with Google. Your password is managed by Google.
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    To change your password, update it in your Google account settings.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Danger Zone - Delete Account */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-red-200">
            <div className="bg-gradient-to-r from-red-500 to-pink-600 px-8 py-6">
              <h2 className="text-2xl font-bold text-white">
                Danger Zone
              </h2>
              <p className="text-red-100 mt-1">Irreversible actions</p>
            </div>

            <div className="p-8">
              <div className="border-2 border-red-200 rounded-lg p-6 bg-red-50">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-red-900 mb-2">Delete Account</h3>
                    <p className="text-sm text-red-800 mb-4">
                      Once you delete your account, there is no going back. This will permanently delete:
                    </p>
                    <ul className="text-sm text-red-700 space-y-1 mb-4 ml-4">
                      <li>• Your profile information</li>
                      <li>• All your passkeys</li>
                      <li>• Your authentication sessions</li>
                      <li>• All associated data</li>
                    </ul>
                    
                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors font-medium"
                      >
                        Delete My Account
                      </button>
                    ) : (
                      <div className="space-y-4 mt-4 p-4 bg-white rounded-lg border-2 border-red-300">
                        <p className="text-sm font-semibold text-red-900">
                          ⚠️ Are you absolutely sure?
                        </p>
                        
                        {!isOAuthUser && (
                          <div>
                            <label htmlFor="deletePassword" className="block text-sm font-medium text-gray-700 mb-2">
                              Enter your password to confirm
                            </label>
                            <input
                              id="deletePassword"
                              type="password"
                              value={deletePassword}
                              onChange={(e) => setDeletePassword(e.target.value)}
                              placeholder="Your password"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            />
                          </div>
                        )}

                        {isOAuthUser && (
                          <p className="text-sm text-gray-600">
                            Click "Yes, Delete My Account" below to confirm deletion.
                          </p>
                        )}

                        {deleteError && (
                          <div className="rounded-md bg-red-100 p-3">
                            <p className="text-sm text-red-800">{deleteError}</p>
                          </div>
                        )}

                        <div className="flex gap-3">
                          <button
                            onClick={handleDeleteAccount}
                            disabled={deleteLoading || (!isOAuthUser && !deletePassword)}
                            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                          >
                            {deleteLoading ? "Deleting..." : "Yes, Delete My Account"}
                          </button>
                          <button
                            onClick={() => {
                              setShowDeleteConfirm(false);
                              setDeletePassword("");
                              setDeleteError("");
                            }}
                            disabled={deleteLoading}
                            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

