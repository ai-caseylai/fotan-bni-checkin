-- Add seat_order for ordering people within a table
ALTER TABLE attendance ADD COLUMN seat_order INTEGER DEFAULT NULL;
ALTER TABLE members ADD COLUMN seat_order INTEGER DEFAULT NULL;
ALTER TABLE guests ADD COLUMN seat_order INTEGER DEFAULT NULL;
