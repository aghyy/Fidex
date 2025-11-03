import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { auth } from "../../../../auth";

export const runtime = "nodejs";

type CategoryRecord = { id: string; name: string; color: string | null; icon: string | null; userId: string };
type CategoryDelegate = {
  findFirst: (args: { where: { id?: string; userId?: string } }) => Promise<CategoryRecord | null>;
  update: (args: { where: { id: string }; data: Partial<Pick<CategoryRecord, "name" | "color" | "icon">> }) => Promise<CategoryRecord>;
  delete: (args: { where: { id: string } }) => Promise<CategoryRecord>;
};

const category = (prisma as unknown as { category: CategoryDelegate }).category;

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const item = await category.findFirst({ where: { id: params.id, userId: session.user.id } });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { id, name, color, icon } = item;
    return NextResponse.json({ category: { id, name, color, icon } }, { status: 200 });
  } catch (error) {
    console.error("Get category error:", error);
    return NextResponse.json({ error: "Failed to fetch category" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data: Partial<{ name: string; color: string; icon: string }> = {};
    if (typeof body?.name === "string") data.name = body.name.trim();
    if (typeof body?.color === "string") data.color = body.color.trim();
    if (typeof body?.icon === "string") data.icon = body.icon.trim();

    // Ensure ownership
    const item = await category.findFirst({ where: { id: params.id, userId: session.user.id } });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await category.update({ where: { id: params.id }, data });
    const { id, name, color, icon } = updated;
    return NextResponse.json({ category: { id, name, color, icon } }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { code?: string } | undefined;
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Category already exists" }, { status: 409 });
    }
    console.error("Update category error:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Ensure ownership
    const item = await category.findFirst({ where: { id: params.id, userId: session.user.id } });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await category.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}


