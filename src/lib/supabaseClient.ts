import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL =
  (typeof process !== "undefined" && (process.env?.BACKEND_DATABASE_URL || process.env?.BACKEND_URL || process.env?.NEXT_PUBLIC_SUPABASE_URL)) ||
  (typeof import.meta !== "undefined" && ((import.meta as any).env?.VITE_BACKEND_URL || (import.meta as any).env?.VITE_SUPABASE_URL)) ||
  "https://mdywamyrxuuookaxksyv.supabase.co";

export const SUPABASE_ANON_KEY =
  (typeof process !== "undefined" && (process.env?.BACKEND_ANON_KEY || process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY)) ||
  (typeof import.meta !== "undefined" && ((import.meta as any).env?.VITE_BACKEND_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY)) ||
  "sb_publishable_97gBSZ3CLy6r0E3thRZ85Q_b7xyQxj_";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

