-- Adds the notes field (shown as "Follow-up Notes" / "Notes" in the two
-- tables) to the outcomes_log snapshot - missed in the original
-- add-outcomes-log.sql.
-- Run this once in the Supabase SQL editor.

alter table outcomes_log add column if not exists notes text;
