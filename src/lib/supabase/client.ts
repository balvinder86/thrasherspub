import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set");
}

// Anon/publishable key only — safe to ship to the browser. Every table
// query goes through Postgres RLS (see db/phase0/01_schema.sql), so this
// client can only ever see rows the signed-in user is a member of.
export const supabase = createClient(url, anonKey);
