import { NextResponse } from "next/server";
import { z } from "zod";
import { UTApi } from "uploadthing/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { RouteContext } from "@/types/api";

export const runtime = "nodejs";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  notes: z.string().max(5000).nullable().optional(),
  kind: z.enum(["CONTRACT", "BILL", "RECEIPT", "OTHER"]).optional(),
});

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = prisma as unknown as {
      document: {
        findFirst: (args: {
          where: { id: string; userId: string };
          include: {
            transactions: {
              select: {
                transactionId: true;
              };
            };
          };
        }) => Promise<(Record<string, unknown> & { transactions: Array<{ transactionId: string }> }) | null>;
      };
    };

    const document = await db.document.findFirst({
      where: { id, userId: session.user.id },
      include: {
        transactions: {
          select: { transactionId: true },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({
      document: {
        ...document,
        transactionIds: document.transactions.map((t) => t.transactionId),
      },
    });
  } catch (error) {
    console.error("Get document error:", error);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const db = prisma as unknown as {
      document: {
        findFirst: (args: { where: { id: string; userId: string } }) => Promise<{ id: string } | null>;
        update: (args: {
          where: { id: string };
          data: {
            title?: string;
            name?: string;
            notes?: string | null;
            kind?: "CONTRACT" | "BILL" | "RECEIPT" | "OTHER";
          };
        }) => Promise<Record<string, unknown>>;
      };
    };

    const existing = await db.document.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const data: {
      title?: string;
      name?: string;
      notes?: string | null;
      kind?: "CONTRACT" | "BILL" | "RECEIPT" | "OTHER";
    } = {};
    if (parsed.data.title !== undefined) {
      data.title = parsed.data.title;
      data.name = parsed.data.title;
    }
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
    if (parsed.data.kind !== undefined) data.kind = parsed.data.kind;

    const updated = await db.document.update({
      where: { id },
      data,
    });

    return NextResponse.json({ document: updated });
  } catch (error) {
    console.error("Update document error:", error);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = prisma as unknown as {
      document: {
        findFirst: (args: { where: { id: string; userId: string } }) => Promise<{ id: string; storageKey: string | null } | null>;
        delete: (args: { where: { id: string } }) => Promise<unknown>;
      };
    };

    const existing = await db.document.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (existing.storageKey && process.env.UPLOADTHING_TOKEN) {
      const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });
      try {
        await utapi.deleteFiles(existing.storageKey);
      } catch (storageError) {
        console.error("Storage delete warning:", storageError);
      }
    }

    await db.document.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
