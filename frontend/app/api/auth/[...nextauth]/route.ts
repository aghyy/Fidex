import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "http://localhost:3001";

async function handler(req: NextRequest) {
  const { pathname, search } = new URL(req.url);
  const backendPath = pathname.replace("/api/auth", "/api/auth");
  const backendUrl = `${BACKEND_URL}${backendPath}${search}`;

  try {
    const headers = new Headers(req.headers);
    headers.delete("host");

    const response = await fetch(backendUrl, {
      method: req.method,
      headers,
      body: req.body,
      // @ts-expect-error - duplex is required for streaming but not in types
      duplex: "half",
    });

    const responseHeaders = new Headers(response.headers);
    
    // Forward cookies
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      responseHeaders.set("set-cookie", setCookie);
    }

    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
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

