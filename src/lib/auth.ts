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

export type IdCardStatus = "pending" | "verified" | "not_valid";

export interface IdCardRecord {
  id?: string;
  user_id: string;
  cloudinary_public_id: string;
  status: IdCardStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function uploadIdCardFile(file: File): Promise<{ public_id: string; format: string }> {
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error("Student ID card file exceeds 5 MB limit.");
  }

  const signRes = await fetch("/api/cloudinary/sign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!signRes.ok) {
    const err = await signRes.json().catch(() => ({}));
    throw new Error(err.error || "Failed to obtain upload signature.");
  }

  const signData = await signRes.json();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signData.apiKey);
  formData.append("timestamp", signData.timestamp);
  formData.append("signature", signData.signature);
  formData.append("folder", signData.folder);
  formData.append("type", signData.type);

  const cldRes = await fetch(`https://api.cloudinary.com/v1_1/${signData.cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });

  if (!cldRes.ok) {
    const err = await cldRes.json().catch(() => ({}));
    throw new Error(err.error?.message || "Failed to upload ID card to storage.");
  }

  const cldData = await cldRes.json();
  return {
    public_id: cldData.public_id,
    format: cldData.format,
  };
}

export async function registerStudent(options: {
  name: string;
  email: string;
  password: string;
  file: File;
}): Promise<{ user: any; public_id: string }> {
  const { name, email, password, file } = options;
  const normalizedEmail = email.trim().toLowerCase();

  const uploadResult = await uploadIdCardFile(file);

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: { data: { name, role: "student" } },
  });

  if (authError || !authData.user) {
    throw new Error(authError?.message || "Failed to register student.");
  }

  const user = authData.user;

  await supabase.from("profiles").insert({
    id: user.id,
    role: "student",
    name,
    email: normalizedEmail,
    unit_name: null,
    must_change_password: false,
    is_active: true,
  });

  await supabase.from("id_cards").insert({
    user_id: user.id,
    cloudinary_public_id: uploadResult.public_id,
    status: "pending",
  });

  try {
    await supabase.from("activity_log").insert({
      actor_id: user.id,
      action: "student_signup",
      target: "Student registered with ID card verification pending",
    });
  } catch {}

  return { user, public_id: uploadResult.public_id };
}

export async function reuploadStudentIdCard(file: File): Promise<{ public_id: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) {
    throw new Error("Must be logged in as student to re-upload ID card.");
  }

  const uploadResult = await uploadIdCardFile(file);
  const userId = sessionData.session.user.id;

  const { error } = await supabase
    .from("id_cards")
    .update({
      cloudinary_public_id: uploadResult.public_id,
      status: "pending",
      reviewed_by: null,
      reviewed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message || "Failed to update ID card record.");
  }

  return { public_id: uploadResult.public_id };
}

export async function fetchSignedIdCardUrl(userId: string): Promise<{ signedUrl: string; status: IdCardStatus }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error("Authentication required to view student ID cards.");
  }

  const res = await fetch(`/api/id-card/view?userId=${encodeURIComponent(userId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Access denied or ID card not found.");
  }

  return await res.json();
}

// ── COMPLAINT WORKFLOW TYPES & METHODS ────────────────────────
export type ComplaintVisibility = "administration" | "department" | "social_service";
export type ComplaintStatus =
  | "submitted"
  | "under_verification"
  | "accepted"
  | "in_progress"
  | "resolved"
  | "rejected";

export interface ComplaintRecord {
  id: string;
  student_id: string;
  title: string;
  description: string;
  category: string;
  visibility: ComplaintVisibility;
  target_unit_id: string | null;
  status: ComplaintStatus;
  created_at: string;
  updated_at: string;
  target_unit?: { name: string; unit_name: string | null } | null;
  complaint_evidence?: ComplaintEvidenceRecord[];
  complaint_status_history?: ComplaintStatusHistoryRecord[];
}

export interface ComplaintEvidenceRecord {
  id: string;
  complaint_id: string;
  cloudinary_public_id: string;
  created_at: string;
}

export interface ComplaintStatusHistoryRecord {
  id: string;
  complaint_id: string;
  status: ComplaintStatus;
  remark: string | null;
  changed_by: string;
  created_at: string;
  changed_by_profile?: { name: string; role: string; unit_name: string | null } | null;
}

export async function uploadEvidenceFile(file: File): Promise<{ public_id: string; format: string }> {
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error("Evidence file size exceeds 5 MB limit.");
  }

  const signRes = await fetch("/api/cloudinary/sign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder: "civicsense/complaint_evidence" }),
  });

  if (!signRes.ok) {
    const err = await signRes.json().catch(() => ({}));
    throw new Error(err.error || "Failed to obtain evidence upload signature.");
  }

  const signData = await signRes.json();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signData.apiKey);
  formData.append("timestamp", signData.timestamp);
  formData.append("signature", signData.signature);
  formData.append("folder", signData.folder);
  formData.append("type", signData.type);

  const cldRes = await fetch(`https://api.cloudinary.com/v1_1/${signData.cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });

  if (!cldRes.ok) {
    const err = await cldRes.json().catch(() => ({}));
    throw new Error(err.error?.message || "Failed to upload evidence file.");
  }

  const cldData = await cldRes.json();
  return {
    public_id: cldData.public_id,
    format: cldData.format,
  };
}

export async function submitStudentComplaint(options: {
  title: string;
  description: string;
  category: string;
  visibility: ComplaintVisibility;
  target_unit_id?: string | null;
  evidenceFiles?: File[];
}): Promise<ComplaintRecord> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) {
    throw new Error("You must be signed in with your student account to submit a complaint.");
  }

  const { title, description, category, visibility, target_unit_id, evidenceFiles } = options;
  if (!title || title.trim().length < 5) {
    throw new Error("Complaint title must be at least 5 characters.");
  }
  if (!description || description.trim().length < 8) {
    throw new Error("Complaint description must be at least 8 characters.");
  }
  if (!category) {
    throw new Error("Please select an issue category.");
  }
  if (visibility === "department" && !target_unit_id) {
    throw new Error("Please select the targeted university department.");
  }

  // Upload evidence files if provided
  const uploadedPublicIds: string[] = [];
  if (evidenceFiles && evidenceFiles.length > 0) {
    for (const f of evidenceFiles) {
      const up = await uploadEvidenceFile(f);
      uploadedPublicIds.push(up.public_id);
    }
  }

  // Insert complaint record
  const { data: complaint, error: compErr } = await supabase
    .from("complaints")
    .insert({
      student_id: user.id,
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      visibility,
      target_unit_id: visibility === "department" ? target_unit_id : null,
      status: "submitted",
    })
    .select()
    .single();

  if (compErr || !complaint) {
    throw new Error(compErr?.message || "Failed to submit complaint.");
  }

  // Insert evidence records
  if (uploadedPublicIds.length > 0) {
    const evRows = uploadedPublicIds.map((pid) => ({
      complaint_id: complaint.id,
      cloudinary_public_id: pid,
    }));
    const { error: evErr } = await supabase.from("complaint_evidence").insert(evRows);
    if (evErr) {
      console.error("Failed to insert evidence records:", evErr);
    }
  }

  // Insert initial status history record
  const { error: histErr } = await supabase.from("complaint_status_history").insert({
    complaint_id: complaint.id,
    status: "submitted",
    remark: "Complaint registered by student",
    changed_by: user.id,
  });

  if (histErr) {
    console.error("Failed to insert initial status history:", histErr);
  }

  // Insert activity log
  try {
    await supabase.from("activity_log").insert({
      actor_id: user.id,
      action: "complaint_submitted",
      target: `Complaint #${complaint.id.slice(0, 8)} (${title.slice(0, 30)}) submitted`,
    });
  } catch {}

  return complaint as ComplaintRecord;
}

