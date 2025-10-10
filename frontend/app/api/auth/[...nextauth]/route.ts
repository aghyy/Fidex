import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

async function handler(req: NextRequest) {
  const { pathname, search } = new URL(req.url);
  const backendPath = pathname.replace("/api/auth", "/api/auth");
  const backendUrl = `${BACKEND_URL}${backendPath}${search}`;

  try {
    const headers = new Headers(req.headers);
    headers.delete("host");

    // Forward incoming cookies to backend (required for session reads)
    const incomingCookies = req.headers.get("cookie");
    if (incomingCookies) headers.set("cookie", incomingCookies);

    const isBodyAllowed = req.method !== "GET" && req.method !== "HEAD";
    const body: ReadableStream<Uint8Array> | null | undefined = isBodyAllowed ? req.body : undefined;

    const response = await fetch(backendUrl, {
      method: req.method,
      headers,
      body,
      // @ts-expect-error - duplex is required for streaming but not in types
      duplex: "half",
      cache: "no-store",
      redirect: "manual",
    });

    // Handle redirects manually and pass through all headers (including Set-Cookie)
    if (response.status >= 300 && response.status < 400) {
      return new Response(null, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }

    // Preserve raw body to avoid Safari "cannot decode raw data"
    const data = await response.arrayBuffer();

    // Pass through all headers unchanged to keep Set-Cookie intact
    return new Response(data, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    console.error("Auth proxy error:", error);
    return NextResponse.json(
      { error: "Authentication service unavailable" },
      { status: 503 }
    );
  }
}

export const GET = handler;
export const POST = handler;

