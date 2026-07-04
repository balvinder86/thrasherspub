-- ============================================================
-- Phase 2 — Track the Mindee OCR job id on the invoice
-- ------------------------------------------------------------
-- The OCR pipeline is split into enqueue + check (see
-- supabase/functions/invoice-ocr) rather than one long-running
-- poll-in-a-loop call — needed after finding that repeated polls
-- within a single Edge Function invocation kept hitting a 404 that
-- a fresh call didn't (likely backend connection/session pinning),
-- and it's the more standard shape for an async OCR pipeline anyway.
-- ============================================================
alter table invoices add column if not exists mindee_job_id text;
alter table invoices add column if not exists ocr_status text; -- 'processing' | 'ready' | 'failed'
