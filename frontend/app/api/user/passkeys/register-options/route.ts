import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export async function POST(req: NextRequest) {
  try {
    const headers = new Headers(req.headers);
    headers.delete("host");

    const response = await fetch(`${BACKEND_URL}/api/user/passkeys/register-options`, {
      method: "POST",
      headers,
      credentials: "include",
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Register options proxy error:", error);
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }
}

