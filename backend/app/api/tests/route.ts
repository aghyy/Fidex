import { NextResponse } from "next/server";

export async function GET() {
  return new NextResponse(
    JSON.stringify({ message: "Test backend" }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}