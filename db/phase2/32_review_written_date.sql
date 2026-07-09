-- ============================================================
-- Adds a real "when the guest actually wrote this" timestamp,
-- separate from review_found_at (when OUR scan first saw it).
-- Nullable and best-effort: it's parsed from Google's own relative
-- date text on the review card ("2 weeks ago", "a month ago"), which
-- the DOM extraction previously discarded entirely. Existing rows
-- imported before this column existed stay null; the app falls back
-- to review_found_at for those.
-- ============================================================
alter table reviews add column if not exists review_written_at timestamptz;
