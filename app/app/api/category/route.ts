import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { auth } from "../../../auth";

type CategoryRecord = { id: string; name: string; color: string | null; icon: string | null };
type CategoryDelegate = {
  findMany: (args: {
    where: { userId: string };
    orderBy?: { name: "asc" | "desc" };
    select?: { id?: true; name?: true; color?: true; icon?: true };
  }) => Promise<CategoryRecord[]>;
  create: (args: {
    data: { userId: string; name: string; color?: string; icon?: string };
  }) => Promise<CategoryRecord>;
};

const category = (prisma as unknown as { category: CategoryDelegate }).category;

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const categories = await category.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true, icon: true },
    });
    return NextResponse.json({ categories }, { status: 200 });
  } catch (error: unknown) {
    console.error("List categories error:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, color, icon } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const data = {
      userId: session.user.id,
      name: String(name).trim(),
      color: color ? String(color).trim() : undefined,
      icon: icon ? String(icon).trim() : undefined,
    } as const;

    const created = await category.create({ data });

    return NextResponse.json({ category: created }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { code?: string } | undefined;
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Category already exists" }, { status: 409 });
    }
    console.error("Create category error:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}


