-- AlterTable (idempotent: altering to the same type is a no-op)
ALTER TABLE "Account" ALTER COLUMN "balance" TYPE DECIMAL(12,2) USING "balance"::DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Budget" ALTER COLUMN "targetAmount" TYPE DECIMAL(12,2) USING "targetAmount"::DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "amount" TYPE DECIMAL(12,2) USING "amount"::DECIMAL(12,2);

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "Transaction_userId_occurredAt_idx" ON "Transaction"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_userId_pending_idx" ON "Transaction"("userId", "pending");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_userId_category_idx" ON "Transaction"("userId", "category");

-- Remove orphaned transactions before applying foreign keys.
DELETE FROM "Transaction"
WHERE "userId" NOT IN (SELECT "id" FROM "User");

DELETE FROM "Transaction"
WHERE "originAccountId" NOT IN (SELECT "id" FROM "Account");

DELETE FROM "Transaction"
WHERE "targetAccountId" NOT IN (SELECT "id" FROM "Account");

DELETE FROM "Transaction"
WHERE "category" NOT IN (SELECT "id" FROM "Category");

-- AddForeignKey (idempotent: skip if constraint already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Transaction_userId_fkey'
    ) THEN
        ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Transaction_originAccountId_fkey'
    ) THEN
        ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_originAccountId_fkey" FOREIGN KEY ("originAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Transaction_targetAccountId_fkey'
    ) THEN
        ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_targetAccountId_fkey" FOREIGN KEY ("targetAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Transaction_category_fkey'
    ) THEN
        ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_category_fkey" FOREIGN KEY ("category") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END
$$;
