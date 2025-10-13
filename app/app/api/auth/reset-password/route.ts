import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token: hashedToken } });

    if (!resetToken || resetToken.expires < new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email: resetToken.email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });
    await prisma.passwordResetToken.delete({ where: { token: hashedToken } });

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

