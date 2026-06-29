-- 入錢憑證關聯人員
ALTER TABLE whatsapp_cert ADD COLUMN person_type TEXT DEFAULT '';
ALTER TABLE whatsapp_cert ADD COLUMN person_id INTEGER DEFAULT 0;
ALTER TABLE whatsapp_cert ADD COLUMN person_name TEXT DEFAULT '';
