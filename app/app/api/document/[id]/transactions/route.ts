import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { RouteContext } from "@/types/api";

export const runtime = "nodejs";

const setTransactionsSchema = z.object({
  transactionIds: z.array(z.string().trim().min(1)),
});

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = setTransactionsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const transactionIds = Array.from(new Set(parsed.data.transactionIds));
    const db = prisma as unknown as {
      $transaction: <T>(fn: (tx: {
        document: {
          findFirst: (args: { where: { id: string; userId: string }; select: { id: true } }) => Promise<{ id: string } | null>;
        };
        transaction: {
          findMany: (args: {
            where: {
              userId: string;
              id: { in: string[] };
            };
            select: { id: true };
          }) => Promise<Array<{ id: string }>>;
        };
        documentTransaction: {
          deleteMany: (args: { where: { documentId: string } }) => Promise<unknown>;
          createMany: (args: {
            data: Array<{ documentId: string; transactionId: string }>;
            skipDuplicates: boolean;
          }) => Promise<unknown>;
        };
      }) => Promise<T>) => Promise<T>;
    };

    await db.$transaction(async (tx) => {
      const doc = await tx.document.findFirst({
        where: { id, userId: session.user.id },
        select: { id: true },
      });
      if (!doc) {
        throw new Error("Document not found");
      }

      if (transactionIds.length > 0) {
        const foundTransactions = await tx.transaction.findMany({
          where: {
            userId: session.user.id,
            id: { in: transactionIds },
          },
          select: { id: true },
        });
        if (foundTransactions.length !== transactionIds.length) {
          throw new Error("Some transactions are invalid");
        }
      }

      await tx.documentTransaction.deleteMany({
        where: { documentId: id },
      });

      if (transactionIds.length > 0) {
        await tx.documentTransaction.createMany({
          data: transactionIds.map((transactionId) => ({
            documentId: id,
            transactionId,
          })),
          skipDuplicates: true,
        });
      }
    });

    return NextResponse.json({ success: true, transactionIds });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update linked transactions";
    const status = message.includes("not found") || message.includes("invalid") ? 400 : 500;
    console.error("Set document transactions error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
