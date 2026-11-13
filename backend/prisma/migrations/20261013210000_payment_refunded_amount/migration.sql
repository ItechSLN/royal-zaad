-- Partial refunds: a shop cancelling its sub-order of a paid checkout refunds
-- only that share. Fully refunded payments keep status REFUNDED.
ALTER TABLE "Payment" ADD COLUMN "refundedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
UPDATE "Payment" SET "refundedAmount" = "amount" WHERE "status" = 'REFUNDED';
