import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@supabase/supabase-js";
import type { IncomingMessage, ServerResponse } from "http";
import fs from "fs";
import path from "path";

// Automatically load environment files into process.env if not already set
function initEnvironment() {
  const envFiles = [".env.local", ".env", ".env.example"];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      if (typeof (process as any).loadEnvFile === "function") {
        try {
          (process as any).loadEnvFile(fullPath);
        } catch {}
      } else {
        try {
          const content = fs.readFileSync(fullPath, "utf8");
          for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) continue;
            const eqIdx = trimmed.indexOf("=");
            if (eqIdx > 0) {
              const key = trimmed.slice(0, eqIdx).trim();
              const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
              if (!process.env[key] && val) {
                process.env[key] = val;
              }
            }
          }
        } catch {}
      }
    }
  }
}
initEnvironment();

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "Root";
const API_KEY = process.env.CLOUDINARY_API_KEY || "193263864471639";
const API_SECRET = process.env.CLOUDINARY_API_SECRET || "n37r-euGAxDQZZwRKTDU707MFis";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mdywamyrxuuookaxksyv.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_97gBSZ3CLy6r0E3thRZ85Q_b7xyQxj_";

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
  secure: true,
});

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function sendJson(res: ServerResponse, status: number, data: any): boolean {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  });
  res.end(JSON.stringify(data));
  return true;
}

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

async function getRequester(req: IncomingMessage) {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !userData.user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .maybeSingle();

  return { user: userData.user, profile };
}

