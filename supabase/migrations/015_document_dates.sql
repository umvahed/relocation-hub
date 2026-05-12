-- Migration 015: Document date extraction
-- Stores AI-extracted dates from uploaded documents (passport expiry, flight date, etc.)
-- Used to populate the relocation timeline on the dashboard

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS extracted_date        TEXT,   -- YYYY-MM-DD
  ADD COLUMN IF NOT EXISTS extracted_date_label  TEXT;   -- e.g. "Passport expires", "Departure to Amsterdam"
