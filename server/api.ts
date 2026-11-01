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
      const timestamp = Math.round(Date.now() / 1000);
      const folder = "civicsense/id_cards";
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

  return false;
}
