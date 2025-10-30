"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { IconKey } from "@tabler/icons-react";

interface Passkey {
  credentialID: string;
  name: string | null;
  createdAt: string;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
}

interface PasskeysDialogProps {
  isOAuthUser: boolean;
}

export default function PasskeysDialog({ isOAuthUser }: PasskeysDialogProps) {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [passkeyName, setPasskeyName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);

  useEffect(() => {
    fetchPasskeys();
  }, []);

  const fetchPasskeys = async () => {
    try {
      const response = await fetch("/api/user/passkeys", {
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        setPasskeys(data.passkeys || []);
      }
    } catch (err) {
      console.error("Error fetching passkeys:", err);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPasskeyName = () => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform || "Unknown";
    
    let browser = "Browser";
    if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) browser = "Chrome";
    else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Edg")) browser = "Edge";
    
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
      if (!window.PublicKeyCredential) {
        setError("Passkeys are not supported in this browser");
        setRegistering(false);
        return;
      }

      const optionsResponse = await fetch("/api/user/passkeys/register-options", {
        method: "POST",
        credentials: "include",
      });

      if (!optionsResponse.ok) {
        const errorData = await optionsResponse.json();
        throw new Error(errorData.error || "Failed to get registration options");
      }

      const options = await optionsResponse.json();
      const expectedChallenge = options.challenge;
      const credential = await startRegistration(options);

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
    } catch (err) {
      const error = err as Error & { name?: string };
      console.error("Error registering passkey:", error);
      if (error.name === "NotAllowedError") {
        setError("Registration cancelled or timed out");
      } else {
        setError(error.message || "Failed to register passkey");
      }
      setShowNameInput(true);
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
    } catch (err) {
      const error = err as Error;
      console.error("Error deleting passkey:", error);
      setError(error.message || "Failed to delete passkey");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <h2 className="text-lg font-semibold">Manage Passkeys</h2>

      {isOAuthUser && (
        <div className="rounded-md bg-yellow-50 dark:bg-yellow-950 p-3 border border-yellow-200 dark:border-yellow-900">
          <div className="flex gap-2">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-xs font-semibold text-yellow-900 dark:text-yellow-200 mb-1">OAuth Account</h3>
              <p className="text-xs text-yellow-800 dark:text-yellow-300">
                You signed in with Google. Passkeys are only available for accounts with email/password authentication.
              </p>
            </div>
          </div>
        </div>
      )}

      {!isOAuthUser && (
        <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-3 border border-blue-200 dark:border-blue-900">
          <div className="flex gap-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">What are Passkeys?</h3>
              <p className="text-xs text-blue-800 dark:text-blue-300">
                Passkeys are a secure, passwordless way to sign in using biometrics or PIN.
              </p>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className="rounded-md bg-green-50 dark:bg-green-950 p-3">
          <p className="text-xs text-green-800 dark:text-green-200">{message}</p>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950 p-3">
          <p className="text-xs text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {!isOAuthUser && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Add New Passkey</h3>
          
          {!showNameInput ? (
            <button
              onClick={startPasskeyRegistration}
              disabled={registering}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <IconKey className="h-4 w-4" />
              {registering ? "Registering..." : "Register Passkey"}
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label htmlFor="passkeyName" className="text-xs font-medium text-muted-foreground mb-1 block">
                  Passkey Name
                </label>
                <input
                  id="passkeyName"
                  type="text"
                  value={passkeyName}
                  onChange={(e) => setPasskeyName(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="e.g., My iPhone, Work Laptop"
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={registerPasskey}
                  disabled={registering || !passkeyName.trim()}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {registering ? "Registering..." : "Continue"}
                </button>
                <button
                  onClick={() => {
                    setShowNameInput(false);
                    setPasskeyName("");
                  }}
                  disabled={registering}
                  className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!isOAuthUser && (
        <>
          <div className="border-t" />
          
          <div>
            <h3 className="text-sm font-semibold mb-3">Your Passkeys</h3>
            
            {loading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
            ) : passkeys.length === 0 ? (
              <div className="text-center py-8 bg-muted/50 rounded-lg">
                <IconKey className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No passkeys yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {passkeys.map((passkey) => (
                  <div
                    key={passkey.credentialID}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <IconKey className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {passkey.name || passkey.credentialDeviceType || "Passkey"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Added {new Date(passkey.createdAt || Date.now()).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => deletePasskey(passkey.credentialID)}
                      className="px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

