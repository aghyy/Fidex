import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "http://localhost:3001";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const headers = new Headers(req.headers);
    headers.set("Content-Type", "application/json");
    headers.delete("host");

    const response = await fetch(`${BACKEND_URL}/api/user/passkeys/auth-options`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Auth options proxy error:", error);
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }
}

