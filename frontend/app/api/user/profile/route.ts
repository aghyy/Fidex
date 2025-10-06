import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "http://localhost:3001";

async function handler(req: NextRequest) {
  try {
    const headers = new Headers(req.headers);
    headers.delete("host");

    const options: RequestInit = {
      method: req.method,
      headers,
      credentials: "include",
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      options.body = await req.text();
    }

    const response = await fetch(`${BACKEND_URL}/api/user/profile`, options);

    const responseHeaders = new Headers(response.headers);
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
    console.error("Profile proxy error:", error);
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }
}

export const GET = handler;
export const PATCH = handler;

