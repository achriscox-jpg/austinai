-- Adds the "next action date" field used to hide far-off follow-ups from
-- the dashboard until they're within 2 weeks of being due.
-- Run this once in the Supabase SQL editor.

alter table outcomes add column if not exists next_action_date date;
