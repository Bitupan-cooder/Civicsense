import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@supabase/supabase-js";
import type { IncomingMessage, ServerResponse } from "http";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const API_KEY = process.env.CLOUDINARY_API_KEY || "";
const API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mdywamyrxuuookaxksyv.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_97gBSZ3CLy6r0E3thRZ85Q_b7xyQxj_";

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
  secure: true,
});

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function sendJson(res: ServerResponse, status: number, data: any) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  res.end(JSON.stringify(data));
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
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    });
    res.end();
    return true;
  }

  // 1. SIGN UPLOAD ENDPOINT
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
          error: "Cloudinary credentials not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.local",
        });
      }

      // Generate signed upload parameters with type: authenticated
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

  // 1.5 DEPARTMENT UNITS LIST (PUBLIC READ FOR COMPLAINT TARGET SELECTION)
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

  // 2. VIEW ID CARD ENDPOINT (Short-lived signed URL with strict permission check)
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

      // Permission check: Requester must be the owner, administration, or an assigned/in-scope unit
      let isAllowed = false;

      if (user.id === targetUserId) {
        isAllowed = true;
      } else if (profile.role === "administration") {
        isAllowed = true;
      } else if (profile.role === "department" || profile.role === "social_service") {
        // Check if student has a visible complaint to this unit
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

      // Fetch the ID card record
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

      // Generate a short-lived signed delivery URL (valid for 10 minutes)
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

  // 3. VIEW COMPLAINT EVIDENCE ENDPOINT (Short-lived signed URL with privacy verification)
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

      // Check complaint visibility permissions according to spec
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

  return false;
}

