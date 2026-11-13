-- Search performance: store the weighted full-text document instead of
-- recomputing it for every row on every search, and index it. A trigger keeps
-- it current (a plain column rather than a generated one, which Prisma can't model).
ALTER TABLE "Product" ADD COLUMN "searchVector" tsvector;

CREATE OR REPLACE FUNCTION product_search_vector() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."name", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."shortDescription", '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW."description", '')), 'C');
  RETURN NEW;
END $$;

CREATE TRIGGER product_search_vector
BEFORE INSERT OR UPDATE OF "name", "shortDescription", "description" ON "Product"
FOR EACH ROW EXECUTE FUNCTION product_search_vector();

-- Backfill existing rows (fires the trigger).
UPDATE "Product" SET "name" = "name";

CREATE INDEX "Product_searchVector_idx" ON "Product" USING gin ("searchVector");

-- Replaced by the stored column's index.
DROP INDEX IF EXISTS "Product_search_idx";

-- Typo-tolerant category matching for search.
CREATE INDEX "Category_name_trgm_idx" ON "Category" USING gin ("name" gin_trgm_ops);
