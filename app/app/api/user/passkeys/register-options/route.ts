import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { prisma } from "../../../../../lib/prisma";
import { generateRegistrationOptions, GenerateRegistrationOptionsOpts } from "@simplewebauthn/server";

export async function POST() {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { authenticators: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const rpName = process.env.WEBAUTHN_RP_NAME || "Fidex";
    const rpID = process.env.WEBAUTHN_RP_ID || "localhost";

    const displayName = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.firstName || user.username || user.email;

    const opts: GenerateRegistrationOptionsOpts = {
      rpName,
      rpID,
      userID: user.id,
      userName: user.email,
      userDisplayName: displayName,
      excludeCredentials: user.authenticators.map((authenticator) => ({
        id: Buffer.from(authenticator.credentialID, "base64"),
        type: "public-key",
        transports: authenticator.transports
          ? (JSON.parse(authenticator.transports) as AuthenticatorTransport[])
          : undefined,
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    };

    const options = await generateRegistrationOptions(opts);
    return NextResponse.json(options);
  } catch (error) {
    console.error("Error generating registration options:", error);
    return NextResponse.json(
      { error: "Failed to generate registration options" },
      { status: 500 }
    );
  }
}

