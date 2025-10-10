const API_URL = ""; // same-origin

export async function registerUser(data: {
  email: string;
  password: string;
  name?: string;
}) {
  const response = await fetch(`/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Registration failed");
  }

  return response.json();
}

export async function loginUser(data: { email: string; password: string }) {
  const response = await fetch(`/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Invalid credentials");
  }

  return response.json();
}

export async function getSession() {
  try {
    const response = await fetch(`/api/auth/session`, {
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    return null;
  }
}

export async function signOutUser() {
  await fetch(`/api/auth/signout`, {
    method: "POST",
    credentials: "include",
  });
}

