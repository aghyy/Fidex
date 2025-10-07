import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import {
  generateAuthenticationOptions,
  GenerateAuthenticationOptionsOpts,
} from "@simplewebauthn/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { emailOrUsername } = body;

    if (!emailOrUsername) {
      return NextResponse.json(
        { error: "Email or username is required" },
        { status: 400 }
      );
    }

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          { username: emailOrUsername },
        ],
      },
      include: {
        authenticators: true,
      },
    });

    if (!user || user.authenticators.length === 0) {
      // Don't reveal if user exists or has passkeys (security)
      return NextResponse.json(
        { error: "No passkeys found for this email/username" },
        { status: 404 }
      );
    }

    const rpID = process.env.WEBAUTHN_RP_ID || "localhost";

    const opts: GenerateAuthenticationOptionsOpts = {
      rpID,
      allowCredentials: user.authenticators.map((authenticator) => ({
        id: Buffer.from(authenticator.credentialID, "base64"),
        type: "public-key",
        transports: authenticator.transports
          ? (JSON.parse(authenticator.transports) as AuthenticatorTransport[])
          : undefined,
      })),
      userVerification: "preferred",
    };

    const options = await generateAuthenticationOptions(opts);

    // Return options and user ID for the next step
    return NextResponse.json({
      options,
      userId: user.id,
    });
  } catch (error) {
    console.error("Error generating authentication options:", error);
    return NextResponse.json(
      { error: "Failed to generate authentication options" },
      { status: 500 }
    );
  }
}

