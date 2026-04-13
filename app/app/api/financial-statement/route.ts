import { NextResponse } from "next/server";
import { auth } from "../../../auth";
import { prisma } from "../../../lib/prisma";
import { PDFDocument, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { toMoneyNumber } from "@/lib/money";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

type TxRecord = {
  id: string;
  amount: number;
  type: string;
  category: string;
  notes: string;
  occurredAt: Date;
  originAccountId: string;
  targetAccountId: string;
  pending: boolean;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 42;
const HEADER_HEIGHT = 94;
const FOOTER_HEIGHT = 34;
const CONTENT_TOP = PAGE_HEIGHT - HEADER_HEIGHT;
const CONTENT_BOTTOM = FOOTER_HEIGHT + 10;

const COLOR_TEXT = rgb(0.08, 0.08, 0.08);
const COLOR_MUTED = rgb(0.45, 0.45, 0.45);
const COLOR_LINE = rgb(0.85, 0.85, 0.85);
const COLOR_TABLE_HEADER = rgb(0.95, 0.95, 0.95);
const COLOR_CARD = rgb(0.97, 0.97, 0.97);
const COLOR_INCOME = rgb(0.07, 0.52, 0.26);
const COLOR_EXPENSE = rgb(0.66, 0.13, 0.13);

function formatAmount(value: number): string {
  const normalized = Math.abs(value) < 0.005 ? 0 : value;
  return normalized.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function truncateText(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}

async function loadFidexLogoPng(): Promise<Uint8Array | null> {
  const logoPath = path.join(process.cwd(), "public", "icon.png");
  try {
    const content = await readFile(logoPath);
    return new Uint8Array(content);
  } catch {
    return null;
  }
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
    const [user, allAccounts, categories, allTransactions, logoPngBytes] = await Promise.all([
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
      loadFidexLogoPng(),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const normalizedAccounts = allAccounts.map((account) => ({
      ...account,
      balance: toMoneyNumber(account.balance),
    }));
    const accounts = accountIdsFilter
      ? normalizedAccounts.filter((a) => accountIdsFilter.includes(a.id))
      : normalizedAccounts;

    let transactions = (allTransactions as unknown as Array<Omit<TxRecord, "amount"> & { amount: unknown }>).map(
      (tx) => ({
        ...tx,
        amount: toMoneyNumber(tx.amount),
      })
    );
    if (accountIdsFilter && accountIdsFilter.length > 0) {
      transactions = transactions.filter(
        (tx) =>
          accountIdsFilter.includes(tx.originAccountId) || accountIdsFilter.includes(tx.targetAccountId)
      );
    }
    if (categoryIdsFilter && categoryIdsFilter.length > 0) {
      transactions = transactions.filter((tx) => categoryIdsFilter.includes(tx.category));
    }

    const categoryMap = new Map<string, string>();
    for (const c of categories) categoryMap.set(c.id, c.name);
    const accountMap = new Map<string, { name: string; accountNumber: string }>();
    for (const a of accounts) accountMap.set(a.id, { name: a.name, accountNumber: a.accountNumber });

    const incomeByCat = new Map<string, number>();
    const expenseByCat = new Map<string, number>();
    let totalIncome = 0;
    let totalExpense = 0;
    for (const tx of transactions) {
      const amount = tx.amount;
      const catName = categoryMap.get(tx.category) ?? "Unknown";
      if (tx.type === "INCOME") {
        totalIncome += amount;
        incomeByCat.set(catName, (incomeByCat.get(catName) ?? 0) + amount);
      } else if (tx.type === "EXPENSE") {
        totalExpense += amount;
        expenseByCat.set(catName, (expenseByCat.get(catName) ?? 0) + amount);
      }
    }
    const net = totalIncome - totalExpense;

    const accountRows = accounts.map((a) => ({
      name: `${a.name} (${a.accountNumber})`,
      value: `${formatAmount(a.balance)} ${a.currency}`,
    }));
    const totalAccountBalance = accounts.reduce((acc, a) => acc + a.balance, 0);

    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const logoImage = logoPngBytes ? await pdfDoc.embedPng(logoPngBytes).catch(() => null) : null;

    let pageNo = 0;
    let page: PDFPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = CONTENT_TOP;

    const metadata = {
      generatedOn: formatDate(new Date()),
      period: `${formatDate(from)} - ${formatDate(to)}`,
    };

    const startPage = () => {
      if (pageNo > 0) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      }
      pageNo += 1;
      drawHeader();
      drawFooter();
      y = CONTENT_TOP - 12;
    };

    const ensureSpace = (requiredHeight: number, redrawTableHeader?: () => void) => {
      if (y - requiredHeight < CONTENT_BOTTOM) {
        startPage();
        if (redrawTableHeader) redrawTableHeader();
      }
    };

    const drawLogo = (x: number, yTop: number, desiredHeight: number): number => {
      if (!logoImage) {
        page.drawText("FIDEX", {
          x,
          y: yTop - 14,
          size: 16,
          font: fontBold,
          color: COLOR_TEXT,
        });
        return 52;
      }
      const scale = desiredHeight / logoImage.height;
      const width = logoImage.width * scale;
      const yBottom = yTop - desiredHeight;
      page.drawImage(logoImage, {
        x,
        y: yBottom,
        width,
        height: desiredHeight,
      });
      return width;
    };

    const drawHeader = () => {
      const topY = PAGE_HEIGHT - 24;
      const logoHeight = 36;
      const logoWidth = drawLogo(MARGIN_X, topY, logoHeight);
      const titleStartX = MARGIN_X + logoWidth + 10;
      const brandCenterY = topY - logoHeight / 2;
      const titleY = brandCenterY;
      const subtitleY = brandCenterY - 13;

      page.drawText("Financial Statement", {
        x: titleStartX,
        y: titleY,
        size: 16,
        font: fontBold,
        color: COLOR_TEXT,
      });
      page.drawText("Prepared by Fidex", {
        x: titleStartX,
        y: subtitleY,
        size: 9,
        font: fontRegular,
        color: COLOR_MUTED,
      });

      const generatedText = `Generated: ${metadata.generatedOn}`;
      const periodText = `Period: ${metadata.period}`;
      const generatedWidth = fontRegular.widthOfTextAtSize(generatedText, 9);
      const periodWidth = fontRegular.widthOfTextAtSize(periodText, 9);
      page.drawText(generatedText, {
        x: PAGE_WIDTH - MARGIN_X - generatedWidth,
        y: topY - 8,
        size: 9,
        font: fontRegular,
        color: COLOR_MUTED,
      });
      page.drawText(periodText, {
        x: PAGE_WIDTH - MARGIN_X - periodWidth,
        y: topY - 22,
        size: 9,
        font: fontRegular,
        color: COLOR_MUTED,
      });

      page.drawLine({
        start: { x: MARGIN_X, y: PAGE_HEIGHT - HEADER_HEIGHT + 16 },
        end: { x: PAGE_WIDTH - MARGIN_X, y: PAGE_HEIGHT - HEADER_HEIGHT + 16 },
        thickness: 1,
        color: COLOR_LINE,
      });
    };

    const drawFooter = () => {
      page.drawLine({
        start: { x: MARGIN_X, y: FOOTER_HEIGHT + 18 },
        end: { x: PAGE_WIDTH - MARGIN_X, y: FOOTER_HEIGHT + 18 },
        thickness: 0.8,
        color: COLOR_LINE,
      });
      page.drawText("Confidential financial statement generated by Fidex", {
        x: MARGIN_X,
        y: FOOTER_HEIGHT + 6,
        size: 8,
        font: fontRegular,
        color: COLOR_MUTED,
      });
      page.drawText(`Page ${pageNo}`, {
        x: PAGE_WIDTH - MARGIN_X - 36,
        y: FOOTER_HEIGHT + 6,
        size: 8,
        font: fontRegular,
        color: COLOR_MUTED,
      });
    };

    const drawSectionTitle = (title: string) => {
      ensureSpace(24);
      page.drawText(title, {
        x: MARGIN_X,
        y,
        size: 12,
        font: fontBold,
        color: COLOR_TEXT,
      });
      y -= 8;
      page.drawLine({
        start: { x: MARGIN_X, y: y - 2 },
        end: { x: PAGE_WIDTH - MARGIN_X, y: y - 2 },
        thickness: 0.8,
        color: COLOR_LINE,
      });
      y -= 14;
    };

    const drawSummaryCard = (x: number, yTop: number, width: number, title: string, value: string, valueColor = COLOR_TEXT) => {
      const cardHeight = 50;
      page.drawRectangle({
        x,
        y: yTop - cardHeight,
        width,
        height: cardHeight,
        color: COLOR_CARD,
      });
      page.drawText(title, {
        x: x + 10,
        y: yTop - 16,
        size: 8,
        font: fontRegular,
        color: COLOR_MUTED,
      });
      page.drawText(value, {
        x: x + 10,
        y: yTop - 34,
        size: 12,
        font: fontBold,
        color: valueColor,
      });
    };

    const drawTwoColumnRows = (rows: Array<{ label: string; value: string }>) => {
      const rowHeight = 16;
      for (const row of rows) {
        ensureSpace(rowHeight + 2);
        page.drawText(row.label, {
          x: MARGIN_X,
          y,
          size: 9,
          font: fontRegular,
          color: COLOR_TEXT,
        });
        const valueWidth = fontBold.widthOfTextAtSize(row.value, 9);
        page.drawText(row.value, {
          x: PAGE_WIDTH - MARGIN_X - valueWidth,
          y,
          size: 9,
          font: fontBold,
          color: COLOR_TEXT,
        });
        y -= rowHeight;
      }
      y -= 4;
    };

    const drawCategoryBreakdown = (title: string, source: Map<string, number>, totalLabel: string) => {
      drawSectionTitle(title);
      const rows = [...source.entries()].sort((a, b) => b[1] - a[1]);
      if (rows.length === 0) {
        page.drawText("No data for the selected period.", {
          x: MARGIN_X,
          y,
          size: 9,
          font: fontRegular,
          color: COLOR_MUTED,
        });
        y -= 18;
        return;
      }
      drawTwoColumnRows(
        rows.map(([label, value]) => ({
          label,
          value: `${formatAmount(value)} EUR`,
        }))
      );
      const total = rows.reduce((acc, [, value]) => acc + value, 0);
      page.drawText(totalLabel, {
        x: MARGIN_X,
        y,
        size: 9,
        font: fontBold,
        color: COLOR_TEXT,
      });
      const totalText = `${formatAmount(total)} EUR`;
      const totalWidth = fontBold.widthOfTextAtSize(totalText, 9);
      page.drawText(totalText, {
        x: PAGE_WIDTH - MARGIN_X - totalWidth,
        y,
        size: 9,
        font: fontBold,
        color: COLOR_TEXT,
      });
      y -= 18;
    };

    const drawTransactionTable = () => {
      drawSectionTitle("Transaction Detail");

      const tableLeft = MARGIN_X;
      const colWidths = [70, 190, 95, 62, 94];
      const rowHeight = 18;
      const tableHeaders = ["Date", "Description", "Category", "Type", "Amount"];

      const drawTableHeader = () => {
        ensureSpace(rowHeight + 4);
        page.drawRectangle({
          x: tableLeft,
          y: y - rowHeight + 3,
          width: colWidths.reduce((acc, w) => acc + w, 0),
          height: rowHeight,
          color: COLOR_TABLE_HEADER,
        });
        let x = tableLeft + 6;
        for (let i = 0; i < tableHeaders.length; i += 1) {
          page.drawText(tableHeaders[i], {
            x,
            y: y - 10,
            size: 8,
            font: fontBold,
            color: COLOR_TEXT,
          });
          x += colWidths[i];
        }
        y -= rowHeight + 4;
      };

      if (transactions.length === 0) {
        page.drawText("No transactions in the selected period.", {
          x: MARGIN_X,
          y,
          size: 9,
          font: fontRegular,
          color: COLOR_MUTED,
        });
        y -= 16;
        return;
      }

      drawTableHeader();

      for (const tx of transactions) {
        ensureSpace(rowHeight + 3, drawTableHeader);
        const amount = tx.amount;
        const typeLabel =
          tx.type === "INCOME" ? "Income" : tx.type === "EXPENSE" ? "Expense" : "Transfer";
        const sign = tx.type === "INCOME" ? "+" : tx.type === "EXPENSE" ? "-" : "";
        const row = [
          formatDate(tx.occurredAt),
          truncateText((tx.notes || "Transaction").replace(/\n/g, " "), 38),
          truncateText(categoryMap.get(tx.category) ?? "Unknown", 20),
          typeLabel,
          `${sign}${formatAmount(amount)} EUR`,
        ];

        let x = tableLeft + 6;
        for (let i = 0; i < row.length; i += 1) {
          const isAmountCol = i === 4;
          const text = row[i];
          const textWidth = fontRegular.widthOfTextAtSize(text, 8.5);
          const drawX = isAmountCol ? x + colWidths[i] - textWidth - 8 : x;
          page.drawText(text, {
            x: drawX,
            y: y - 10,
            size: 8.5,
            font: isAmountCol ? fontBold : fontRegular,
            color: i === 3 ? COLOR_MUTED : COLOR_TEXT,
          });
          x += colWidths[i];
        }

        page.drawLine({
          start: { x: tableLeft, y: y - rowHeight + 2 },
          end: { x: tableLeft + colWidths.reduce((acc, w) => acc + w, 0), y: y - rowHeight + 2 },
          thickness: 0.4,
          color: COLOR_LINE,
        });

        y -= rowHeight;
      }
    };

    startPage();

    drawSectionTitle("Statement Overview");
    const reportUserName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Not provided";
    const reportEmail = user.email || "Not provided";
    const overviewRows = includePersonalInfo
      ? [
          { label: "Account Holder", value: reportUserName },
          { label: "Email", value: reportEmail },
          { label: "Reporting Period", value: metadata.period },
        ]
      : [{ label: "Reporting Period", value: metadata.period }];
    drawTwoColumnRows(overviewRows);

    ensureSpace(70);
    const cardTop = y;
    const cardGap = 8;
    const cardWidth = (PAGE_WIDTH - MARGIN_X * 2 - cardGap * 3) / 4;
    drawSummaryCard(MARGIN_X, cardTop, cardWidth, "Total Income", `${formatAmount(totalIncome)} EUR`, COLOR_INCOME);
    drawSummaryCard(MARGIN_X + (cardWidth + cardGap), cardTop, cardWidth, "Total Expense", `${formatAmount(totalExpense)} EUR`, COLOR_EXPENSE);
    drawSummaryCard(MARGIN_X + (cardWidth + cardGap) * 2, cardTop, cardWidth, "Net", `${formatAmount(net)} EUR`, net >= 0 ? COLOR_INCOME : COLOR_EXPENSE);
    drawSummaryCard(MARGIN_X + (cardWidth + cardGap) * 3, cardTop, cardWidth, "Account Total", `${formatAmount(totalAccountBalance)} EUR`);
    y -= 68;

    drawSectionTitle("Account Balances");
    if (accountRows.length === 0) {
      page.drawText("No accounts available.", {
        x: MARGIN_X,
        y,
        size: 9,
        font: fontRegular,
        color: COLOR_MUTED,
      });
      y -= 18;
    } else {
      drawTwoColumnRows(accountRows.map((row) => ({ label: row.name, value: row.value })));
      page.drawText("Total", {
        x: MARGIN_X,
        y,
        size: 9,
        font: fontBold,
        color: COLOR_TEXT,
      });
      const totalText = `${formatAmount(totalAccountBalance)} EUR`;
      const totalWidth = fontBold.widthOfTextAtSize(totalText, 9);
      page.drawText(totalText, {
        x: PAGE_WIDTH - MARGIN_X - totalWidth,
        y,
        size: 9,
        font: fontBold,
        color: COLOR_TEXT,
      });
      y -= 18;
    }

    drawCategoryBreakdown("Income by Category", incomeByCat, "Total Income");
    drawCategoryBreakdown("Expenses by Category", expenseByCat, "Total Expense");

    if (includeTransactionList) {
      drawTransactionTable();
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
