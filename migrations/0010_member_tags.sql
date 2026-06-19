-- Add tags field to members for custom categorization
ALTER TABLE members ADD COLUMN tags TEXT DEFAULT '';
