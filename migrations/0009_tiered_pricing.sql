-- 0009_tiered_pricing.sql
ALTER TABLE meetings ADD COLUMN member_fee INTEGER DEFAULT 0;
ALTER TABLE meetings ADD COLUMN committee_fee INTEGER DEFAULT 0;
ALTER TABLE meetings ADD COLUMN early_bird_fee INTEGER DEFAULT 0;
ALTER TABLE meetings ADD COLUMN walk_in_fee INTEGER DEFAULT 0;
ALTER TABLE attendance ADD COLUMN price_tier TEXT DEFAULT '';
