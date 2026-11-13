-- Lets vendors see why a product was rejected or removed.
ALTER TABLE "Product" ADD COLUMN "moderationReason" TEXT;
