/*
  Warnings:

  - A unique constraint covering the columns `[storageKey]` on the table `Document` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('CONTRACT', 'BILL', 'RECEIPT', 'OTHER');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "kind" "DocumentKind" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "originalFileName" TEXT,
ADD COLUMN     "sizeBytes" INTEGER,
ADD COLUMN     "storageKey" TEXT,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "url" TEXT,
ALTER COLUMN "categoryId" DROP NOT NULL,
ALTER COLUMN "content" DROP NOT NULL;

-- CreateTable
CREATE TABLE "DocumentTransaction" (
    "documentId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentTransaction_pkey" PRIMARY KEY ("documentId","transactionId")
);

-- CreateIndex
CREATE INDEX "DocumentTransaction_transactionId_idx" ON "DocumentTransaction"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");

-- CreateIndex
CREATE INDEX "Document_userId_createdAt_idx" ON "Document"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Document_userId_kind_idx" ON "Document"("userId", "kind");

-- AddForeignKey
ALTER TABLE "DocumentTransaction" ADD CONSTRAINT "DocumentTransaction_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTransaction" ADD CONSTRAINT "DocumentTransaction_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
