import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { auth } from "../../../auth";

type AccountRecord = { id: string; name: string; color: string | null; icon: string | null };

export async function GET() {

}