import { createServerClient, type CookieOptions } from "@supabase/ssr";

const supabaseUrl =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  "https://mdywamyrxuuookaxksyv.supabase.co";

const supabaseKey =
  (typeof process !== "undefined" && (process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY)) ||
  "sb_publishable_97gBSZ3CLy6r0E3thRZ85Q_b7xyQxj_";

export interface CookieStoreInterface {
  getAll: () => { name: string; value: string }[] | Promise<{ name: string; value: string }[]>;
  set?: (name: string, value: string, options?: CookieOptions) => void;
}

export const createClient = (cookieStore?: CookieStoreInterface) => {
  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          if (!cookieStore || typeof cookieStore.getAll !== "function") return [];
          const res = cookieStore.getAll();
          return Array.isArray(res) ? res : [];
        },
        setAll(cookiesToSet) {
          if (!cookieStore || typeof cookieStore.set !== "function") return;
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set!(name, value, options)
            );
          } catch {
            // Server Component context fallback
          }
        },
      },
    }
  );
};
