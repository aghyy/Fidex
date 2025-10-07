"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { startRegistration } from "@simplewebauthn/browser";

export default function PasskeysPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isOAuthUser, setIsOAuthUser] = useState(false);
  const [passkeyName, setPasskeyName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/profile/passkeys");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      checkIfOAuthUser();
      fetchPasskeys();
    }
  }, [session]);

  const checkIfOAuthUser = async () => {
    try {
      const response = await fetch("/api/user/profile", {
        credentials: "include",
      });
      const data = await response.json();
      setIsOAuthUser(data.user?.isOAuthUser || false);
    } catch (error) {
      console.error("Error checking user type:", error);
    }
  };

  const fetchPasskeys = async () => {
    try {
      const response = await fetch("/api/user/passkeys", {
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        setPasskeys(data.passkeys || []);
      }
    } catch (error) {
      console.error("Error fetching passkeys:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPasskeyName = () => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform || "Unknown";
    
    // Detect browser
    let browser = "Browser";
    if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) browser = "Chrome";
    else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Edg")) browser = "Edge";
    
    // Detect device type
    let device = "Desktop";
    if (/iPhone|iPad|iPod/.test(userAgent)) device = "iPhone";
    else if (/Android/.test(userAgent)) device = "Android";
    else if (/Mac/.test(platform)) device = "Mac";
    else if (/Win/.test(platform)) device = "Windows";
    
    return `${device} - ${browser}`;
  };

  const startPasskeyRegistration = () => {
    const defaultName = getDefaultPasskeyName();
    setPasskeyName(defaultName);
    setShowNameInput(true);
    setError("");
    setMessage("");
  };

  const registerPasskey = async () => {
    if (!passkeyName.trim()) {
      setError("Please enter a name for your passkey");
      return;
    }

    setRegistering(true);
    setShowNameInput(false);
    setError("");
    setMessage("");

    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        setError("Passkeys are not supported in this browser");
        setRegistering(false);
        return;
      }

      // Request registration options from backend
      const optionsResponse = await fetch("/api/user/passkeys/register-options", {
        method: "POST",
        credentials: "include",
      });

      if (!optionsResponse.ok) {
        const errorData = await optionsResponse.json();
        throw new Error(errorData.error || "Failed to get registration options");
      }

      const options = await optionsResponse.json();
      
      // Store the expected challenge for verification
      const expectedChallenge = options.challenge;

      // SimpleWebAuthn browser library handles the conversion automatically
      // Just pass the options as-is from the server
      const credential = await startRegistration(options);

      // Send credential to backend for verification
      const verifyResponse = await fetch("/api/user/passkeys/register-verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          credential,
          expectedChallenge,
          name: passkeyName.trim(),
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || "Failed to verify passkey");
      }

      setMessage("Passkey registered successfully!");
      setPasskeyName("");
      fetchPasskeys();
    } catch (error: any) {
      console.error("Error registering passkey:", error);
      if (error.name === "NotAllowedError") {
        setError("Registration cancelled or timed out");
      } else {
        setError(error.message || "Failed to register passkey");
      }
      setShowNameInput(true); // Show input again if error
    } finally {
      setRegistering(false);
    }
  };

  const deletePasskey = async (credentialId: string) => {
    if (!confirm("Are you sure you want to delete this passkey?")) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/user/passkeys`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ credentialID: credentialId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete passkey");
      }

      setMessage("Passkey deleted successfully");
      fetchPasskeys();
    } catch (error: any) {
      console.error("Error deleting passkey:", error);
      setError(error.message || "Failed to delete passkey");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100">
        <div className="animate-pulse text-xl text-gray-700">Loading...</div>
      </div>
    );
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
            <h1 className="text-3xl font-bold text-white">Manage Passkeys</h1>
            <p className="text-indigo-100 mt-2">
              Passkeys provide secure, passwordless authentication
            </p>
          </div>

          <div className="p-8">
            {/* OAuth User Warning */}
            {isOAuthUser && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-yellow-900 mb-1">OAuth Account</h3>
                    <p className="text-sm text-yellow-800">
                      You signed in with Google. Passkeys are only available for accounts with email/password authentication.
                      To use passkeys, you would need to create a separate account with email and password.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Info Section */}
            {!isOAuthUser && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">What are Passkeys?</h3>
                  <p className="text-sm text-blue-800">
                    Passkeys are a secure, passwordless way to sign in using your device's biometrics (fingerprint, face recognition) or PIN. 
                    They're more secure than passwords and can't be phished.
                  </p>
                </div>
              </div>
            </div>
            )}

            {message && (
              <div className="rounded-md bg-green-50 p-4 mb-6">
                <p className="text-sm text-green-800">{message}</p>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 p-4 mb-6">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Register New Passkey */}
            {!isOAuthUser && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Passkey</h2>
                
                {!showNameInput ? (
                  <button
                    onClick={startPasskeyRegistration}
                    disabled={registering}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    {registering ? "Registering..." : "Register Passkey"}
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="passkeyName" className="block text-sm font-medium text-gray-700 mb-2">
                        Passkey Name
                      </label>
                      <input
                        id="passkeyName"
                        type="text"
                        value={passkeyName}
                        onChange={(e) => setPasskeyName(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        autoFocus
                        placeholder="e.g., My iPhone, Work Laptop"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Give this passkey a name to help you identify it later
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={registerPasskey}
                        disabled={registering || !passkeyName.trim()}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {registering ? "Registering..." : "Continue"}
                      </button>
                      <button
                        onClick={() => {
                          setShowNameInput(false);
                          setPasskeyName("");
                        }}
                        disabled={registering}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isOAuthUser && <hr className="border-gray-200 mb-8" />}

            {/* Existing Passkeys */}
            {!isOAuthUser && (
              <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Your Passkeys</h2>
              
              {passkeys.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No passkeys</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by registering your first passkey
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {passkeys.map((passkey) => (
                    <div
                      key={passkey.credentialID}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {passkey.name || passkey.credentialDeviceType || "Passkey"}
                          </p>
                          <p className="text-sm text-gray-500">
                            Added {new Date(passkey.createdAt || Date.now()).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => deletePasskey(passkey.credentialID)}
                        className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

