import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { sendPasswordResetEmail } from "../../../../lib/email";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent enumeration
    if (!user || !user.password) {
      return NextResponse.json({
        message: "If an account exists with that email, you will receive a password reset link.",
      });
    }

    await prisma.passwordResetToken.deleteMany({ where: { email } });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    await prisma.passwordResetToken.create({
      data: { email, token: hashedToken, expires: new Date(Date.now() + 3600000) },
    });

    await sendPasswordResetEmail(email, resetToken);

    return NextResponse.json({
      message: "If an account exists with that email, you will receive a password reset link.",
    });
  } catch (error) {
    console.error("Error in forgot password:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

