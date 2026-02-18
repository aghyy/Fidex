import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { RouteContext } from "@/types/api";

export const runtime = "nodejs";

const setDocumentsSchema = z.object({
  documentIds: z.array(z.string().trim().min(1)),
});

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = prisma as unknown as {
      transaction: {
        findFirst: (args: {
          where: {
            id: string;
            userId: string;
          };
          select: {
            id: true;
            documents: {
              select: {
                document: {
                  select: {
                    id: true;
                    title: true;
                    originalFileName: true;
                    mimeType: true;
                    url: true;
                  };
                };
              };
            };
          };
        }) => Promise<{
          id: string;
          documents: Array<{
            document: {
              id: string;
              title: string | null;
              originalFileName: string | null;
              mimeType: string | null;
              url: string | null;
            };
          }>;
        } | null>;
      };
    };

    const found = await db.transaction.findFirst({
      where: { id, userId: session.user.id },
      select: {
        id: true,
        documents: {
          select: {
            document: {
              select: {
                id: true,
                title: true,
                originalFileName: true,
                mimeType: true,
                url: true,
              },
            },
          },
        },
      },
    });

    if (!found) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json({
      documents: found.documents.map((d) => d.document),
      documentIds: found.documents.map((d) => d.document.id),
    });
  } catch (error) {
    console.error("Get transaction documents error:", error);
    return NextResponse.json({ error: "Failed to fetch linked documents" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = setDocumentsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const documentIds = Array.from(new Set(parsed.data.documentIds));
    const db = prisma as unknown as {
      $transaction: <T>(fn: (tx: {
        transaction: {
          findFirst: (args: { where: { id: string; userId: string }; select: { id: true } }) => Promise<{ id: string } | null>;
        };
        document: {
          findMany: (args: {
            where: {
              userId: string;
              id: { in: string[] };
            };
            select: { id: true };
          }) => Promise<Array<{ id: string }>>;
        };
        documentTransaction: {
          deleteMany: (args: {
            where: { transactionId: string };
          }) => Promise<unknown>;
          createMany: (args: {
            data: Array<{ transactionId: string; documentId: string }>;
            skipDuplicates: boolean;
          }) => Promise<unknown>;
        };
      }) => Promise<T>) => Promise<T>;
    };

    await db.$transaction(async (tx) => {
      const transaction = await tx.transaction.findFirst({
        where: { id, userId: session.user.id },
        select: { id: true },
      });
      if (!transaction) {
        throw new Error("Transaction not found");
      }

      if (documentIds.length > 0) {
        const docs = await tx.document.findMany({
          where: { userId: session.user.id, id: { in: documentIds } },
          select: { id: true },
        });
        if (docs.length !== documentIds.length) {
          throw new Error("Some documents are invalid");
        }
      }

      await tx.documentTransaction.deleteMany({
        where: { transactionId: id },
      });

      if (documentIds.length > 0) {
        await tx.documentTransaction.createMany({
          data: documentIds.map((documentId) => ({
            transactionId: id,
            documentId,
          })),
          skipDuplicates: true,
        });
      }
    });

    return NextResponse.json({ success: true, documentIds });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update linked documents";
    const status = message.includes("not found") || message.includes("invalid") ? 400 : 500;
    console.error("Set transaction documents error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
