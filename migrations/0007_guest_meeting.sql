ALTER TABLE guests ADD COLUMN meeting_id INTEGER REFERENCES meetings(id);
