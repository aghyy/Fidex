import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const headers = new Headers(req.headers);
    headers.set("Content-Type", "application/json");
    headers.delete("host");

    const response = await fetch(`${BACKEND_URL}/api/auth/passkey-signin`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // Forward the session cookie
    const responseHeaders = new Headers();
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      responseHeaders.set("set-cookie", setCookie);
    }

    return NextResponse.json(data, { 
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Passkey signin proxy error:", error);
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }
}

