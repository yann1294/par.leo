import { createClient } from '@supabase/supabase-js';

// Only browser-safe project credentials are read here. Never expose a service-role key
// through NEXT_PUBLIC_* variables; authorization is enforced by Supabase RLS policies.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key) : null;
