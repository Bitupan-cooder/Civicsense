import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  "https://mdywamyrxuuookaxksyv.supabase.co";

const supabaseKey =
  (typeof process !== "undefined" && (process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY)) ||
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  "sb_publishable_97gBSZ3CLy6r0E3thRZ85Q_b7xyQxj_";

export const createClient = () =>
  createBrowserClient(
    supabaseUrl!,
    supabaseKey!,
  );

