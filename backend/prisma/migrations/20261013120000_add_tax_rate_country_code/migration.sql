-- AlterTable
ALTER TABLE "TaxRate" ADD COLUMN     "countryCode" TEXT;

-- Link the existing jurisdictions to the countries they cover, so checkout can
-- pick the rate from the shipping address.
UPDATE "TaxRate" SET "countryCode" = 'SA' WHERE "jurisdiction" LIKE 'KSA%';
UPDATE "TaxRate" SET "countryCode" = 'AE' WHERE "jurisdiction" LIKE 'UAE%';
UPDATE "TaxRate" SET "countryCode" = 'QA' WHERE "jurisdiction" LIKE 'Qatar%';
