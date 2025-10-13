import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { verifyAuthenticationResponse, VerifyAuthenticationResponseOpts } from "@simplewebauthn/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { credential, expectedChallenge, userId } = body;

    if (!credential || !expectedChallenge || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const credentialIdBuffer = Buffer.from(credential.id, "base64url");
    const credentialIdBase64 = credentialIdBuffer.toString("base64");

    const authenticator = await prisma.authenticator.findFirst({
      where: { userId, credentialID: credentialIdBase64 },
    });

    if (!authenticator) {
      return NextResponse.json(
        { error: "Passkey not found" },
        { status: 404 }
      );
    }

    const rpID = process.env.WEBAUTHN_RP_ID || "localhost";
    const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const opts: VerifyAuthenticationResponseOpts = {
      response: credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(authenticator.credentialID, "base64"),
        credentialPublicKey: Buffer.from(authenticator.credentialPublicKey, "base64"),
        counter: authenticator.counter,
        transports: authenticator.transports
          ? (JSON.parse(authenticator.transports) as AuthenticatorTransport[])
          : undefined,
      },
    };

    const verification = await verifyAuthenticationResponse(opts);

    if (!verification.verified) {
      return NextResponse.json(
        { error: "Verification failed" },
        { status: 400 }
      );
    }

    await prisma.authenticator.update({
      where: { userId_credentialID: { userId, credentialID: authenticator.credentialID } },
      data: { counter: verification.authenticationInfo.newCounter },
    });

    return NextResponse.json({ verified: true, userId });
  } catch (error) {
    console.error("Error verifying authentication:", error);
    return NextResponse.json(
      { error: "Failed to verify authentication" },
      { status: 500 }
    );
  }
}

