import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { prisma } from "../../../../../lib/prisma";
import { verifyRegistrationResponse, VerifyRegistrationResponseOpts } from "@simplewebauthn/server";

export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { credential, expectedChallenge, name } = body;

    if (!credential || !expectedChallenge) {
      return NextResponse.json(
        { error: "Missing credential or challenge" },
        { status: 400 }
      );
    }

    const rpID = process.env.WEBAUTHN_RP_ID || "localhost";
    const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const opts: VerifyRegistrationResponseOpts = {
      response: credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    };

    const verification = await verifyRegistrationResponse(opts);

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: "Verification failed" },
        { status: 400 }
      );
    }

    const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

    await prisma.authenticator.create({
      data: {
        userId: session.user.id,
        credentialID: Buffer.from(credentialID).toString("base64"),
        providerAccountId: session.user.id,
        credentialPublicKey: Buffer.from(credentialPublicKey).toString("base64"),
        counter,
        credentialDeviceType: verification.registrationInfo.credentialDeviceType,
        credentialBackedUp: verification.registrationInfo.credentialBackedUp,
        transports: credential.response.transports ? JSON.stringify(credential.response.transports) : null,
        name: name || null,
      },
    });

    return NextResponse.json({ verified: true });
  } catch (error) {
    console.error("Error verifying registration:", error);
    return NextResponse.json(
      { error: "Failed to verify registration" },
      { status: 500 }
    );
  }
}

