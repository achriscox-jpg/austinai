-- Adds a place to persist the pipeline's verify-step flags (previously only
-- printed to the GitHub Actions run log, never stored anywhere) so the
-- dashboard can show a per-record confidence badge ("Solid" vs. "Worth a
-- glance") instead of that information evaporating after each run.
-- Run this once in the Supabase SQL editor.

alter table outcomes add column if not exists review_notes text;