export async function handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    });
    res.end();
    return true;
  }

  // 1. HEALTH & DIAGNOSTICS ENDPOINT
  if (pathname === "/api/health" && req.method === "GET") {
    try {
      let supabaseOk = false;
      const { count, error } = await supabaseAdmin
        .from("profiles")
        .select("*", { count: "exact", head: true });
      if (!error) supabaseOk = true;

      const cloudinaryConfigured = Boolean(CLOUD_NAME && API_KEY && API_SECRET);
      const serviceRoleConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

      return sendJson(res, 200, {
        status: "ok",
        timestamp: new Date().toISOString(),
        supabase: {
          url: SUPABASE_URL,
          connected: supabaseOk,
          serviceRoleSet: serviceRoleConfigured,
          totalProfilesCount: count ?? null,
        },
        cloudinary: {
          configured: cloudinaryConfigured,
          cloudName: CLOUD_NAME ? CLOUD_NAME : null,
        },
      });
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Health probe failed" });
    }
  }

  // 2. CLOUDINARY AUTHENTICATED UPLOAD SIGNATURE
  if (pathname === "/api/cloudinary/sign-upload" && req.method === "POST") {
    try {
      const body = await parseBody(req).catch(() => ({}));
      const timestamp = Math.round(Date.now() / 1000);
      const folder = body && body.folder === "civicsense/complaint_evidence"
        ? "civicsense/complaint_evidence"
        : "civicsense/id_cards";
      const deliveryType = "authenticated";

      if (!API_SECRET || !API_KEY || !CLOUD_NAME) {
        return sendJson(res, 500, {
          error: "Cloudinary credentials not configured. Please verify CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.local",
        });
      }

      const paramsToSign = {
        folder,
        timestamp,
        type: deliveryType,
      };

      const signature = cloudinary.utils.api_sign_request(paramsToSign, API_SECRET);

      return sendJson(res, 200, {
        signature,
        timestamp,
        apiKey: API_KEY,
        cloudName: CLOUD_NAME,
        folder,
        type: deliveryType,
      });
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Failed to generate upload signature" });
    }
  }

  // 3. DEPARTMENT UNITS LIST (READABLE BY AUTHENTICATED USERS & FORM)
  if (pathname === "/api/department-units" && req.method === "GET") {
    try {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id, name, unit_name, role")
        .in("role", ["department", "social_service"])
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        return sendJson(res, 500, { error: error.message });
      }

      return sendJson(res, 200, { units: data || [] });
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Failed to fetch department units" });
    }
  }

  // 4. VIEW ID CARD (SHORT-LIVED SIGNED URL)
  if (pathname === "/api/id-card/view" && req.method === "GET") {
    try {
      const targetUserId = url.searchParams.get("userId");
      if (!targetUserId) {
        return sendJson(res, 400, { error: "Missing required parameter: userId" });
      }

      const requester = await getRequester(req);
      if (!requester) {
        return sendJson(res, 401, { error: "Authentication required" });
      }

      const { user, profile } = requester;
      if (!profile || !profile.is_active) {
        return sendJson(res, 403, { error: "Account inactive or unauthorized" });
      }

      let isAllowed = false;
      if (user.id === targetUserId) {
        isAllowed = true;
      } else if (profile.role === "administration") {
        isAllowed = true;
      } else if (profile.role === "department" || profile.role === "social_service") {
        const { data: visibleComplaints } = await supabaseAdmin
          .from("complaints")
          .select("id, visibility, target_unit_id")
          .eq("student_id", targetUserId);

        if (visibleComplaints && visibleComplaints.length > 0) {
          isAllowed = visibleComplaints.some((c) => {
            if (c.visibility === "social_service") return true;
            if (profile.role === "department" && c.visibility === "department") {
              return c.target_unit_id === user.id;
            }
            return false;
          });
        }
      }

      if (!isAllowed) {
        return sendJson(res, 403, {
          error: "Forbidden: You are not authorized to view this student ID card.",
        });
      }

      const { data: idCard, error: idCardErr } = await supabaseAdmin
        .from("id_cards")
        .select("cloudinary_public_id, status, reviewed_at")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (idCardErr || !idCard) {
        return sendJson(res, 404, { error: "No student ID card registered for this user." });
      }

      if (!API_SECRET || !API_KEY || !CLOUD_NAME) {
        return sendJson(res, 500, {
          error: "Cloudinary credentials not configured.",
        });
      }

      const expiresAt = Math.round(Date.now() / 1000) + 10 * 60;
      const signedUrl = cloudinary.utils.private_download_url(
        idCard.cloudinary_public_id,
        "jpg",
        {
          expires_at: expiresAt,
          attachment: false,
          type: "authenticated",
        }
      );

      return sendJson(res, 200, {
        signedUrl,
        expiresAt,
        status: idCard.status,
      });
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Failed to generate signed viewing URL" });
    }
  }

  // 5. VIEW COMPLAINT EVIDENCE (SHORT-LIVED SIGNED URL)
  if (pathname === "/api/complaint-evidence/view" && req.method === "GET") {
    try {
      const evidenceId = url.searchParams.get("evidenceId");
      const publicId = url.searchParams.get("publicId");
      const complaintId = url.searchParams.get("complaintId");

      if (!evidenceId && (!publicId || !complaintId)) {
        return sendJson(res, 400, { error: "Missing required parameter: evidenceId or (complaintId and publicId)" });
      }

      const requester = await getRequester(req);
      if (!requester) {
        return sendJson(res, 401, { error: "Authentication required" });
      }

      const { user, profile } = requester;
      if (!profile || !profile.is_active) {
        return sendJson(res, 403, { error: "Account inactive or unauthorized" });
      }

      let targetComplaintId = complaintId;
      let targetPublicId = publicId;

      if (evidenceId) {
        const { data: evRow, error: evErr } = await supabaseAdmin
          .from("complaint_evidence")
          .select("complaint_id, cloudinary_public_id")
          .eq("id", evidenceId)
          .maybeSingle();

        if (evErr || !evRow) {
          return sendJson(res, 404, { error: "Evidence record not found" });
        }
        targetComplaintId = evRow.complaint_id;
        targetPublicId = evRow.cloudinary_public_id;
      }

      const { data: compRow, error: compErr } = await supabaseAdmin
        .from("complaints")
        .select("id, student_id, visibility, target_unit_id")
        .eq("id", targetComplaintId)
        .maybeSingle();

      if (compErr || !compRow) {
        return sendJson(res, 404, { error: "Complaint not found" });
      }

      let isAllowed = false;
      if (profile.role === "student" && compRow.student_id === user.id) {
        isAllowed = true;
      } else if (profile.role === "administration") {
        isAllowed = true;
      } else if (profile.role === "social_service" && compRow.visibility === "social_service") {
        isAllowed = true;
      } else if (profile.role === "department") {
        if (compRow.visibility === "social_service") {
          isAllowed = true;
        } else if (compRow.visibility === "department") {
          if (compRow.target_unit_id === user.id) {
            isAllowed = true;
          } else if (compRow.target_unit_id && profile.unit_name) {
            const { data: targetUnitProfile } = await supabaseAdmin
              .from("profiles")
              .select("unit_name")
              .eq("id", compRow.target_unit_id)
              .maybeSingle();
            if (targetUnitProfile && targetUnitProfile.unit_name === profile.unit_name) {
              isAllowed = true;
            }
          }
        }
      }

      if (!isAllowed) {
        return sendJson(res, 403, { error: "Forbidden: Not authorized to view this complaint evidence" });
      }

      if (!API_SECRET || !API_KEY || !CLOUD_NAME) {
        return sendJson(res, 500, { error: "Cloudinary credentials not configured." });
      }

      const expiresAt = Math.round(Date.now() / 1000) + 10 * 60;
      const signedUrl = cloudinary.utils.private_download_url(
        targetPublicId!,
        "jpg",
        {
          expires_at: expiresAt,
          attachment: false,
          type: "authenticated",
        }
      );

      return sendJson(res, 200, {
        signedUrl,
        expiresAt,
        publicId: targetPublicId,
      });
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Failed to generate signed evidence URL" });
    }
  }

  // 6. COMPLAINT WORKFLOW STATUS UPDATE (DEPARTMENT / SOCIAL SERVICE / ADMIN)
  if (pathname === "/api/complaints/update-status" && req.method === "POST") {
    try {
      const requester = await getRequester(req);
      if (!requester) {
        return sendJson(res, 401, { error: "Authentication required" });
      }

      const { user, profile } = requester;
      if (!profile || !profile.is_active || profile.role === "student") {
        return sendJson(res, 403, { error: "Official redressal role required" });
      }

      const body = await parseBody(req);
      const { complaintId, status, remark, idCardStatus } = body;

      if (!complaintId) {
        return sendJson(res, 400, { error: "Missing required parameter: complaintId" });
      }

      // Fetch complaint
      const { data: complaint, error: compErr } = await supabaseAdmin
        .from("complaints")
        .select("*")
        .eq("id", complaintId)
        .maybeSingle();

      if (compErr || !complaint) {
        return sendJson(res, 404, { error: "Complaint not found" });
      }

      // Check jurisdiction
      let canUpdate = false;
      if (profile.role === "administration") {
        canUpdate = true;
      } else if (profile.role === "social_service" && complaint.visibility === "social_service") {
        canUpdate = true;
      } else if (profile.role === "department") {
        if (complaint.visibility === "social_service") {
          canUpdate = true;
        } else if (complaint.visibility === "department" && (complaint.target_unit_id === user.id || !complaint.target_unit_id)) {
          canUpdate = true;
        }
      }

      if (!canUpdate) {
        return sendJson(res, 403, { error: "Unauthorized: You do not have permission to update this grievance." });
      }

      // Optional: Verify ID card if requested
      if (idCardStatus && (idCardStatus === "verified" || idCardStatus === "not_valid")) {
        await supabaseAdmin
          .from("id_cards")
          .update({
            status: idCardStatus,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", complaint.student_id);

        await supabaseAdmin.from("activity_log").insert({
          actor_id: user.id,
          action: "id_card_review",
          target: `Marked student ID card as ${idCardStatus} for user ${complaint.student_id.slice(0, 8)}`,
        });
      }

      // Update complaint status if provided
      if (status) {
        const validStatuses = ["submitted", "under_verification", "accepted", "in_progress", "resolved", "rejected"];
        if (!validStatuses.includes(status)) {
          return sendJson(res, 400, { error: "Invalid status value: " + status });
        }

        if (status === "rejected" && (!remark || remark.trim().length < 5)) {
          return sendJson(res, 400, { error: "Rejection requires an explanatory remark (minimum 5 characters)." });
        }

        await supabaseAdmin
          .from("complaints")
          .update({
            status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", complaintId);

        await supabaseAdmin.from("complaint_status_history").insert({
          complaint_id: complaintId,
          status,
          remark: remark ? remark.trim() : null,
          changed_by: user.id,
        });

        await supabaseAdmin.from("activity_log").insert({
          actor_id: user.id,
          action: "complaint_status_update",
          target: `Updated complaint #${complaintId.slice(0, 8)} to ${status}: ${remark || "No note"}`,
        });
      }

      return sendJson(res, 200, {
        success: true,
        complaintId,
        newStatus: status || complaint.status,
      });
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Failed to update complaint" });
    }
  }

  // 7. ADMIN USER PROVISIONING (CREATE DEPARTMENT / SOCIAL SERVICE ACCOUNTS)
  if (pathname === "/api/admin/create-official" && req.method === "POST") {
    try {
      const requester = await getRequester(req);
      if (!requester || requester.profile?.role !== "administration") {
        return sendJson(res, 403, { error: "Administration privileges required" });
      }

      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return sendJson(res, 500, {
          error: "Supabase Service Role Key is required to provision accounts. Please add SUPABASE_SERVICE_ROLE_KEY to .env.local",
        });
      }

      const body = await parseBody(req);
      const { name, email, role, unitName, temporaryPassword } = body;

      if (!name || !email || !role || !temporaryPassword) {
        return sendJson(res, 400, { error: "Missing required fields: name, email, role, temporaryPassword" });
      }

      if (role !== "department" && role !== "social_service") {
        return sendJson(res, 400, { error: "Can only provision department or social_service accounts" });
      }

      // Create Auth user with admin API
      const { data: authUser, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: { role, name, unit_name: unitName || null },
      });

      if (createAuthErr || !authUser.user) {
        return sendJson(res, 400, { error: createAuthErr?.message || "Failed to create authentication user" });
      }

      // Insert profile record
      const { error: profileErr } = await supabaseAdmin.from("profiles").insert({
        id: authUser.user.id,
        role,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        unit_name: unitName ? unitName.trim() : null,
        must_change_password: true,
        is_active: true,
      });

      if (profileErr) {
        // Rollback created user on failure
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        return sendJson(res, 500, { error: "Failed to create profile row: " + profileErr.message });
      }

      await supabaseAdmin.from("activity_log").insert({
        actor_id: requester.user.id,
        action: "official_account_created",
        target: `Created ${role} account for ${name} (${email}) under ${unitName || "Central"}`,
      });

      return sendJson(res, 201, {
        success: true,
        user: {
          id: authUser.user.id,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          unitName: unitName || null,
        },
      });
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Failed to provision official account" });
    }
  }

  // 8. ADMIN USER DEACTIVATION / ACTIVATION
  if (pathname === "/api/admin/toggle-active" && req.method === "POST") {
    try {
      const requester = await getRequester(req);
      if (!requester || requester.profile?.role !== "administration") {
        return sendJson(res, 403, { error: "Administration privileges required" });
      }

      const body = await parseBody(req);
      const { userId, isActive } = body;

      if (!userId || typeof isActive !== "boolean") {
        return sendJson(res, 400, { error: "Missing required fields: userId, isActive" });
      }

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (error) {
        return sendJson(res, 500, { error: error.message });
      }

      await supabaseAdmin.from("activity_log").insert({
        actor_id: requester.user.id,
        action: isActive ? "account_activated" : "account_deactivated",
        target: `Set account ${userId.slice(0, 8)} status to ${isActive ? "Active" : "Inactive"}`,
      });

      return sendJson(res, 200, { success: true, userId, isActive });
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Failed to update account state" });
    }
  }

  // 9. ADMIN REASSIGN COMPLAINT TO ANOTHER UNIT
  if (pathname === "/api/admin/reassign-complaint" && req.method === "POST") {
    try {
      const requester = await getRequester(req);
      if (!requester || requester.profile?.role !== "administration") {
        return sendJson(res, 403, { error: "Administration privileges required" });
      }

      const body = await parseBody(req);
      const { complaintId, targetUnitId, remark } = body;

      if (!complaintId || !targetUnitId) {
        return sendJson(res, 400, { error: "Missing required fields: complaintId, targetUnitId" });
      }

      const { error } = await supabaseAdmin
        .from("complaints")
        .update({
          target_unit_id: targetUnitId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", complaintId);

      if (error) {
        return sendJson(res, 500, { error: error.message });
      }

      await supabaseAdmin.from("complaint_status_history").insert({
        complaint_id: complaintId,
        status: "in_progress",
        remark: remark ? `Reassigned: ${remark}` : "Complaint reassigned to new department unit by Administration",
        changed_by: requester.user.id,
      });

      await supabaseAdmin.from("activity_log").insert({
        actor_id: requester.user.id,
        action: "complaint_reassigned",
        target: `Reassigned complaint #${complaintId.slice(0, 8)} to unit ${targetUnitId.slice(0, 8)}`,
      });

      return sendJson(res, 200, { success: true, complaintId, targetUnitId });
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Failed to reassign complaint" });
    }
  }

  // 10. ACTIVITY LOG RETRIEVAL
  if (pathname === "/api/activity-logs" && req.method === "GET") {
    try {
      const requester = await getRequester(req);
      if (!requester || requester.profile?.role !== "administration") {
        return sendJson(res, 403, { error: "Administration privileges required" });
      }

      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);

      const { data, error } = await supabaseAdmin
        .from("activity_log")
        .select("id, actor_id, action, target, created_at, actor:profiles!actor_id(name, email, role, unit_name)")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        return sendJson(res, 500, { error: error.message });
      }

      return sendJson(res, 200, { logs: data || [] });
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Failed to fetch activity logs" });
    }
  }

  return false;
}
