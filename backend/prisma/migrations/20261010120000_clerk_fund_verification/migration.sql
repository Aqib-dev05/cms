-- CreateEnum
CREATE TYPE "PaymentVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FundEntryType" AS ENUM ('INCOME', 'EXPENSE');

-- AlterTable: users (assistant hierarchy + duty checkboxes)
ALTER TABLE "users" ADD COLUMN "createdById" TEXT,
ADD COLUMN "duties" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable: fee_invoices (fee heads printed on the challan)
ALTER TABLE "fee_invoices" ADD COLUMN "lineItems" JSONB;

-- AlterTable: fee_payments (verification workflow; existing rows count as verified)
ALTER TABLE "fee_payments" ADD COLUMN "verificationStatus" "PaymentVerificationStatus" NOT NULL DEFAULT 'VERIFIED',
ADD COLUMN "verifiedById" TEXT,
ADD COLUMN "verifiedAt" TIMESTAMP(3),
ADD COLUMN "verificationNote" TEXT;

-- CreateTable
CREATE TABLE "fund_entries" (
    "id" TEXT NOT NULL,
    "type" "FundEntryType" NOT NULL,
    "category" TEXT NOT NULL,
    "source" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "recordedById" TEXT NOT NULL,
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fund_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fund_entries_type_entryDate_idx" ON "fund_entries"("type", "entryDate");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_entries" ADD CONSTRAINT "fund_entries_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
