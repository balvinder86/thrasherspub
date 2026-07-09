-- ============================================================
-- Optional auto-send for 5-star replies — off by default. When on,
-- the scan process posts a 5-star review's reply immediately instead
-- of waiting for a manual "Approve & post" click. Every other rating
-- still always requires human approval; this is a deliberate,
-- narrow exception the user explicitly asked for, not a general
-- auto-post mode.
-- ============================================================
alter table review_agent_settings
  add column if not exists auto_send_5_star boolean not null default false;
