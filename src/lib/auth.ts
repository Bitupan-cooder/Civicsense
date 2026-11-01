import { supabase } from "./supabaseClient";

export type UserRole = "administration" | "department" | "social_service" | "student";

export interface UserProfile {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  unit_name: string | null;
  must_change_password: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const RATE_LIMIT_PREFIX = "civic_rl_";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function checkRateLimit(email: string): { allowed: boolean; error?: string } {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_PREFIX + email.toLowerCase().trim());
    if (!raw) return { allowed: true };
    const { count, lockedUntil } = JSON.parse(raw);
    const now = Date.now();
    if (lockedUntil && lockedUntil > now) {
      const remainingMin = Math.ceil((lockedUntil - now) / 60000);
      return {
        allowed: false,
        error: `Too many failed login attempts. Locked out for ${remainingMin} minute(s).`,
      };
    }
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

function recordFailure(email: string): void {
  try {
    const key = RATE_LIMIT_PREFIX + email.toLowerCase().trim();
    const raw = localStorage.getItem(key);
    const now = Date.now();
    const current = raw ? JSON.parse(raw) : { count: 0, lockedUntil: 0 };
    const nextCount = (current.count || 0) + 1;
    const lockedUntil = nextCount >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0;
    localStorage.setItem(key, JSON.stringify({ count: nextCount, lockedUntil, lastAttempt: now }));
  } catch {}
}

function clearRateLimit(email: string): void {
  try {
    localStorage.removeItem(RATE_LIMIT_PREFIX + email.toLowerCase().trim());
  } catch {}
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, name, email, unit_name, must_change_password, is_active, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return data as UserProfile;
}

export async function signInWithRoleCheck(
  email: string,
  password: string,
  allowedRoles?: UserRole[]
): Promise<{ user: any; profile: UserProfile }> {
  const normalized = email.trim().toLowerCase();
  const rate = checkRateLimit(normalized);
  if (!rate.allowed) {
    throw new Error(rate.error);
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  });

  if (error || !data.user) {
    recordFailure(normalized);
    throw new Error(error?.message || "Invalid email or password.");
  }

  const profile = await fetchUserProfile(data.user.id);
  if (!profile) {
    recordFailure(normalized);
    await supabase.auth.signOut();
    throw new Error("Authorized user profile not found.");
  }

  if (!profile.is_active) {
    recordFailure(normalized);
    await supabase.auth.signOut();
    throw new Error("Account has been deactivated by administration.");
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
    recordFailure(normalized);
    await supabase.auth.signOut();
    throw new Error(`Unauthorized role access for: ${allowedRoles.join(", ")}`);
  }

  clearRateLimit(normalized);

  try {
    await supabase.from("activity_log").insert({
      actor_id: data.user.id,
      action: "user_login",
      target: `${profile.role} session started`,
    });
  } catch {}

  return { user: data.user, profile };
}

export async function updateInitialPassword(newPassword: string): Promise<void> {
  if (newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error || !data.user) {
    throw new Error(error?.message || "Failed to update password.");
  }

  await supabase
    .from("profiles")
    .update({ must_change_password: false, updated_at: new Date().toISOString() })
    .eq("id", data.user.id);

  try {
    await supabase.from("activity_log").insert({
      actor_id: data.user.id,
      action: "password_change",
      target: "Initial temporary password replaced with permanent password",
    });
  } catch {}
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

