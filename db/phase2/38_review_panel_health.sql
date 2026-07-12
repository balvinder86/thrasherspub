-- ============================================================
-- Tracks a real, observed Google-side bug: Google Business Profile's
-- own reviews panel sometimes stops rendering its review list at all
-- (both "Unreplied" and "All" tabs show "You have no reviews yet")
-- while the header star-rating stat right above it still shows the
-- real, correct, nonzero review count — a direct self-contradiction
-- within Google's own UI, confirmed by direct observation against
-- Thrasher's real profile (818 real reviews, panel rendered empty).
-- This isn't "zero unreplied reviews" (a normal, healthy state) — the
-- "All" tab being empty too is what makes it a real bug, not just an
-- empty inbox. Every scan records what it saw so the Reviews page can
-- show an honest banner instead of silently drafting nothing.
-- ============================================================

alter table review_agent_credentials
  add column if not exists last_scan_google_review_count integer,
  add column if not exists last_scan_panel_healthy boolean;