export async function fetchStudentComplaints(): Promise<ComplaintRecord[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("complaints")
    .select(
      `
      id,
      student_id,
      title,
      description,
      category,
      visibility,
      target_unit_id,
      status,
      created_at,
      updated_at,
      complaint_evidence (id, complaint_id, cloudinary_public_id, created_at),
      complaint_status_history (id, complaint_id, status, remark, changed_by, created_at)
    `
    )
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Failed to fetch student complaints.");
  }

  return (data || []) as ComplaintRecord[];
}

export async function fetchDepartmentUnits(): Promise<{ id: string; name: string; unit_name: string | null; role: string }[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, unit_name, role")
    .in("role", ["department", "social_service"])
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    const res = await fetch("/api/department-units");
    if (res.ok) {
      const fallback = await res.json();
      return fallback.units || [];
    }
    return [];
  }

  return data || [];
}

export async function fetchSignedEvidenceUrl(complaintId: string, publicId: string): Promise<{ signedUrl: string; expiresAt: number }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error("Authentication required to view complaint evidence.");
  }

  const res = await fetch(
    `/api/complaint-evidence/view?complaintId=${encodeURIComponent(complaintId)}&publicId=${encodeURIComponent(publicId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Access denied to evidence file.");
  }

  return await res.json();
}

