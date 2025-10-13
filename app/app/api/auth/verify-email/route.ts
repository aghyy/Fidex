import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const record = await prisma.emailVerificationToken.findUnique({ where: { token: hashedToken } });

    if (!record || record.expires < new Date()) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    await prisma.user.update({ where: { email: record.email }, data: { emailVerified: new Date() } });
    await prisma.emailVerificationToken.delete({ where: { token: hashedToken } });

    return NextResponse.redirect(new URL("/auth/signin?verified=1", request.url));
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}


