import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma";
import { sendVerificationEmail } from "../../../../lib/email";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { email, password, firstName, lastName, username } = await request.json();

    if (!email || !password || !firstName || !lastName || !username) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: "Username must be 3-20 characters and contain only letters, numbers, and underscores" },
        { status: 400 }
      );
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, firstName, lastName, username },
    });

    // Create email verification token (24h)
    let verifyToken: string | null = null;
    try {
      await prisma.emailVerificationToken.deleteMany({ where: { email } });
      verifyToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(verifyToken).digest("hex");
      await prisma.emailVerificationToken.create({
        data: {
          email,
          token: hashedToken,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    } catch (err) {
      console.error("Failed to create email verification token:", err);
    }

    // Send verification email (non-blocking) if we have a token
    if (verifyToken) {
      sendVerificationEmail(email, verifyToken).catch((e) => {
        console.error("Failed to send verification email:", e);
      });
    }

    return NextResponse.json(
      { user: { id: user.id, email: user.email, username: user.username, firstName: user.firstName, lastName: user.lastName }, message: "Verification email sent" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

