import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const runtime = "nodejs";

const uploadDraftSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  notes: z.string().max(5000).optional(),
  originalFileName: z.string().trim().min(1),
  storageKey: z.string().trim().min(1),
  url: z.string().url(),
  mimeType: z.string().trim().min(1),
  sizeBytes: z.number().int().positive(),
  kind: z.enum(["CONTRACT", "BILL", "RECEIPT", "OTHER"]).optional(),
});

const createDocumentsSchema = z.object({
  documents: z.array(uploadDraftSchema).min(1),
  transactionIds: z.array(z.string().trim().min(1)).optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const kind = searchParams.get("kind")?.trim();
  const transactionId = searchParams.get("transactionId")?.trim();

  try {
    const db = prisma as unknown as {
      document: {
        findMany: (args: {
          where: Record<string, unknown>;
          orderBy: { createdAt: "asc" | "desc" };
          include: {
            transactions: {
              select: {
                transactionId: true;
              };
            };
          };
        }) => Promise<Array<Record<string, unknown> & { transactions: Array<{ transactionId: string }> }>>;
      };
    };

    const where: Record<string, unknown> = {
      userId: session.user.id,
      storageKey: { not: null },
      url: { not: null },
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { originalFileName: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    if (kind && ["CONTRACT", "BILL", "RECEIPT", "OTHER"].includes(kind)) {
      where.kind = kind;
    }

    if (transactionId) {
      where.transactions = { some: { transactionId } };
    }

    const documents = await db.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        transactions: {
          select: { transactionId: true },
        },
      },
    });

    return NextResponse.json({
      documents: documents.map((doc) => ({
        ...doc,
        transactionIds: doc.transactions.map((t) => t.transactionId),
        transactionCount: doc.transactions.length,
      })),
    });
  } catch (error) {
    console.error("List documents error:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = createDocumentsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { documents, transactionIds = [] } = parsed.data;
    const db = prisma as unknown as {
      $transaction: <T>(fn: (tx: {
        transaction: {
          findMany: (args: {
            where: {
              userId: string;
              id: { in: string[] };
            };
            select: { id: true };
          }) => Promise<Array<{ id: string }>>;
        };
        document: {
          create: (args: {
            data: {
              userId: string;
              categoryId: null;
              name: string;
              content: null;
              title: string;
              notes: string | null;
              originalFileName: string;
              storageKey: string;
              url: string;
              mimeType: string;
              sizeBytes: number;
              kind: "CONTRACT" | "BILL" | "RECEIPT" | "OTHER";
            };
          }) => Promise<Record<string, unknown> & { id: string }>;
        };
        documentTransaction: {
          createMany: (args: {
            data: Array<{
              documentId: string;
              transactionId: string;
            }>;
            skipDuplicates: boolean;
          }) => Promise<unknown>;
        };
      }) => Promise<T>) => Promise<T>;
    };

    const created = await db.$transaction(async (tx) => {
      let validTransactionIds: string[] = [];
      if (transactionIds.length > 0) {
        const existing = await tx.transaction.findMany({
          where: { userId: session.user.id, id: { in: transactionIds } },
          select: { id: true },
        });
        validTransactionIds = existing.map((t) => t.id);
      }

      const createdDocs: Array<Record<string, unknown>> = [];
      for (const doc of documents) {
        const title = (doc.title?.trim() || doc.originalFileName).slice(0, 200);
        const createdDoc = await tx.document.create({
          data: {
            userId: session.user.id,
            categoryId: null,
            name: title,
            content: null,
            title,
            notes: doc.notes?.trim() || null,
            originalFileName: doc.originalFileName,
            storageKey: doc.storageKey,
            url: doc.url,
            mimeType: doc.mimeType,
            sizeBytes: doc.sizeBytes,
            kind: doc.kind ?? "OTHER",
          },
        });
        createdDocs.push(createdDoc);

        if (validTransactionIds.length > 0) {
          await tx.documentTransaction.createMany({
            data: validTransactionIds.map((transactionId) => ({
              documentId: createdDoc.id,
              transactionId,
            })),
            skipDuplicates: true,
          });
        }
      }
      return createdDocs;
    });

    return NextResponse.json({ documents: created }, { status: 201 });
  } catch (error) {
    console.error("Create documents error:", error);
    return NextResponse.json({ error: "Failed to create documents" }, { status: 500 });
  }
}
