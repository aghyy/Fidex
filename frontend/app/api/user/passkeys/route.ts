import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "http://localhost:3001";

export async function GET(req: NextRequest) {
  try {
    const headers = new Headers(req.headers);
    headers.delete("host");

    const response = await fetch(`${BACKEND_URL}/api/user/passkeys`, {
      method: "GET",
      headers,
      credentials: "include",
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Passkeys proxy error:", error);
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    
    const headers = new Headers(req.headers);
    headers.delete("host");
    headers.set("content-type", "application/json");

    const response = await fetch(`${BACKEND_URL}/api/user/passkeys`, {
      method: "DELETE",
      headers,
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Delete passkey proxy error:", error);
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }
}

