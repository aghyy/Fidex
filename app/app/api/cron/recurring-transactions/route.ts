import { NextResponse } from "next/server";
import { materializeDueRecurringTransactions } from "@/lib/recurring-transactions";

export const runtime = "nodejs";
// Keep the cron job out of any static optimization path — it needs to run on
// every invocation.
export const dynamic = "force-dynamic";
// Give the function enough headroom to catch up after extended outages.
export const maxDuration = 300;

/**
 * Vercel Cron Jobs handler for recurring transactions.
 *
 * Vercel automatically sends an `Authorization: Bearer $CRON_SECRET` header
 * for scheduled invocations when the `CRON_SECRET` env var is set on the
 * project. Deny anything else when the secret is configured.
 *
 * In local development you can hit this endpoint directly with:
 *   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/recurring-transactions
 */
async function handleCron(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const authHeader = request.headers.get("authorization");
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    const startedAt = Date.now();
    try {
        const stats = await materializeDueRecurringTransactions();
        const durationMs = Date.now() - startedAt;
        return NextResponse.json({
            success: true,
            durationMs,
            ...stats,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Recurring transactions cron failed:", error);
        return NextResponse.json(
            { success: false, error: message, durationMs: Date.now() - startedAt },
            { status: 500 }
        );
    }
}

export async function GET(request: Request) {
    return handleCron(request);
}

export async function POST(request: Request) {
    return handleCron(request);
}
