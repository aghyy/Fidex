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

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: "If an account exists with that email, you will receive a password reset link.",
      });
    }

    // Check if user has password (not OAuth only)
    if (!user.password) {
      return NextResponse.json({
        message: "If an account exists with that email, you will receive a password reset link.",
      });
    }

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { email },
    });

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Create reset token in database (expires in 1 hour)
    await prisma.passwordResetToken.create({
      data: {
        email,
        token: hashedToken,
        expires: new Date(Date.now() + 3600000), // 1 hour
      },
    });

    // Send email
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

