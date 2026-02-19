-- Add user preference for including pending transactions in calculations
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "bookAllTransactions" BOOLEAN NOT NULL DEFAULT false;

-- Add transaction status and transaction date-time
ALTER TABLE "Transaction"
ADD COLUMN IF NOT EXISTS "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "pending" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Transaction_userId_occurredAt_idx"
ON "Transaction"("userId", "occurredAt");

CREATE INDEX IF NOT EXISTS "Transaction_userId_pending_idx"
ON "Transaction"("userId", "pending");
