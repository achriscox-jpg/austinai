// config.js — Supabase connection settings for the Outcomes Review Tool.
//
// SUPABASE_KEY is the *publishable* key. It's designed to be exposed in
// client-side code (same role the old "anon" key played) — the actual
// security boundary is Row Level Security policies on the database, not
// keeping this key secret. Never put the secret/service_role key here or
// anywhere in client-side code.
window.SUPABASE_CONFIG = {
  url: "https://morxqykbklunaerpcvmc.supabase.co",
  key: "sb_publishable_a1h5IoH0XxN0VQ12Ctf8eA_jHCHz29G",
};
