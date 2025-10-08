import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    
    const headers = new Headers(req.headers);
    headers.delete("host");
    headers.set("content-type", "application/json");

    const response = await fetch(`${BACKEND_URL}/api/user/delete-account`, {
      method: "DELETE",
      headers,
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Delete account proxy error:", error);
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }
}

