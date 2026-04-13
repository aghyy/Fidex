import { NextResponse } from "next/server";
import { auth } from "../../../auth";
import { prisma } from "../../../lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { toMoneyNumber } from "@/lib/money";

export const runtime = "nodejs";

type TxRecord = {
  id: string;
  amount: unknown;
  type: string;
  category: string;
  notes: string;
  occurredAt: Date;
  originAccountId: string;
  targetAccountId: string;
  pending: boolean;
};

function formatAmount(value: number): string {
  const n = value;
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-US", {
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
  const accountIdsParam = searchParams.get("accounts");
  const categoryIdsParam = searchParams.get("categories");
  const includePending = searchParams.get("includePending") === "true";
  const includePersonalInfo = searchParams.get("includePersonalInfo") !== "false";
  const includeTransactionList = searchParams.get("includeTransactionList") !== "false";

  const accountIdsFilter =
    accountIdsParam !== null && accountIdsParam !== undefined
      ? accountIdsParam.split(",").map((id) => id.trim()).filter(Boolean)
      : null;
  const categoryIdsFilter =
    categoryIdsParam !== null && categoryIdsParam !== undefined
      ? categoryIdsParam.split(",").map((id) => id.trim()).filter(Boolean)
      : null;

  const now = new Date();
  const from = fromParam ? new Date(fromParam) : new Date(now.getFullYear(), 0, 1);
  const to = toParam ? new Date(toParam) : new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  try {
    const [user, allAccounts, categories, allTransactions] = await Promise.all([
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
          ...(includePending ? {} : { pending: false }),
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

    const accounts = accountIdsFilter
      ? allAccounts.filter((a) => accountIdsFilter.includes(a.id))
      : allAccounts;

    let transactions = allTransactions as unknown as TxRecord[];
    if (accountIdsFilter && accountIdsFilter.length > 0) {
      transactions = transactions.filter(
        (tx) =>
          accountIdsFilter.includes(tx.originAccountId) || accountIdsFilter.includes(tx.targetAccountId)
      );
    }
    if (categoryIdsFilter && categoryIdsFilter.length > 0) {
      transactions = transactions.filter((tx) => categoryIdsFilter.includes(tx.category));
    }

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

    drawText("Financial Statement", { bold: true, size: 18 });
    y -= 8;
    drawText(`Generated on: ${generatedAt}`);
    drawText(`Period: ${periodStr}`);
    y -= 8;

    if (includePersonalInfo) {
      drawSection("Personal Information", () => {
        drawText(`Name: ${userName}`);
        drawText(`Email: ${user.email || "—"}`);
      });
    }

    drawSection("Account Balances (as of report date)", () => {
      if (accounts.length === 0) {
        drawText("No accounts available.");
        return;
      }
      let total = 0;
      for (const a of accounts) {
        const bal = toMoneyNumber(a.balance);
        total += bal;
        drawText(`${a.name} (${a.accountNumber}): ${formatAmount(bal)} ${a.currency}`);
      }
      drawText(`Total: ${formatAmount(total)} EUR`);
    });

    const incomeByCat = new Map<string, number>();
    const expenseByCat = new Map<string, number>();
    for (const tx of transactions as TxRecord[]) {
      const amt = toMoneyNumber(tx.amount);
      const catName = categoryMap.get(tx.category) ?? tx.category;
      if (tx.type === "INCOME") {
        incomeByCat.set(catName, (incomeByCat.get(catName) ?? 0) + amt);
      } else if (tx.type === "EXPENSE") {
        expenseByCat.set(catName, (expenseByCat.get(catName) ?? 0) + amt);
      }
    }

    drawSection("Income by Category", () => {
      if (incomeByCat.size === 0) {
        drawText("No income in period.");
        return;
      }
      let total = 0;
      for (const [cat, amt] of [...incomeByCat.entries()].sort((a, b) => b[1] - a[1])) {
        total += amt;
        drawText(`${cat}: ${formatAmount(amt)} EUR`);
      }
      drawText(`Total Income: ${formatAmount(total)} EUR`);
    });

    drawSection("Expenses by Category", () => {
      if (expenseByCat.size === 0) {
        drawText("No expenses in period.");
        return;
      }
      let total = 0;
      for (const [cat, amt] of [...expenseByCat.entries()].sort((a, b) => b[1] - a[1])) {
        total += amt;
        drawText(`${cat}: ${formatAmount(amt)} EUR`);
      }
      drawText(`Total Expenses: ${formatAmount(total)} EUR`);
    });

    if (includeTransactionList) {
      drawSection("Transaction List", () => {
        if (transactions.length === 0) {
          drawText("No transactions in period.");
          return;
        }
        const rows = transactions.map((tx) => {
        const amt = toMoneyNumber(tx.amount);
        const catName = categoryMap.get(tx.category) ?? tx.category;
        const typeLabel = tx.type === "INCOME" ? "Income" : tx.type === "EXPENSE" ? "Expense" : "Transfer";
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
          page.drawText("(continued)", { x: margin, y, size: smallFont, font, color: rgb(0.4, 0.4, 0.4) });
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
    }

    const pdfBytes = await pdfDoc.save();
    const filename = `Financial_Statement_${formatDate(from).replace(/\//g, "-")}_to_${formatDate(to).replace(/\//g, "-")}.pdf`;

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
