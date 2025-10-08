import { NextRequest, NextResponse } from "next/server";

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
    });

    // Preserve raw body to avoid Safari "cannot decode raw data"
    const data = await response.arrayBuffer();

    // Get ALL set-cookie headers (there can be multiple)
    const setCookies = response.headers.getSetCookie?.() || [];

    // Create response headers, excluding set-cookie (we'll add them separately)
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "set-cookie") {
        responseHeaders.set(key, value);
      }
    });

    const nextResponse = new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

    // Add all set-cookie headers to the response
    setCookies.forEach((cookie) => {
      nextResponse.headers.append("set-cookie", cookie);
    });

    return nextResponse;
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

