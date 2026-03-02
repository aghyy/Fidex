import { NextResponse } from "next/server";
import { auth } from "../../../auth";
import { prisma } from "../../../lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";

type TxRecord = {
  id: string;
  amount: bigint;
  type: string;
  category: string;
  notes: string;
  occurredAt: Date;
  originAccountId: string;
  targetAccountId: string;
  pending: boolean;
};

function formatAmount(value: bigint | number): string {
  const n = typeof value === "bigint" ? Number(value) : value;
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const now = new Date();
  const from = fromParam ? new Date(fromParam) : new Date(now.getFullYear(), 0, 1);
  const to = toParam ? new Date(toParam) : new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  try {
    const [user, accounts, categories, transactions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { firstName: true, lastName: true, email: true },
      }),
      prisma.account.findMany({
        where: { userId: session.user.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true, accountNumber: true, balance: true, currency: true },
      }),
      prisma.category.findMany({
        where: { userId: session.user.id },
        select: { id: true, name: true },
      }),
      prisma.transaction.findMany({
        where: {
          userId: session.user.id,
          occurredAt: { gte: from, lte: to },
          pending: false,
        },
        orderBy: { occurredAt: "asc" },
        select: {
          id: true,
          amount: true,
          type: true,
          category: true,
          notes: true,
          occurredAt: true,
          originAccountId: true,
          targetAccountId: true,
          pending: true,
        },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const categoryMap = new Map<string, string>();
    for (const c of categories) categoryMap.set(c.id, c.name);

    const accountMap = new Map<string, { name: string; accountNumber: string }>();
    for (const a of accounts) accountMap.set(a.id, { name: a.name, accountNumber: a.accountNumber });

    const pdfDoc = await PDFDocument.create();

    let page = pdfDoc.addPage([595, 842]);
    const { height } = page.getSize();
    const margin = 50;
    let y = height - margin;

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 10;
    const lineHeight = 14;
    const smallFont = 9;

    function drawText(
      text: string,
      opts: { x?: number; y?: number; size?: number; bold?: boolean } = {}
    ) {
      const x = opts.x ?? margin;
      const size = opts.size ?? fontSize;
      const f = opts.bold ? fontBold : font;
      page.drawText(text, {
        x,
        y: opts.y ?? y,
        size,
        font: f,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;
    }

    function drawSection(title: string, fn: () => void) {
      y -= 8;
      drawText(title, { bold: true, size: 12 });
      y -= 4;
      fn();
    }

    const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "—";
    const generatedAt = formatDate(new Date());
    const periodStr = `${formatDate(from)} – ${formatDate(to)}`;

    drawText("Finanzübersicht", { bold: true, size: 18 });
    y -= 8;
    drawText(`Erstellt am: ${generatedAt}`);
    drawText(`Zeitraum: ${periodStr}`);
    y -= 8;

    drawSection("Angaben zur Person", () => {
      drawText(`Name: ${userName}`);
      drawText(`E-Mail: ${user.email || "—"}`);
    });

    drawSection("Kontostände (aktueller Stand zum Erstellungsdatum)", () => {
      if (accounts.length === 0) {
        drawText("Keine Konten vorhanden.");
        return;
      }
      let total = BigInt(0);
      for (const a of accounts) {
        const bal = typeof a.balance === "bigint" ? a.balance : BigInt(Math.round(Number(a.balance)));
        total += bal;
        drawText(`${a.name} (${a.accountNumber}): ${formatAmount(bal)} ${a.currency}`);
      }
      drawText(`Gesamt: ${formatAmount(total)} EUR`);
    });

    const incomeByCat = new Map<string, number>();
    const expenseByCat = new Map<string, number>();
    for (const tx of transactions as TxRecord[]) {
      const amt = Number(tx.amount);
      const catName = categoryMap.get(tx.category) ?? tx.category;
      if (tx.type === "INCOME") {
        incomeByCat.set(catName, (incomeByCat.get(catName) ?? 0) + amt);
      } else if (tx.type === "EXPENSE") {
        expenseByCat.set(catName, (expenseByCat.get(catName) ?? 0) + amt);
      }
    }

    drawSection("Einnahmen nach Kategorie", () => {
      if (incomeByCat.size === 0) {
        drawText("Keine Einnahmen im Zeitraum.");
        return;
      }
      let total = 0;
      for (const [cat, amt] of [...incomeByCat.entries()].sort((a, b) => b[1] - a[1])) {
        total += amt;
        drawText(`${cat}: ${formatAmount(amt)} EUR`);
      }
      drawText(`Summe Einnahmen: ${formatAmount(total)} EUR`);
    });

    drawSection("Ausgaben nach Kategorie", () => {
      if (expenseByCat.size === 0) {
        drawText("Keine Ausgaben im Zeitraum.");
        return;
      }
      let total = 0;
      for (const [cat, amt] of [...expenseByCat.entries()].sort((a, b) => b[1] - a[1])) {
        total += amt;
        drawText(`${cat}: ${formatAmount(amt)} EUR`);
      }
      drawText(`Summe Ausgaben: ${formatAmount(total)} EUR`);
    });

    drawSection("Transaktionsliste", () => {
      if (transactions.length === 0) {
        drawText("Keine Transaktionen im Zeitraum.");
        return;
      }
      const rows = (transactions as TxRecord[]).map((tx) => {
        const amt = Number(tx.amount);
        const catName = categoryMap.get(tx.category) ?? tx.category;
        const typeLabel = tx.type === "INCOME" ? "Einnahme" : tx.type === "EXPENSE" ? "Ausgabe" : "Umbuchung";
        const sign = tx.type === "INCOME" ? "+" : "-";
        const note = (tx.notes || "—").replace(/\n/g, " ").slice(0, 60);
        return {
          date: formatDate(tx.occurredAt),
          note,
          category: catName,
          type: typeLabel,
          amount: `${sign}${formatAmount(amt)} EUR`,
        };
      });
      for (const r of rows) {
        if (y < margin + 40) {
          page = pdfDoc.addPage([595, 842]);
          y = page.getSize().height - margin;
          page.drawText("(Fortsetzung)", { x: margin, y, size: smallFont, font, color: rgb(0.4, 0.4, 0.4) });
          y -= lineHeight;
        }
        page.drawText(`${r.date} | ${r.note} | ${r.category} | ${r.type} | ${r.amount}`, {
          x: margin,
          y,
          size: smallFont,
          font,
          color: rgb(0, 0, 0),
        });
        y -= lineHeight;
      }
    });

    const pdfBytes = await pdfDoc.save();
    const filename = `Finanzuebersicht_${formatDate(from).replace(/\./g, "-")}_bis_${formatDate(to).replace(/\./g, "-")}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBytes.length),
      },
    });
  } catch (error) {
    console.error("Financial statement PDF error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
