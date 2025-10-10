import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const authenticators = await prisma.authenticator.findMany({
      where: { userId: session.user.id },
      select: {
        credentialID: true,
        credentialDeviceType: true,
        credentialBackedUp: true,
        counter: true,
        name: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ passkeys: authenticators });
  } catch (error) {
    console.error("Error fetching passkeys:", error);
    return NextResponse.json(
      { error: "Failed to fetch passkeys" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { credentialID } = body;

    if (!credentialID) {
      return NextResponse.json(
        { error: "credentialID is required" },
        { status: 400 }
      );
    }

    const authenticator = await prisma.authenticator.findFirst({
      where: { credentialID, userId: session.user.id },
    });

    if (!authenticator) {
      return NextResponse.json(
        { error: "Passkey not found" },
        { status: 404 }
      );
    }

    await prisma.authenticator.delete({
      where: { userId_credentialID: { userId: session.user.id, credentialID } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting passkey:", error);
    return NextResponse.json(
      { error: "Failed to delete passkey" },
      { status: 500 }
    );
  }
}

