/*
  Warnings:

  - A unique constraint covering the columns `[userId,name,accountNumber]` on the table `Account` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,name,categoryId]` on the table `Document` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `currency` to the `Account` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'NZD', 'CNY', 'HKD', 'SGD', 'KRW', 'INR', 'RUB', 'BRL', 'MXN', 'ZAR', 'TRY', 'SAR', 'AED', 'ALL', 'BGN', 'CZK', 'DKK', 'HUF', 'ISK', 'NOK', 'PLN', 'RON', 'RSD', 'SEK', 'UAH', 'ARS', 'BSD', 'BBD', 'BZD', 'BMD', 'BOB', 'CLP', 'COP', 'CRC', 'CUP', 'DOP', 'GTQ', 'HTG', 'HNL', 'JMD', 'NIO', 'PAB', 'PYG', 'PEN', 'TTD', 'UYU', 'VES', 'DZD', 'AOA', 'BWP', 'CVE', 'EGP', 'ETB', 'GHS', 'KES', 'LYD', 'MAD', 'MZN', 'NAD', 'NGN', 'RWF', 'SCR', 'TZS', 'TND', 'UGX', 'XOF', 'XAF', 'ZMW', 'ZWL', 'AFN', 'AMD', 'AZN', 'BHD', 'BDT', 'BTN', 'BND', 'KHR', 'GEL', 'IDR', 'IRR', 'IQD', 'ILS', 'JOD', 'KZT', 'KWD', 'KGS', 'LAK', 'LBP', 'MYR', 'MVR', 'MNT', 'NPR', 'OMR', 'PKR', 'PHP', 'QAR', 'LKR', 'SYP', 'TJS', 'THB', 'TMT', 'UZS', 'VND', 'YER', 'FJD', 'PGK', 'WST', 'SBD', 'TOP', 'VUV');

-- DropIndex
DROP INDEX "public"."Account_accountNumber_key";

-- DropIndex
DROP INDEX "public"."Account_name_key";

-- DropIndex
DROP INDEX "public"."Document_categoryId_key";

-- DropIndex
DROP INDEX "public"."Document_name_key";

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "currency" "Currency" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Account_userId_name_accountNumber_key" ON "Account"("userId", "name", "accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Document_userId_name_categoryId_key" ON "Document"("userId", "name", "categoryId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
