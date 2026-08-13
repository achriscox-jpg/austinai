-- Append-only log of two actions that remove a row from `outcomes`:
-- checking "documented in HMIS" and deleting a record. Both actions call
-- the same delete under the hood (see deleteRecord in script.js), so once
-- a row is gone there's otherwise no record of which of the two happened,
-- who did it, or (for a delete) why. This table snapshots the row's key
-- fields at the moment of removal, independent of whether `outcomes` still
-- has the row.
-- Run this once in the Supabase SQL editor.

create table if not exists outcomes_log (
  id bigint generated always as identity primary key,
  outcome_id bigint,
  action text not null check (action in ('documented_in_hmis', 'deleted')),
  reason text,
  by_name text,
  guest_id text,
  guest_name text,
  classification text,
  type text,
  status text,
  date_identified date,
  case_manager text,
  source_email text,
  created_at timestamptz not null default now()
);

create index if not exists outcomes_log_outcome_id_idx on outcomes_log (outcome_id);
