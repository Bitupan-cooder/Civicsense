import { createServerClient } from "@supabase/ssr";

const supabaseUrl =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  "https://mdywamyrxuuookaxksyv.supabase.co";

const supabaseKey =
  (typeof process !== "undefined" && (process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY)) ||
  "sb_publishable_97gBSZ3CLy6r0E3thRZ85Q_b7xyQxj_";

export const createMiddlewareClient = (req: any, res: any) => {
  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          const cookieHeader = req?.headers?.cookie || "";
          return cookieHeader.split(";").map((c: string) => {
            const [name, ...val] = c.trim().split("=");
            return { name, value: val.join("=") };
          });
        },
        setAll(cookiesToSet) {
          if (!res || !res.setHeader) return;
          try {
            const cookieStrings = cookiesToSet.map(
              ({ name, value, options }) =>
                `${name}=${value}; Path=${options?.path || "/"}${options?.maxAge ? `; Max-Age=${options.maxAge}` : ""}`
            );
            res.setHeader("Set-Cookie", cookieStrings);
          } catch {}
        },
      },
    }
  );
};
