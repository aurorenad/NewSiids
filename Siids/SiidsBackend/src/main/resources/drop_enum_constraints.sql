-- Drop stale check constraints on enum columns that prevent new enum values
-- PostgreSQL creates these when JPA first creates the table with @Enumerated(EnumType.STRING)

ALTER TABLE stock_item DROP CONSTRAINT IF EXISTS stock_item_measurement_unit_check;
ALTER TABLE stock_item DROP CONSTRAINT IF EXISTS stock_item_item_check;
