import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { prisma } from "../../../../lib/prisma";
import bcrypt from "bcryptjs";

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { password } = body;

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        password: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // For users with password (non-OAuth), verify password before deletion
    if (user.password) {
      if (!password) {
        return NextResponse.json(
          { error: "Password required to delete account" },
          { status: 400 }
        );
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "Incorrect password" },
          { status: 401 }
        );
      }
    }

    // Get user email for cleanup
    const userEmail = user.email;

    // Delete user - cascading deletes will handle related records
    // (sessions, accounts, authenticators due to onDelete: Cascade in schema)
    await prisma.user.delete({
      where: { id: session.user.id },
    });

    // Clean up any password reset tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: userEmail },
    });

    return NextResponse.json({ 
      success: true,
      message: "Account deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}

