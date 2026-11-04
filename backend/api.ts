import { v2 as cloudinary } from "cloudinary";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { IncomingMessage, ServerResponse } from "http";
import fs from "fs";
import { locationLabel, resolveLocationId } from "../src/locations.ts";
import { validateSubmission } from "./submission.ts";
import { deadlinePlan } from "./maintenance.ts";
import { canAccessComplaint } from "./access.ts";
import { campusPlaceNames, embedText, translateReply, understandComplaint } from "./ai.ts";
import { applyRules, AUTO_CLOSE_DAYS, CATEGORIES, CATEGORY_LABELS, DUPLICATE_THRESHOLD, messages, routeComplaint, STATUS_NAMES, textSimilarity, ticketRef, type Message } from "../src/logic.ts";
import { ATTEMPTS_PER_DAY, bestMatch, initialSignalStatus, makeLinkToken, parseEmbedding, PLATFORM_NAMES, readLinkToken, sendChatMessage, sendDirectMessage, signalVisibleTo, SIGNAL_CORROBORATION, TAGS_PER_DAY, type Platform, type Tag } from "./chat.ts";

// Secrets come only from the environment or git-ignored .env files. Never hardcode fallbacks here.
for (const file of process.env.NODE_ENV === 'test' ? [] : [".env.local", ".env"]) {
  if (fs.existsSync(file)) process.loadEnvFile(file);
}

const REQUIRED_ENV = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.warn(`[api] Not configured, /api/* will return 500. Missing in .env.local: ${missingEnv.join(", ")}`);
}

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME!;
const API_KEY = process.env.CLOUDINARY_API_KEY!;
const API_SECRET = process.env.CLOUDINARY_API_SECRET!;

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
  secure: true,
});

let supabaseAdmin!: SupabaseClient;
if (!missingEnv.length) {
  supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const MAX_BODY_BYTES = 64 * 1024;

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
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_BYTES) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
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

type Requester = NonNullable<Awaited<ReturnType<typeof getRequester>>>;

async function requesterCanAccess(requester: Requester, complaint: any): Promise<boolean> {
  const { user, profile } = requester;
  let targetUnitName: string | null = null;
  if (profile.role === "department" && complaint.target_unit_id && complaint.target_unit_id !== user.id) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("unit_name")
      .eq("id", complaint.target_unit_id)
      .maybeSingle();
    targetUnitName = data?.unit_name ?? null;
  }
  const viewer = { id: user.id, role: profile.role, unit_name: profile.unit_name };
  if (canAccessComplaint(viewer, complaint, targetUnitName)) return true;
  return !!complaint.id && (await myRoutes(requester, complaint.id)).length > 0;
}

// ── PRD routing: posts (authorities), complaint_routes, AI pipeline (backend/migrations/001_ai_routing_tracker.sql) ──

let routingInstalled: boolean | null = null;
/** false until migration 001 has been run; the routing/AI features then stay off and nothing else changes. */
async function isRoutingInstalled(): Promise<boolean> {
  if (routingInstalled) return true;
  // not head:true: for a missing table that returns status 204 with no error
  const checks = await Promise.all([
    supabaseAdmin.from("complaint_routes").select("id").limit(1),
    supabaseAdmin.from("complaints").select("ai_category, hide_name_from_union, possible_duplicate_of").limit(1),
    supabaseAdmin.from("notifications").select("id").limit(1),
    supabaseAdmin.from("complaint_replies").select("id").limit(1),
  ]);
  routingInstalled = checks.every((c) => !c.error);
  return routingInstalled;
}

/** Account ids holding these posts (by user_id, or a profile whose email is the post's email). */
async function postHolderIds(authorityIds: string[]): Promise<string[]> {
  if (!authorityIds.length) return [];
  const { data: posts } = await supabaseAdmin.from("authorities").select("user_id, email").in("id", authorityIds).eq("active", true);
  const ids = new Set((posts || []).map((p: any) => p.user_id).filter(Boolean));
  const emails = (posts || []).map((p: any) => (p.email || "").toLowerCase()).filter(Boolean);
  if (emails.length) {
    const { data: holders } = await supabaseAdmin.from("profiles").select("id, email").neq("role", "student").eq("is_active", true);
    for (const h of holders || []) if (emails.includes((h.email || "").toLowerCase())) ids.add(h.id);
  }
  return [...ids];
}

/** In-app notification (PRD), pushed live through Supabase Realtime. Failures never block the action itself. */
async function notify(userIds: string[], complaintId: string | null, msg: Message): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return;
  const { error } = await supabaseAdmin.from("notifications").insert(unique.map((user_id) => ({ user_id, complaint_id: complaintId, message_en: msg.en, message_as: msg.as })));
  if (error) console.error("[api] notification failed:", error.message);
}

async function notifyRoutedPosts(complaintId: string, authorityIds: string[], exceptUserId: string | null = null): Promise<void> {
  const { data: posts } = await supabaseAdmin.from("authorities").select("id, post_title").in("id", authorityIds);
  for (const p of posts || []) {
    const holders = (await postHolderIds([p.id])).filter((id) => id !== exceptUserId);
    await notify(holders, complaintId, messages.routedToPost(ticketRef(complaintId), p.post_title));
  }
}

let lastAutoClose = 0;
/** PRD: a complaint resolved 7 days ago with no answer from the reporter closes automatically. Runs at most hourly. */
async function autoCloseResolved(): Promise<void> {
  if (Date.now() - lastAutoClose < 3600e3 || !(await isRoutingInstalled())) return;
  lastAutoClose = Date.now();
  const cutoff = new Date(Date.now() - AUTO_CLOSE_DAYS * 86400e3).toISOString();
  const { data: due } = await supabaseAdmin.from("complaints").select("id, student_id").eq("status", "resolved").lt("resolved_at", cutoff);
  for (const c of due || []) {
    const now = new Date().toISOString();
    const closed = await supabaseAdmin.from("complaints").update({ status: "closed", closed_at: now, updated_at: now }).eq("id", c.id).eq("status", "resolved").select("id");
    if (closed.error) throw new Error(closed.error.message);
    if (!closed.data?.length) continue;
    await supabaseAdmin.from("complaint_status_history").insert({ complaint_id: c.id, status: "closed", remark: `Closed automatically ${AUTO_CLOSE_DAYS} days after resolution.`, changed_by: null });
    await notify([c.student_id, ...(await mergedReporterIds(c.id))], c.id, messages.autoClosed(ticketRef(c.id)));
  }
}

let maintenanceRun: Promise<{ escalated: number }> | null = null;
export function runMaintenance(): Promise<{ escalated: number }> {
  if (maintenanceRun) return maintenanceRun;
  maintenanceRun = (async () => {
    if (missingEnv.length || !(await isRoutingInstalled())) throw new Error('Routing is not configured.');
    await autoCloseResolved();
    const [cases, config, posts] = await Promise.all([
      supabaseAdmin.from('complaints').select('id, status, priority, is_sensitive, created_at, ai_category, student_id').in('status', ['submitted', 'under_verification', 'accepted', 'in_progress']),
      supabaseAdmin.from('routing_rules').select('*').eq('active', true),
      supabaseAdmin.from('authorities').select('id, post_key').eq('active', true),
    ]);
    if (cases.error || config.error || posts.error) throw new Error('Unable to read maintenance queue.');
    const head = posts.data.find((p: any) => p.post_key === 'head')?.id;
    const vp = posts.data.find((p: any) => p.post_key === 'vice_president')?.id;
    let escalated = 0;
    for (const c of cases.data) {
      const rule = config.data.find((r: any) => r.category === c.ai_category);
      if (!rule || !head) continue;
      const plan = deadlinePlan(c, rule.response_hours);
      if (!plan.overdue) continue;
      const targets = plan.headOnly || plan.finalStage || rule.primary_authority_id === head
        ? [head] : [...new Set([rule.escalate_to_id, vp].filter(Boolean))];
      // Once per day and stage, persisted independently of process restarts.
      const marker = `Deadline ${c.id} ${new Date().toISOString().slice(0, 10)} ${targets.join(',')}`;
      const prior = await supabaseAdmin.from('activity_log').select('id').eq('action', 'complaint_escalated').eq('target', marker).limit(1);
      if (prior.error) throw new Error(prior.error.message);
      if (prior.data?.length) continue;
      const routed = await supabaseAdmin.from('complaint_routes').upsert(targets.map((authority_id) => ({ complaint_id: c.id, authority_id, kind: 'escalation' })), { onConflict: 'complaint_id,authority_id', ignoreDuplicates: true });
      if (routed.error) throw new Error(routed.error.message);
      const logged = await supabaseAdmin.from('activity_log').insert({ actor_id: c.student_id, action: 'complaint_escalated', target: marker });
      if (logged.error) throw new Error(logged.error.message);
      await notify(await postHolderIds(targets), c.id, { en: `${ticketRef(c.id)} is overdue. Please review and respond.`, as: `${ticketRef(c.id)}ৰ সময়সীমা পাৰ হৈছে। অনুগ্ৰহ কৰি পৰীক্ষা কৰি উত্তৰ দিয়ক।` });
      escalated++;
    }
    return { escalated };
  })().finally(() => { maintenanceRun = null; });
  return maintenanceRun;
}

/** Posts held by the requester: linked by user_id, or by the post's email matching their login email. */
async function myAuthorityIds(requester: Requester): Promise<string[]> {
  if (requester.profile.role === "student" || !(await isRoutingInstalled())) return [];
  const { data } = await supabaseAdmin.from("authorities").select("id, user_id, email").eq("active", true);
  // the verified login email, not profiles.email (users can edit their own profile row)
  const email = (requester.user.email || "").toLowerCase();
  return (data || []).filter((a: any) => a.user_id === requester.user.id || (a.email && a.email.toLowerCase() === email)).map((a: any) => a.id);
}

async function myRoutes(requester: Requester, complaintId: string): Promise<{ id: string; kind: string }[]> {
  const ids = await myAuthorityIds(requester);
  if (!ids.length) return [];
  const { data } = await supabaseAdmin.from("complaint_routes").select("id, kind").eq("complaint_id", complaintId).in("authority_id", ids);
  return data || [];
}

async function routesWithPosts(complaintId: string) {
  const { data } = await supabaseAdmin
    .from("complaint_routes")
    .select("kind, delivered_at, seen_at, replied_at, resolved_at, authority:authorities(post_title, person_name)")
    .eq("complaint_id", complaintId)
    .order("kind", { ascending: false });
  return (data || []).map((r: any) => ({ ...r, post_title: r.authority?.post_title, person_name: r.authority?.person_name, authority: undefined }));
}

/** Creates the recipients' complaint_routes rows (existing ones are kept). */
async function insertRoutes(complaintId: string, category: string, headOnly: boolean): Promise<void> {
  const [{ data: rules }, { data: head }] = await Promise.all([
    supabaseAdmin.from("routing_rules").select("category, primary_authority_id, copy_authority_ids").eq("active", true),
    supabaseAdmin.from("authorities").select("id").eq("post_key", "head").maybeSingle(),
  ]);
  if (!head) throw new Error("Routing is not seeded: no 'head' authority.");
  if (headOnly) {
    const removed = await supabaseAdmin.from("complaint_routes").delete().eq("complaint_id", complaintId).neq("authority_id", head.id);
    if (removed.error) throw new Error("Could not restrict sensitive complaint routes.");
  }
  const routes = routeComplaint(category, headOnly, rules || [], head.id);
  const stale = await supabaseAdmin.from('complaint_routes').delete().eq('complaint_id', complaintId).not('authority_id', 'in', `(${routes.map((r) => r.authority_id).join(',')})`);
  if (stale.error) throw new Error('Could not replace previous complaint routes.');
  const { error } = await supabaseAdmin
    .from("complaint_routes")
    .upsert(routes.map((r) => ({ complaint_id: complaintId, authority_id: r.authority_id, kind: r.kind })), { onConflict: "complaint_id,authority_id", ignoreDuplicates: false });
  if (error) throw new Error("Failed to route complaint: " + error.message);
}

/** First image attached to the complaint, for the multimodal call. Skipped quietly when unavailable. */
async function firstEvidenceImage(complaintId: string): Promise<{ mimeType: string; base64: string } | null> {
  if (!process.env.GEMINI_API_KEY) return null;
  try {
    const { data } = await supabaseAdmin.from("complaint_evidence").select("cloudinary_public_id").eq("complaint_id", complaintId).limit(1);
    if (!data?.length) return null;
    const url = cloudinary.utils.private_download_url(data[0].cloudinary_public_id, "jpg", { expires_at: Math.round(Date.now() / 1000) + 300, attachment: false, type: "authenticated" });
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const mimeType = res.headers.get("content-type") || "";
    if (!res.ok || !mimeType.startsWith("image/")) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > 4 * 1024 * 1024) return null;
    return { mimeType, base64: bytes.toString("base64") };
  } catch {
    return null;
  }
}

/**
 * PRD "AI design" 4: embed the English summary plus the original text and look for an open complaint in the same
 * category and campus area. A match is only flagged for the administration; nothing is merged automatically.
 * Without Gemini, word overlap is used instead (same language only).
 */
async function flagPossibleDuplicate(c: any, actorId: string): Promise<{ id: string; score: number } | null> {
  const text = (c.summary_en || "") + "\n" + c.title + "\n" + c.description;
  const { values, attempt } = await embedText(text);
  if (attempt) await supabaseAdmin.from("ai_logs").insert({ ...attempt, complaint_id: c.id });
  let best: { id: string; score: number } | null = null;
  if (values) {
    await supabaseAdmin.from("complaints").update({ embedding: JSON.stringify(values) }).eq("id", c.id);
    const { data } = await supabaseAdmin.rpc("match_duplicates", { p_complaint_id: c.id, p_limit: 1 });
    if (data?.[0] && data[0].score >= DUPLICATE_THRESHOLD.embedding) best = { id: data[0].id, score: data[0].score };
  } else {
    let query = supabaseAdmin.from("complaints").select("id, title, description, summary_en, location_id")
      .eq("ai_category", c.ai_category).neq("id", c.id).not("status", "in", "(closed,merged,rejected,resolved)").limit(200);
    if (c.location_id) query = query.or(`location_id.is.null,location_id.eq.${c.location_id}`);
    const { data } = await query;
    for (const o of data || []) {
      const score = textSimilarity(text, (o.summary_en || "") + "\n" + o.title + "\n" + o.description);
      if (score >= DUPLICATE_THRESHOLD.words && (!best || score > best.score)) best = { id: o.id, score };
    }
  }
  if (!best) return null;
  await supabaseAdmin.from("complaints").update({ possible_duplicate_of: best.id, duplicate_score: best.score }).eq("id", c.id);
  await supabaseAdmin.from("activity_log").insert({
    actor_id: actorId, action: "possible_duplicate",
    target: `Complaint #${c.id.slice(0, 8)} may duplicate #${best.id.slice(0, 8)} (similarity ${best.score.toFixed(2)})`,
  });
  return best;
}

/** Reporters of complaints merged into this one: they receive every update of the surviving complaint (PRD). */
async function mergedReporterIds(complaintId: string): Promise<string[]> {
  const { data } = await supabaseAdmin.from("complaints").select("student_id").eq("duplicate_of", complaintId);
  return (data || []).map((x: any) => x.student_id);
}

/** PRD steps 2-3: understand the complaint, apply the code rules, save the AI fields, then route it or send it to review. */
async function analyseAndRoute(complaint: any, location: string | null, hideName: boolean | null, actorId: string) {
  const text = `${complaint.title}\n${complaint.description}`;
  const ai = await understandComplaint({ text, location: locationLabel(location), image: await firstEvidenceImage(complaint.id) });
  await supabaseAdmin.from("ai_logs").insert(ai.attempts.map((a) => ({ ...a, complaint_id: complaint.id })));

  const r = applyRules(ai.understanding, text, campusPlaceNames());
  if (ai.failed) { r.needs_review = true; r.review_reason = "AI call failed; analysed by keyword rules"; }

  const { error } = await supabaseAdmin.from("complaints").update({
    location_id: resolveLocationId(location) || location || complaint.location_id || null,
    ...(hideName === null ? {} : { hide_name_from_union: hideName }),
    input_language: r.language, is_complaint: r.is_complaint, ai_category: r.category, priority: r.priority,
    is_sensitive: r.is_sensitive, location_text: r.location_text, summary_en: r.summary_en, summary_as: r.summary_as,
    image_findings: r.image_findings, confidence: r.confidence, ai_source: ai.source, analysed_at: new Date().toISOString(),
    ...(r.head_only || r.needs_review ? { visibility: "administration", target_unit_id: null } : {}),
    ...(r.needs_review ? { status: "needs_review" } : complaint.status === "needs_review" ? { status: "submitted" } : {}),
    updated_at: new Date().toISOString(),
  }).eq("id", complaint.id);
  if (error) throw new Error("Failed to save AI analysis: " + error.message);
  const duplicate = await flagPossibleDuplicate(
    { ...complaint, ai_category: r.category, location_id: resolveLocationId(location) || location || complaint.location_id || null, summary_en: r.summary_en }, actorId);

  if (r.needs_review) {
    await supabaseAdmin.from("complaint_status_history").insert({ complaint_id: complaint.id, status: "needs_review", remark: "Sent to administration review: " + r.review_reason, changed_by: actorId });
  } else {
    await insertRoutes(complaint.id, r.category, r.head_only);
  }
  const routes = await routesWithPosts(complaint.id);
  await supabaseAdmin.from("activity_log").insert({
    actor_id: actorId,
    action: r.needs_review ? "complaint_needs_review" : "complaint_routed",
    target: r.needs_review
      ? `Complaint #${complaint.id.slice(0, 8)} sent to review (${r.review_reason})`
      : `Complaint #${complaint.id.slice(0, 8)} analysed as ${r.category} P${r.priority} and routed to ${routes.map((x) => x.post_title).join(", ")}`,
  });
  const ref = ticketRef(complaint.id);
  if (r.needs_review) {
    await notify([complaint.student_id], complaint.id, messages.inReview(ref));
  } else {
    await notify([complaint.student_id], complaint.id, messages.routedToReporter(ref, routes.map((x) => x.post_title)));
    const { data: rows } = await supabaseAdmin.from("complaint_routes").select("authority_id").eq("complaint_id", complaint.id);
    await notifyRoutedPosts(complaint.id, (rows || []).map((x: any) => x.authority_id));
  }
  return {
    category: r.category, priority: r.priority, is_sensitive: r.is_sensitive, location_text: r.location_text,
    summary_en: r.summary_en, summary_as: r.summary_as, image_findings: r.image_findings, confidence: r.confidence,
    language: r.language, source: ai.source, needs_review: r.needs_review, review_reason: r.review_reason, routes,
    possible_duplicate_of: duplicate?.id ?? null,
  };
}

// ── Agent tag (migration 002): issues raised by tagging the bot in Telegram / Discord groups. Listeners: chatbots.ts ──

let signalsInstalled: boolean | null = null;
async function isSignalsInstalled(): Promise<boolean> {
  if (signalsInstalled) return true;
  const checks = await Promise.all(["chat_links", "signals", "signal_supporters"].map((t) => supabaseAdmin.from(t).select("*").limit(1)));
  signalsInstalled = checks.every((c) => !c.error) && (await isRoutingInstalled());
  return signalsInstalled;
}

const SIGNAL_COLS = "id, platform, chat_id, chat_title, message_id, text, summary_en, summary_as, ai_category, priority, is_sensitive, location_text, confidence, authority_ids, status, complaint_id, handled_note, handled_at, created_at";
const daysAgo = (days: number) => new Date(Date.now() - days * 86400e3).toISOString();
const siteUrl = () => (process.env.PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const botConfigured = (p: Platform) => !!(p === "telegram" ? process.env.TELEGRAM_BOT_TOKEN : process.env.DISCORD_BOT_TOKEN);

// ponytail: in-memory, resets on restart; the durable per-student limit is TAGS_PER_DAY in signal_supporters.
const tagAttempts = new Map<string, number[]>();
function tooManyAttempts(key: string): boolean {
  const recent = (tagAttempts.get(key) || []).filter((t) => t > Date.now() - 86400e3);
  recent.push(Date.now());
  tagAttempts.set(key, recent);
  return recent.length > ATTEMPTS_PER_DAY;
}

function linkMessage(tag: Tag): string {
  const token = makeLinkToken(tag.platform, tag.userId, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  return `Link your CivicSense student account to report from ${PLATFORM_NAMES[tag.platform]}. Open this link while signed in on CivicSense. It is only for you and works for 30 minutes:\n${siteUrl()}/login?link=${encodeURIComponent(token)}`;
}

/** Post titles in the order of the ids (primary post first). */
async function postTitles(ids: string[]): Promise<string[]> {
  if (!ids.length) return [];
  const { data } = await supabaseAdmin.from("authorities").select("id, post_title").in("id", ids);
  const byId = new Map((data || []).map((a: any) => [a.id, a.post_title]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as string[];
}

async function tagsToday(studentId: string): Promise<number> {
  const { data } = await supabaseAdmin.from("signal_supporters").select("signal_id").eq("student_id", studentId).gte("created_at", daysAgo(1));
  return data?.length || 0;
}

async function supporterIds(signalId: string): Promise<string[]> {
  const { data } = await supabaseAdmin.from("signal_supporters").select("student_id").eq("signal_id", signalId).order("created_at");
  return (data || []).map((x: any) => x.student_id);
}

async function notifySignalPosts(s: any, students: number): Promise<void> {
  await notify(await postHolderIds(s.authority_ids), null, messages.signalRaised(s.chat_title || PLATFORM_NAMES[s.platform as Platform], s.summary_en || s.text, students));
}

/** Adds the student's +1; a pending signal moves to its posts once SIGNAL_CORROBORATION students raised it. */
async function supportSignal(s: any, studentId: string): Promise<TagResult> {
  if ((await tagsToday(studentId)) >= TAGS_PER_DAY) return { public: `You have raised ${TAGS_PER_DAY} issues today, the daily limit. Please use the CivicSense website for more.` };
  const added = await supabaseAdmin.from("signal_supporters").insert({ signal_id: s.id, student_id: studentId });
  if (added.error?.code === "23505") return { public: "You have already raised this one. Thanks!" };
  if (added.error) throw new Error(added.error.message);
  const students = (await supporterIds(s.id)).length;
  const posts = await postTitles(s.authority_ids);
  if (s.status === "pending" && students >= SIGNAL_CORROBORATION) {
    const { data } = await supabaseAdmin.from("signals").update({ status: "open", updated_at: new Date().toISOString() }).eq("id", s.id).eq("status", "pending").select("id");
    if (data?.length) {
      await notifySignalPosts(s, students);
      return { public: `${students} students have raised this. Sent to ${posts.join(", ")}.` };
    }
  }
  return { public: `+1 recorded: ${students} students have raised this${s.status === "pending" ? "" : ` with ${posts[0]}`}.` };
}

export interface TagResult {
  /** posted in the group as a reply to the tag */
  public?: string;
  /** sent to the tagger only */
  private?: string;
  /** a new signal: the adapter saves the id of its public reply, so "+1" replies to it count */
  signalId?: string;
}

/**
 * One tag from a group. Guardrails, in order: linked and active student account, attempt limit, minimum length,
 * daily limit, AI check (not a complaint → nothing stored), already an open complaint or earlier signal (→ +1),
 * sensitive (→ Head only, nothing posted in the group), corroboration before non-urgent issues reach a post.
 */
export async function handleTag(tag: Tag): Promise<TagResult> {
  if (missingEnv.length || !(await isSignalsInstalled())) return tag.kind === "private" ? { private: "CivicSense group reporting is not set up yet." } : {};
  const { data: link } = await supabaseAdmin.from("chat_links").select("student_id").eq("platform", tag.platform).eq("external_user_id", tag.userId).maybeSingle();
  const { data: student } = link ? await supabaseAdmin.from("profiles").select("id, name, role, is_active").eq("id", link.student_id).maybeSingle() : { data: null };
  const linked = student?.role === "student" && student.is_active;

  if (tag.kind === "private") {
    return { private: linked
      ? `You're linked as ${student.name}. Tag me in a campus group to raise an issue, for example "@CivicSense no water in Hostel 3 since morning". Students who are also affected can reply to my answer with +1.`
      : linkMessage(tag) };
  }
  if (tooManyAttempts(`${tag.platform}:${tag.userId}`)) return {};
  if (!linked) {
    return {
      public: tag.platform === "telegram"
        ? `To report through CivicSense, link your student account first: open https://t.me/${tag.botName}?start=link and press Start.`
        : "To report through CivicSense, link your student account first. I've sent you a private message with a link.",
      private: linkMessage(tag),
    };
  }

  if (tag.kind === "support") {
    const { data: s } = await supabaseAdmin.from("signals").select(SIGNAL_COLS)
      .eq("platform", tag.platform).eq("chat_id", tag.chatId).eq("bot_message_id", tag.replyToBotMessageId!).maybeSingle();
    if (!s || s.status === "dismissed") return {};
    if (s.status === "converted" && s.complaint_id) return { public: `This is already official complaint ${ticketRef(s.complaint_id)}.` };
    return supportSignal(s, student.id);
  }

  const text = tag.text.normalize("NFC").slice(0, 2000);
  if (text.length < 8) return { public: "Tell me what is wrong and where, for example \"no water in Hostel 3 since morning\". Or tag me in a reply to the message that describes it." };
  if ((await tagsToday(student.id)) >= TAGS_PER_DAY) return { public: `You have raised ${TAGS_PER_DAY} issues today, the daily limit. Please use the CivicSense website for more.` };

  const ai = await understandComplaint({ text, location: null, image: null });
  await supabaseAdmin.from("ai_logs").insert(ai.attempts.map((a) => ({ ...a, complaint_id: null })));
  const r = applyRules(ai.understanding, text, campusPlaceNames());
  if (ai.failed) r.needs_review = true;
  if (!r.is_complaint) return { public: "This doesn't look like a campus problem I can pass on. Say what is broken and where." };

  const mine = { text: `${r.summary_en}\n${text}`, embedding: null as number[] | null };
  if (!r.is_sensitive) {
    const { values, attempt } = await embedText(mine.text);
    if (attempt) await supabaseAdmin.from("ai_logs").insert({ ...attempt, complaint_id: null });
    mine.embedding = values;

    const { data: open } = await supabaseAdmin.from("complaints").select("id, status, title, description, summary_en, embedding")
      .eq("ai_category", r.category).eq("is_sensitive", false).in("status", ["submitted", "under_verification", "accepted", "in_progress"])
      .gte("created_at", daysAgo(60)).order("created_at", { ascending: false }).limit(100);
    const complaint = bestMatch(open, mine, (c: any) => ({ text: `${c.summary_en || ""}\n${c.title}\n${c.description}`, embedding: parseEmbedding(c.embedding) }));
    if (complaint) return { public: `This is already official complaint ${ticketRef(complaint.id)} (${STATUS_NAMES[complaint.status]?.en ?? complaint.status}). Officials are working on it; you can follow it on CivicSense.` };

    // raised before, in this or another group: count it as a +1
    const { data: earlier } = await supabaseAdmin.from("signals").select(SIGNAL_COLS + ", embedding")
      .eq("ai_category", r.category).eq("is_sensitive", false).in("status", ["pending", "open", "acknowledged"])
      .gte("created_at", daysAgo(7)).order("created_at", { ascending: false }).limit(50);
    const same = bestMatch(earlier, mine, (s: any) => ({ text: `${s.summary_en || ""}\n${s.text}`, embedding: parseEmbedding(s.embedding) }));
    if (same) return supportSignal(same, student.id);
  }

  const [{ data: rules }, { data: head }] = await Promise.all([
    supabaseAdmin.from("routing_rules").select("category, primary_authority_id, copy_authority_ids").eq("active", true),
    supabaseAdmin.from("authorities").select("id").eq("post_key", "head").maybeSingle(),
  ]);
  if (!head) throw new Error("Routing is not seeded: no 'head' authority.");
  const authorityIds = routeComplaint(r.category, r.head_only, rules || [], head.id).map((x) => x.authority_id);
  const status = initialSignalStatus(r);
  const { data: s, error } = await supabaseAdmin.from("signals").insert({
    platform: tag.platform, chat_id: tag.chatId, chat_title: tag.chatTitle, message_id: tag.messageId, text,
    summary_en: r.summary_en, summary_as: r.summary_as, ai_category: r.category, priority: r.priority, is_sensitive: r.is_sensitive,
    location_text: r.location_text, confidence: r.confidence, embedding: mine.embedding, authority_ids: authorityIds, status,
  }).select(SIGNAL_COLS).single();
  if (error) throw new Error("Failed to save signal: " + error.message);
  const supported = await supabaseAdmin.from("signal_supporters").insert({ signal_id: s.id, student_id: student.id });
  if (supported.error) throw new Error(supported.error.message);
  await supabaseAdmin.from("activity_log").insert({
    actor_id: student.id, action: "signal_raised",
    target: `Signal from ${PLATFORM_NAMES[tag.platform]} group "${tag.chatTitle || tag.chatId}": ${r.category} P${r.priority}, ${status}`,
  });

  const posts = await postTitles(authorityIds);
  if (status === "open") await notifySignalPosts(s, 1);
  if (r.is_sensitive) {
    return { private: `Received. This was sent privately to ${posts.join(", ")} only, and nothing about it is posted in the group. Your message is still visible there, so you may want to delete it. You can also report it on CivicSense: ${siteUrl()}/report/new` };
  }
  return {
    public: status === "open"
      ? `Noted and sent to ${posts.join(", ")}. Also affected? Reply to this message with +1.`
      : `Noted (${CATEGORY_LABELS[r.category]}). It goes to ${posts[0]} once one more student confirms: reply to this message with +1.`,
    signalId: s.id,
  };
}

/** Remembers the bot's public reply to a new signal, so "+1" replies to it count as support. */
export async function saveBotMessage(signalId: string, botMessageId: string): Promise<void> {
  await supabaseAdmin.from("signals").update({ bot_message_id: botMessageId }).eq("id", signalId);
}

/** Admin account-management routes may only act on department / social_service accounts, never on admins or students. */
async function isManagedOfficial(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from("profiles").select("role").eq("id", userId).maybeSingle();
  return data?.role === "department" || data?.role === "social_service";
}

/**
 * Officials may see a student's identity (ID card) only through a complaint whose reporter they may see:
 * mirrors public.can_see_reporter(). With "hide my name from the student union", union posts and the DUSU
 * role are excluded; departments and non-union posts (Head) are not.
 */
async function requesterCanSeeStudent(requester: Requester, studentId: string): Promise<boolean> {
  if (requester.user.id === studentId || requester.profile.role === "administration") return true;
  const installed = await isRoutingInstalled();
  const { data: complaints } = await supabaseAdmin
    .from("complaints")
    .select(installed ? "id, student_id, visibility, target_unit_id, hide_name_from_union" : "id, student_id, visibility, target_unit_id")
    .eq("student_id", studentId);
  for (const c of (complaints || []) as any[]) {
    if (!(await requesterCanAccess(requester, c))) continue;
    if (!c.hide_name_from_union) return true;
    if (requester.profile.role === "department" && canAccessComplaint({ id: requester.user.id, role: "department", unit_name: requester.profile.unit_name }, c)) return true;
    const mine = await myAuthorityIds(requester);
    if (mine.length) {
      const { data: viaNonUnion } = await supabaseAdmin
        .from("complaint_routes").select("authority:authorities!inner(is_union)").eq("complaint_id", c.id).in("authority_id", mine).eq("authority.is_union", false);
      if (viaNonUnion?.length) return true;
    }
  }
  return false;
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

  if (!pathname.startsWith("/api/")) return false;
  if (missingEnv.length) {
    return sendJson(res, 500, { error: `Server not configured. Missing in .env.local: ${missingEnv.join(", ")}` });
  }

  // 1. HEALTH & DIAGNOSTICS ENDPOINT
  if (pathname === "/api/health" && req.method === "GET") {
    const { error } = await supabaseAdmin.from("profiles").select("id").limit(1);
    return sendJson(res, error ? 503 : 200, { status: error ? "degraded" : "ok", database: !error });
  }

  if ((pathname === '/api/admin/maintenance' && req.method === 'POST') || (pathname === '/api/cron/escalations' && req.method === 'GET')) {
    const cron = pathname === '/api/cron/escalations';
    if (cron) {
      if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return sendJson(res, 401, { error: 'Invalid scheduler credentials.' });
    } else {
      const requester = await getRequester(req);
      if (!requester?.profile?.is_active || requester.profile.role !== 'administration') return sendJson(res, 403, { error: 'Administration role required.' });
    }
    try { return sendJson(res, 200, await runMaintenance()); }
    catch (err: any) { return sendJson(res, 500, { error: err.message }); }
  }

  // Create privately first. If analysis fails, the saved complaint stays in administration review.
  if (pathname === "/api/complaints/create" && req.method === "POST") {
    const requester = await getRequester(req);
    if (!requester?.profile?.is_active || requester.profile.role !== "student") return sendJson(res, 403, { error: "An active student account is required." });
    if (!(await isRoutingInstalled())) return sendJson(res, 503, { error: "Complaint routing is not configured. Run migration 001 before accepting reports." });
    let input;
    try { input = validateSubmission(await parseBody(req), requester.user.id); }
    catch (err: any) { return sendJson(res, 400, { error: err.message }); }
    const { data: complaint, error } = await supabaseAdmin.from("complaints").insert({
      student_id: requester.user.id, title: input.title, description: input.description, category: input.category,
      visibility: "administration", target_unit_id: null, status: "needs_review",
      hide_name_from_union: input.hideName, location_id: input.location,
    }).select().single();
    if (error) return sendJson(res, 500, { error: "Unable to save complaint: " + error.message });
    if (input.evidence.length) {
      const saved = await supabaseAdmin.from("complaint_evidence").insert(input.evidence.map((id) => ({ complaint_id: complaint.id, cloudinary_public_id: id })));
      if (saved.error) {
        // Return the saved ticket, never prompt a second submission of the same complaint.
        return sendJson(res, 201, { id: complaint.id, analysis: null, warning: "Complaint saved for review, but attachments could not be linked. Contact administration with your ticket number." });
      }
    }
    await supabaseAdmin.from("complaint_status_history").insert({ complaint_id: complaint.id, status: "submitted", changed_by: requester.user.id, remark: "Complaint received privately for analysis and routing." });
    try {
      const analysis = await analyseAndRoute(complaint, input.location, input.hideName, requester.user.id);
      return sendJson(res, 201, { id: complaint.id, analysis });
    } catch (err: any) {
      console.error("[api] saved complaint needs review:", err.message);
      await supabaseAdmin.from("complaints").update({ status: "needs_review", visibility: "administration", target_unit_id: null }).eq("id", complaint.id);
      await supabaseAdmin.from("complaint_routes").delete().eq("complaint_id", complaint.id);
      return sendJson(res, 201, { id: complaint.id, analysis: null, warning: "Your complaint is saved. Administration will review it because automatic routing is unavailable." });
    }
  }

  // AI ANALYSIS + ROUTING. Existing reports can be analysed; an admin can re-run it.
  if (pathname === "/api/complaints/analyse" && req.method === "POST") {
    try {
      const requester = await getRequester(req);
      if (!requester?.profile?.is_active) return sendJson(res, 401, { error: "Authentication required" });
      if (!(await isRoutingInstalled())) return sendJson(res, 503, { error: "AI routing is not set up yet (run backend/migrations/001_ai_routing_tracker.sql).", notInstalled: true });

      const { complaintId, location, hideName } = await parseBody(req);
      const { data: complaint } = await supabaseAdmin.from("complaints").select("*").eq("id", complaintId).maybeSingle();
      if (!complaint) return sendJson(res, 404, { error: "Complaint not found" });
      const isOwner = complaint.student_id === requester.user.id;
      const isAdmin = requester.profile.role === "administration";
      if (!isOwner && !isAdmin) return sendJson(res, 403, { error: "Only the reporter or an administrator can analyse this complaint." });

      if (complaint.analysed_at && !isAdmin) {
        // already analysed: return the stored result instead of calling the AI again
        return sendJson(res, 200, {
          category: complaint.ai_category, priority: complaint.priority, is_sensitive: complaint.is_sensitive, location_text: complaint.location_text,
          summary_en: complaint.summary_en, summary_as: complaint.summary_as, image_findings: complaint.image_findings, confidence: complaint.confidence,
          language: complaint.input_language, source: complaint.ai_source, needs_review: complaint.status === "needs_review", review_reason: null,
          routes: await routesWithPosts(complaint.id),
        });
      }
      const loc = typeof location === "string" && location.length <= 200 ? location : null;
      // the privacy choice is the reporter's own; an admin re-run keeps it
      const hide = isOwner && typeof hideName === "boolean" ? hideName : null;
      return sendJson(res, 200, await analyseAndRoute(complaint, loc, hide, requester.user.id));
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Analysis failed" });
    }
  }

  // ROUTE TRACKER: an official opened the complaint, so mark it seen for the posts they hold
  if (pathname === "/api/complaints/seen" && req.method === "POST") {
    try {
      const requester = await getRequester(req);
      if (!requester?.profile?.is_active) return sendJson(res, 401, { error: "Authentication required" });
      const { complaintId } = await parseBody(req);
      const mine = typeof complaintId === "string" ? await myRoutes(requester, complaintId) : [];
      if (!mine.length) return sendJson(res, 200, { marked: 0 });
      const { data } = await supabaseAdmin.from("complaint_routes").update({ seen_at: new Date().toISOString() })
        .in("id", mine.map((r) => r.id)).is("seen_at", null).select("id");
      return sendJson(res, 200, { marked: data?.length || 0 });
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Failed to record view" });
    }
  }

  // WHAT IS SWITCHED ON: the pages show the PRD features only once the migration has been run
  if (pathname === "/api/features" && req.method === "GET") {
    return sendJson(res, 200, { routing: await isRoutingInstalled(), gemini: !!process.env.GEMINI_API_KEY, signals: await isSignalsInstalled() });
  }

  // AGENT TAG: a signed-in student opens the link the bot sent privately, linking that chat account to theirs
  if (pathname === "/api/chat/link" && req.method === "POST") {
    try {
      const requester = await getRequester(req);
      if (!requester?.profile?.is_active || requester.profile.role !== "student") return sendJson(res, 403, { error: "Sign in with an active student account to link it." });
      if (!(await isSignalsInstalled())) return sendJson(res, 503, { error: "Group reporting is not set up yet.", notInstalled: true });
      const link = readLinkToken((await parseBody(req)).token, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      if (!link) return sendJson(res, 400, { error: "This link has expired or is not valid. Message the bot again for a new one." });
      const { error } = await supabaseAdmin.from("chat_links").upsert({ platform: link.platform, external_user_id: link.userId, student_id: requester.user.id }, { onConflict: "platform,external_user_id" });
      if (error) return sendJson(res, 500, { error: "Could not link the account: " + error.message });
      await supabaseAdmin.from("activity_log").insert({ actor_id: requester.user.id, action: "chat_linked", target: `Linked a ${PLATFORM_NAMES[link.platform]} account` });
      if (botConfigured(link.platform)) {
        await sendDirectMessage(link.platform, link.userId, `Linked to CivicSense as ${requester.profile.name}. You can now tag me in campus groups to raise an issue.`).catch(() => {});
      }
      return sendJson(res, 200, { platform: link.platform });
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Linking failed" });
    }
  }

  // AGENT TAG: signals for the console. Administration sees all; a post holder sees open ones routed to their post.
  if (pathname === "/api/signals" && req.method === "GET") {
    try {
      const requester = await getRequester(req);
      if (!requester?.profile?.is_active || requester.profile.role === "student") return sendJson(res, 403, { error: "Official role required" });
      if (!(await isSignalsInstalled())) return sendJson(res, 503, { error: "Group signals are not set up yet.", notInstalled: true });
      const isAdmin = requester.profile.role === "administration";
      const authorityIds = await myAuthorityIds(requester);
      if (!isAdmin && !authorityIds.length) return sendJson(res, 200, { signals: [] });
      let query = supabaseAdmin.from("signals").select(SIGNAL_COLS + ", supporters:signal_supporters(count)")
        .gte("created_at", daysAgo(30)).order("created_at", { ascending: false }).limit(200);
      if (!isAdmin) query = query.overlaps("authority_ids", authorityIds).in("status", ["open", "acknowledged", "converted"]);
      const { data, error } = await query;
      if (error) return sendJson(res, 500, { error: error.message });
      const { data: posts } = await supabaseAdmin.from("authorities").select("id, post_title");
      const titles = new Map((posts || []).map((p: any) => [p.id, p.post_title]));
      const signals = (data || []).map((s: any) => ({
        ...s, supporters: s.supporters?.[0]?.count ?? 0, posts: s.authority_ids.map((id: string) => titles.get(id)).filter(Boolean),
      }));
      return sendJson(res, 200, { signals });
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Failed" });
    }
  }

  // AGENT TAG: acknowledge (the bot answers in the group), convert to an official complaint, or dismiss
  if (pathname === "/api/signals/act" && req.method === "POST") {
    try {
      const requester = await getRequester(req);
      if (!requester?.profile?.is_active || requester.profile.role === "student") return sendJson(res, 403, { error: "Official role required" });
      if (!(await isSignalsInstalled())) return sendJson(res, 503, { error: "Group signals are not set up yet.", notInstalled: true });
      const { signalId, action, note } = await parseBody(req);
      const { data: s } = await supabaseAdmin.from("signals").select(SIGNAL_COLS).eq("id", signalId).maybeSingle();
      if (!s) return sendJson(res, 404, { error: "Signal not found" });
      const isAdmin = requester.profile.role === "administration";
      const authorityIds = await myAuthorityIds(requester);
      if (!signalVisibleTo(s, { isAdmin, authorityIds })) return sendJson(res, 403, { error: "This signal is not routed to your post." });
      if (s.status === "converted" || s.status === "dismissed") return sendJson(res, 409, { error: "This signal was already handled." });
      const remark = typeof note === "string" ? note.trim().normalize("NFC").slice(0, 500) : "";
      const post = (await postTitles(s.authority_ids.filter((id: string) => authorityIds.includes(id))))[0]
        || (isAdmin ? "the administration" : requester.profile.unit_name || requester.profile.name);
      const now = new Date().toISOString();
      const handled = { handled_by: requester.user.id, handled_note: remark || null, handled_at: now, updated_at: now };
      const supporters = await supporterIds(s.id);
      let chatText: string | null = null;
      let complaintId: string | null = null;

      if (action === "acknowledge") {
        const { error } = await supabaseAdmin.from("signals").update({ ...handled, status: "acknowledged" }).eq("id", s.id);
        if (error) return sendJson(res, 500, { error: error.message });
        chatText = `Seen by ${post}${remark ? `: ${remark}` : "."}`;
        await notify(supporters, null, messages.signalAcknowledged(post));
      } else if (action === "convert") {
        if (!supporters.length) return sendJson(res, 409, { error: "No linked student raised this signal." });
        // the first student who raised it becomes the reporter, so they can track, confirm or reopen it
        const summary = (s.summary_en || s.text).trim();
        const { data: complaint, error } = await supabaseAdmin.from("complaints").insert({
          student_id: supporters[0], title: (summary.length >= 5 ? summary : `Issue: ${summary}`).slice(0, 200),
          description: `${s.text}\n\nRaised in the ${PLATFORM_NAMES[s.platform as Platform]} group "${s.chat_title || s.chat_id}" by ${supporters.length} student${supporters.length === 1 ? "" : "s"}.`,
          category: "Other", visibility: "administration", target_unit_id: null, status: "needs_review", hide_name_from_union: !!s.is_sensitive,
        }).select().single();
        if (error) return sendJson(res, 500, { error: "Could not create the complaint: " + error.message });
        complaintId = complaint.id;
        await supabaseAdmin.from("signals").update({ ...handled, status: "converted", complaint_id: complaint.id }).eq("id", s.id);
        await supabaseAdmin.from("complaint_status_history").insert({ complaint_id: complaint.id, status: "submitted", changed_by: requester.user.id, remark: `Created from a group signal by ${post}.` });
        try { await analyseAndRoute(complaint, null, null, requester.user.id); }
        catch (err: any) { console.error("[api] converted signal left in review:", err.message); }
        await notify(supporters.slice(1), null, messages.signalConverted(ticketRef(complaint.id)));
        chatText = `This is now official complaint ${ticketRef(complaint.id)}, opened by ${post}.`;
      } else if (action === "dismiss") {
        const { error } = await supabaseAdmin.from("signals").update({ ...handled, status: "dismissed" }).eq("id", s.id);
        if (error) return sendJson(res, 500, { error: error.message });
      } else {
        return sendJson(res, 400, { error: "action must be acknowledge, convert or dismiss" });
      }

      await supabaseAdmin.from("activity_log").insert({ actor_id: requester.user.id, action: `signal_${action}`, target: `Signal ${s.id.slice(0, 8)} from "${s.chat_title || s.chat_id}": ${action}${complaintId ? ` as ${ticketRef(complaintId)}` : ""}` });
      // sensitive signals never get a public answer
      let posted = false;
      if (chatText && !s.is_sensitive && botConfigured(s.platform)) {
        posted = await sendChatMessage(s.platform, s.chat_id, chatText, s.message_id).then(() => true, (err) => { console.error("[api] chat reply failed:", err.message); return false; });
      }
      return sendJson(res, 200, { success: true, complaintId, posted });
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Failed" });
    }
  }

  // REPLIES AND INTERNAL NOTES (PRD): officials who can see the complaint; stored in both languages
  if (pathname === "/api/complaints/replies" && req.method === "POST") {
    try {
      const requester = await getRequester(req);
      if (!requester?.profile?.is_active || requester.profile.role === "student") return sendJson(res, 403, { error: "Official role required" });
      if (!(await isRoutingInstalled())) return sendJson(res, 503, { error: "Replies are not set up yet.", notInstalled: true });
      const { complaintId, body, visibility } = await parseBody(req);
      const text = typeof body === "string" ? body.trim().normalize("NFC") : "";
      if (text.length < 2 || text.length > 4000) return sendJson(res, 400, { error: "Write a reply of 2 to 4000 characters." });
      if (visibility !== "public" && visibility !== "internal") return sendJson(res, 400, { error: "visibility must be public or internal" });
      const { data: complaint } = await supabaseAdmin.from("complaints").select("*").eq("id", complaintId).maybeSingle();
      if (!complaint) return sendJson(res, 404, { error: "Complaint not found" });
      if (!(await requesterCanAccess(requester, complaint))) return sendJson(res, 403, { error: "You cannot reply to this complaint." });

      const { translation, attempt } = await translateReply(text);
      if (attempt) await supabaseAdmin.from("ai_logs").insert({ ...attempt, complaint_id: complaint.id });
      const routesHere = await myRoutes(requester, complaint.id);
      const { data: post } = routesHere.length
        ? await supabaseAdmin.from("complaint_routes").select("authority_id, authority:authorities(post_title)").eq("id", routesHere[0].id).maybeSingle()
        : { data: null };
      const { data: reply, error } = await supabaseAdmin.from("complaint_replies").insert({
        complaint_id: complaint.id, author_id: requester.user.id, authority_id: (post as any)?.authority_id ?? null, visibility,
        body_original: text, body_language: translation.language, body_en: translation.en, body_as: translation.as,
      }).select().single();
      if (error) return sendJson(res, 500, { error: "Failed to save reply: " + error.message });

      const now = new Date().toISOString();
      if (routesHere.length) {
        const ids = routesHere.map((r) => r.id);
        await supabaseAdmin.from("complaint_routes").update({ seen_at: now }).in("id", ids).is("seen_at", null);
        if (visibility === "public") await supabaseAdmin.from("complaint_routes").update({ replied_at: now }).in("id", ids).is("replied_at", null);
      }
      if (visibility === "public") {
        const from = (post as any)?.authority?.post_title || requester.profile.unit_name || requester.profile.name;
        await notify([complaint.student_id, ...(await mergedReporterIds(complaint.id))], complaint.id, messages.newReply(ticketRef(complaint.id), from));
      }
      await supabaseAdmin.from("activity_log").insert({
        actor_id: requester.user.id, action: visibility === "public" ? "complaint_reply" : "complaint_internal_note",
        target: `${visibility === "public" ? "Replied on" : "Internal note on"} complaint #${complaint.id.slice(0, 8)}`,
      });
      return sendJson(res, 200, { reply, translated: !!(translation.en && translation.as) });
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Reply failed" });
    }
  }

  // REPORTER CONFIRMS OR REOPENS a resolved complaint (PRD step 7)
  if (pathname === "/api/complaints/confirm" && req.method === "POST") {
    try {
      const requester = await getRequester(req);
      if (!requester?.profile?.is_active) return sendJson(res, 401, { error: "Authentication required" });
      if (!(await isRoutingInstalled())) return sendJson(res, 503, { error: "Not set up yet.", notInstalled: true });
      const { complaintId, action, note } = await parseBody(req);
      const { data: complaint } = await supabaseAdmin.from("complaints").select("*").eq("id", complaintId).maybeSingle();
      if (!complaint || complaint.student_id !== requester.user.id) return sendJson(res, 404, { error: "Complaint not found" });
      if (complaint.status !== "resolved") return sendJson(res, 400, { error: "Only a resolved complaint can be confirmed or reopened." });
      const remark = typeof note === "string" ? note.trim().slice(0, 1000) : "";
      const now = new Date().toISOString();
      const ref = ticketRef(complaint.id);
      const { data: routeRows } = await supabaseAdmin.from("complaint_routes").select("authority_id, kind").eq("complaint_id", complaint.id);
      const primaryHolders = await postHolderIds((routeRows || []).filter((r: any) => r.kind === "primary").map((r: any) => r.authority_id));

      if (action === "confirm") {
        await supabaseAdmin.from("complaints").update({ status: "closed", closed_at: now, updated_at: now }).eq("id", complaint.id);
        await supabaseAdmin.from("complaint_status_history").insert({ complaint_id: complaint.id, status: "closed", remark: remark || "Reporter confirmed it is fixed.", changed_by: requester.user.id });
        await notify(primaryHolders, complaint.id, messages.confirmed(ref));
      } else if (action === "reopen") {
        if (remark.length < 3) return sendJson(res, 400, { error: "Please say what is still wrong (at least 3 characters)." });
        // PRD: back to the primary authority (routed); its resolved checkpoint is cleared
        await supabaseAdmin.from("complaints").update({ status: "submitted", resolved_at: null, updated_at: now }).eq("id", complaint.id);
        await supabaseAdmin.from("complaint_routes").update({ resolved_at: null }).eq("complaint_id", complaint.id);
        await supabaseAdmin.from("complaint_status_history").insert({ complaint_id: complaint.id, status: "submitted", remark: "Reopened by the reporter: " + remark, changed_by: requester.user.id });
        await notify(primaryHolders, complaint.id, messages.reopened(ref));
      } else {
        return sendJson(res, 400, { error: "action must be confirm or reopen" });
      }
      await supabaseAdmin.from("activity_log").insert({ actor_id: requester.user.id, action: action === "confirm" ? "complaint_confirmed" : "complaint_reopened", target: `Reporter ${action === "confirm" ? "confirmed" : "reopened"} complaint #${complaint.id.slice(0, 8)}` });
      return sendJson(res, 200, { success: true, status: action === "confirm" ? "closed" : "submitted" });
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Failed" });
    }
  }

  // POSSIBLE DUPLICATES (PRD admin dashboard): flagged pairs, newest first
  if (pathname === "/api/admin/duplicates" && req.method === "GET") {
    const requester = await getRequester(req);
    if (!requester?.profile?.is_active || requester.profile.role !== "administration") return sendJson(res, 403, { error: "Administration role required" });
    if (!(await isRoutingInstalled())) return sendJson(res, 503, { error: "Not set up yet.", notInstalled: true });
    const cols = "id, title, description, summary_en, summary_as, ai_category, location_text, status, created_at";
    const { data: flagged, error } = await supabaseAdmin.from("complaints").select(cols + ", possible_duplicate_of, duplicate_score")
      .not("possible_duplicate_of", "is", null).eq("duplicate_dismissed", false).neq("status", "merged").order("created_at", { ascending: false });
    if (error) return sendJson(res, 500, { error: error.message });
    const ids = [...new Set((flagged || []).map((c: any) => c.possible_duplicate_of))];
    const { data: originals } = ids.length ? await supabaseAdmin.from("complaints").select(cols).in("id", ids) : { data: [] };
    const byId = new Map((originals || []).map((o: any) => [o.id, o]));
    return sendJson(res, 200, {
      pairs: (flagged || []).map((c: any) => ({ complaint: c, original: byId.get(c.possible_duplicate_of) || null, score: c.duplicate_score })),
    });
  }

  // MERGE (admin confirms) or DISMISS a possible duplicate. Merged reporters then get the surviving complaint's updates.
  if ((pathname === "/api/admin/merge" || pathname === "/api/admin/dismiss-duplicate") && req.method === "POST") {
    try {
      const requester = await getRequester(req);
      if (!requester?.profile?.is_active || requester.profile.role !== "administration") return sendJson(res, 403, { error: "Administration role required" });
      if (!(await isRoutingInstalled())) return sendJson(res, 503, { error: "Not set up yet.", notInstalled: true });
      const { complaintId, intoId } = await parseBody(req);
      const { data: c } = await supabaseAdmin.from("complaints").select("*").eq("id", complaintId).maybeSingle();
      if (!c) return sendJson(res, 404, { error: "Complaint not found" });
      const now = new Date().toISOString();

      if (pathname === "/api/admin/dismiss-duplicate") {
        await supabaseAdmin.from("complaints").update({ possible_duplicate_of: null, duplicate_score: null, duplicate_dismissed: true, updated_at: now }).eq("id", c.id);
        await supabaseAdmin.from("activity_log").insert({ actor_id: requester.user.id, action: "duplicate_dismissed", target: `Complaint #${c.id.slice(0, 8)} is not a duplicate` });
        return sendJson(res, 200, { success: true });
      }

      const target = intoId || c.possible_duplicate_of;
      if (!target || target === c.id) return sendJson(res, 400, { error: "Say which complaint to merge into." });
      const { data: into } = await supabaseAdmin.from("complaints").select("id, status, duplicate_of").eq("id", target).maybeSingle();
      if (!into) return sendJson(res, 404, { error: "Target complaint not found" });
      if (into.status === "merged" || into.duplicate_of) return sendJson(res, 400, { error: "That complaint was itself merged; merge into the surviving one." });
      await supabaseAdmin.from("complaints").update({ status: "merged", duplicate_of: into.id, possible_duplicate_of: null, updated_at: now }).eq("id", c.id);
      // complaints already merged into this one follow it to the surviving complaint
      await supabaseAdmin.from("complaints").update({ duplicate_of: into.id }).eq("duplicate_of", c.id);
      await supabaseAdmin.from("complaint_status_history").insert({ complaint_id: c.id, status: "merged", remark: `Merged into ${ticketRef(into.id)}`, changed_by: requester.user.id });
      await supabaseAdmin.from("activity_log").insert({ actor_id: requester.user.id, action: "complaint_merged", target: `Complaint #${c.id.slice(0, 8)} merged into #${into.id.slice(0, 8)}` });
      await notify([c.student_id], c.id, messages.statusChanged(ticketRef(c.id), "merged"));
      return sendJson(res, 200, { success: true, mergedInto: into.id });
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Failed" });
    }
  }

  // ROUTING EDITOR (PRD P1, /admin/routing): posts and rules
  if (pathname === '/api/admin/edit-analysis' && req.method === 'POST') {
    const requester = await getRequester(req);
    if (!requester?.profile?.is_active || requester.profile.role !== 'administration') return sendJson(res, 403, { error: 'Administration role required.' });
    const { complaintId, category, priority } = await parseBody(req);
    if (!CATEGORIES.includes(category) || !Number.isInteger(priority) || priority < 1 || priority > 4) return sendJson(res, 400, { error: 'Choose a category and a priority from 1 to 4.' });
    const { data: c, error } = await supabaseAdmin.from('complaints').select('*').eq('id', complaintId).maybeSingle();
    if (error || !c) return sendJson(res, 404, { error: 'Complaint not found.' });
    if (['closed', 'merged', 'rejected'].includes(c.status)) return sendJson(res, 409, { error: 'This complaint is no longer active.' });
    const corrected = applyRules({ language: c.input_language || 'en', is_complaint: true, category, priority, is_sensitive: c.is_sensitive,
      location_text: c.location_text, summary_en: c.summary_en || '', summary_as: c.summary_as || '', image_findings: c.image_findings, confidence: 1 }, `${c.title}\n${c.description}`);
    const saved = await supabaseAdmin.from('complaints').update({ ai_category: category, priority: corrected.priority, is_sensitive: corrected.is_sensitive, human_edited: true,
      ...(corrected.head_only ? { visibility: 'administration', target_unit_id: null } : {}), updated_at: new Date().toISOString() }).eq('id', c.id);
    if (saved.error) return sendJson(res, 500, { error: saved.error.message });
    if (c.status !== 'needs_review') await insertRoutes(c.id, category, corrected.head_only);
    await supabaseAdmin.from('activity_log').insert({ actor_id: requester.user.id, action: 'ai_corrected', target: `${ticketRef(c.id)} corrected to ${category}, P${corrected.priority}` });
    await notify([c.student_id], c.id, { en: `${ticketRef(c.id)} was reviewed by administration. Category: ${category}; priority: ${corrected.priority}.`, as: `${ticketRef(c.id)} প্ৰশাসনে পৰীক্ষা কৰিছে। ${category}; ${corrected.priority}।` });
    return sendJson(res, 200, { success: true });
  }

  if (pathname === "/api/admin/routing" && (req.method === "GET" || req.method === "PUT")) {
    try {
      const requester = await getRequester(req);
      if (!requester?.profile?.is_active || requester.profile.role !== "administration") return sendJson(res, 403, { error: "Administration role required" });
      if (!(await isRoutingInstalled())) return sendJson(res, 503, { error: "Not set up yet.", notInstalled: true });

      if (req.method === "PUT") {
        const { authorities, rules } = await parseBody(req);
        const errors: string[] = [];
        const postRows = (Array.isArray(authorities) ? authorities : []).map((a: any) => {
          if (!a.id || !a.post_title?.trim()) errors.push("Every post needs a title.");
          if (a.email && !/^[^\s@]+@[^\s@]+$/.test(a.email)) errors.push(`Invalid email for ${a.post_title}.`);
          return { id: a.id, post_title: String(a.post_title || "").trim(), person_name: a.person_name?.trim() || null, email: a.email?.trim().toLowerCase() || null, active: a.active !== false };
        });
        const ruleRows = (Array.isArray(rules) ? rules : []).map((r: any) => {
          if (!CATEGORIES.includes(r.category)) errors.push("Unknown category: " + r.category);
          if (!r.primary_authority_id) errors.push(`Category ${r.category} needs a primary post.`);
          const hours = Number(r.response_hours);
          if (!Number.isInteger(hours) || hours < 1 || hours > 2000) errors.push(`Response hours for ${r.category} must be 1 to 2000.`);
          return {
            category: r.category, primary_authority_id: r.primary_authority_id,
            copy_authority_ids: (Array.isArray(r.copy_authority_ids) ? r.copy_authority_ids : []).filter((id: string) => id && id !== r.primary_authority_id),
            escalate_to_id: r.escalate_to_id || null, response_hours: hours, active: r.active !== false,
          };
        });
        if (errors.length) return sendJson(res, 400, { error: [...new Set(errors)].join(" ") });
        for (const p of postRows) {
          const { id, ...fields } = p;
          const { error } = await supabaseAdmin.from("authorities").update(fields).eq("id", id);
          if (error) return sendJson(res, 500, { error: "Failed to save post: " + error.message });
        }
        if (ruleRows.length) {
          const { error } = await supabaseAdmin.from("routing_rules").upsert(ruleRows, { onConflict: "category" });
          if (error) return sendJson(res, 500, { error: "Failed to save rules: " + error.message });
        }
        await supabaseAdmin.from("activity_log").insert({ actor_id: requester.user.id, action: "routing_edited", target: `Routing updated: ${postRows.length} posts, ${ruleRows.length} rules` });
      }

      const [{ data: posts }, { data: ruleList }] = await Promise.all([
        supabaseAdmin.from("authorities").select("id, post_key, post_title, person_name, level, is_union, email, active").order("level", { ascending: false }).order("post_title"),
        supabaseAdmin.from("routing_rules").select("category, primary_authority_id, copy_authority_ids, escalate_to_id, response_hours, active").order("category"),
      ]);
      return sendJson(res, 200, { authorities: posts || [], rules: ruleList || [], categories: CATEGORIES });
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Failed" });
    }
  }

  // REVIEW QUEUE: an administrator routes a needs_review complaint by hand, optionally correcting the category
  if (pathname === "/api/admin/route-complaint" && req.method === "POST") {
    try {
      const requester = await getRequester(req);
      if (!requester?.profile?.is_active || requester.profile.role !== "administration") return sendJson(res, 403, { error: "Administration role required" });
      if (!(await isRoutingInstalled())) return sendJson(res, 503, { error: "AI routing is not set up yet.", notInstalled: true });
      const { complaintId, category } = await parseBody(req);
      if (!CATEGORIES.includes(category)) return sendJson(res, 400, { error: "Unknown category: " + category });
      const { data: complaint } = await supabaseAdmin.from("complaints").select("*").eq("id", complaintId).maybeSingle();
      if (!complaint) return sendJson(res, 404, { error: "Complaint not found" });

      const headOnly = !!complaint.is_sensitive || (category === "safety" && complaint.priority === 1);
      await insertRoutes(complaint.id, category, headOnly);
      const edited = complaint.ai_category !== category;
      await supabaseAdmin.from("complaints").update({
        ai_category: category, human_edited: complaint.human_edited || edited,
        ...(headOnly ? { visibility: "administration", target_unit_id: null } : {}),
        ...(complaint.status === "needs_review" ? { status: "submitted" } : {}),
        updated_at: new Date().toISOString(),
      }).eq("id", complaint.id);
      const routes = await routesWithPosts(complaint.id);
      await supabaseAdmin.from("complaint_status_history").insert({
        complaint_id: complaint.id, status: "submitted", changed_by: requester.user.id,
        remark: `Routed by administration as ${category} to ${routes.map((r) => r.post_title).join(", ")}`,
      });
      await supabaseAdmin.from("activity_log").insert({
        actor_id: requester.user.id, action: "complaint_routed",
        target: `Complaint #${complaint.id.slice(0, 8)} routed by hand as ${category}${edited ? " (AI category corrected)" : ""}`,
      });
      await notify([complaint.student_id], complaint.id, messages.routedToReporter(ticketRef(complaint.id), routes.map((r) => r.post_title)));
      const { data: rows } = await supabaseAdmin.from("complaint_routes").select("authority_id").eq("complaint_id", complaint.id);
      await notifyRoutedPosts(complaint.id, (rows || []).map((x: any) => x.authority_id), requester.user.id);
      return sendJson(res, 200, { success: true, routes });
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Routing failed" });
    }
  }

  // 2. CLOUDINARY AUTHENTICATED UPLOAD SIGNATURE (signed-in users only)
  if (pathname === "/api/cloudinary/sign-upload" && req.method === "POST") {
    try {
      const requester = await getRequester(req);
      if (!requester) {
        return sendJson(res, 401, { error: "Authentication required" });
      }
      const body = await parseBody(req).catch(() => ({}));
      const timestamp = Math.round(Date.now() / 1000);
      const wantsEvidence = body && body.folder === "civicsense/complaint_evidence";
      // A brand-new student has no profile row yet while uploading their ID card; evidence needs an active student.
      if (wantsEvidence && (requester.profile?.role !== "student" || !requester.profile.is_active)) {
        return sendJson(res, 403, { error: "Only active student accounts can upload complaint evidence" });
      }
      const folder = wantsEvidence ? `civicsense/complaint_evidence/${requester.user.id}` : "civicsense/id_cards";
      const deliveryType = "authenticated";

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

      if (!requester.profile || !requester.profile.is_active) {
        return sendJson(res, 403, { error: "Account inactive or unauthorized" });
      }

      if (!(await requesterCanSeeStudent(requester, targetUserId))) {
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

      if (!requester.profile || !requester.profile.is_active) {
        return sendJson(res, 403, { error: "Account inactive or unauthorized" });
      }

      // Always resolve through complaint_evidence so a caller can't pair an accessible complaint with someone else's file.
      let evQuery = supabaseAdmin.from("complaint_evidence").select("complaint_id, cloudinary_public_id");
      evQuery = evidenceId
        ? evQuery.eq("id", evidenceId)
        : evQuery.eq("complaint_id", complaintId!).eq("cloudinary_public_id", publicId!);
      const { data: evRow, error: evErr } = await evQuery.maybeSingle();

      if (evErr || !evRow) {
        return sendJson(res, 404, { error: "Evidence record not found" });
      }
      const targetComplaintId = evRow.complaint_id;
      const targetPublicId = evRow.cloudinary_public_id;

      const { data: compRow, error: compErr } = await supabaseAdmin
        .from("complaints")
        .select("id, student_id, visibility, target_unit_id")
        .eq("id", targetComplaintId)
        .maybeSingle();

      if (compErr || !compRow) {
        return sendJson(res, 404, { error: "Complaint not found" });
      }

      if (!(await requesterCanAccess(requester, compRow))) {
        return sendJson(res, 403, { error: "Forbidden: Not authorized to view this complaint evidence" });
      }

      if (!API_SECRET || !API_KEY || !CLOUD_NAME) {
        return sendJson(res, 500, { error: "Cloudinary credentials not configured." });
      }

      const expiresAt = Math.round(Date.now() / 1000) + 10 * 60;
      const signedUrl = cloudinary.utils.private_download_url(
        targetPublicId,
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

      if (!(await requesterCanAccess(requester, complaint))) {
        return sendJson(res, 403, { error: "Unauthorized: You do not have permission to update this grievance." });
      }

      if (['closed', 'merged', 'rejected'].includes(complaint.status)) return sendJson(res, 409, { error: 'This complaint is no longer active.' });

      // Validate everything before writing anything
      const validStatuses = ["submitted", "under_verification", "accepted", "in_progress", "resolved", "rejected"];
      if (status) {
        if (!validStatuses.includes(status)) {
          return sendJson(res, 400, { error: "Invalid status value: " + status });
        }
        if (status === "rejected" && (!remark || remark.trim().length < 5)) {
          return sendJson(res, 400, { error: "Rejection requires an explanatory remark (minimum 5 characters)." });
        }
        if (status === "resolved" && (!remark || remark.trim().length < 5)) {
          return sendJson(res, 400, { error: "Resolution requires a closing note (minimum 5 characters)." });
        }
        if (status === "in_progress" && (!remark || remark.trim().length < 3)) {
          return sendJson(res, 400, { error: "Progress update requires a remark (minimum 3 characters)." });
        }
      }

      // PRD: only the primary authority (or an admin) may resolve. An official who sees the complaint only
      // because they were copied on it cannot.
      const routesHere = await myRoutes(requester, complaintId);
      if (status === "resolved" && profile.role !== "administration") {
        let ownTargetUnit: string | null = null;
        if (complaint.target_unit_id && complaint.target_unit_id !== user.id) {
          const { data: t } = await supabaseAdmin.from("profiles").select("unit_name").eq("id", complaint.target_unit_id).maybeSingle();
          ownTargetUnit = t?.unit_name ?? null;
        }
        const viaVisibility = canAccessComplaint({ id: user.id, role: profile.role, unit_name: profile.unit_name }, complaint, ownTargetUnit);
        const hasRoutes = (await routesWithPosts(complaintId)).length > 0;
        if ((hasRoutes || !viaVisibility) && !routesHere.some((r) => r.kind === "primary")) {
          return sendJson(res, 403, { error: "Only the primary authority or an administrator can mark this complaint resolved." });
        }
      }

      // Optional: Verify ID card if requested
      if (idCardStatus && (idCardStatus === "verified" || idCardStatus === "not_valid")) {
        const { error: idErr } = await supabaseAdmin
          .from("id_cards")
          .update({
            status: idCardStatus,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", complaint.student_id);
        if (idErr) {
          return sendJson(res, 500, { error: "Failed to update ID card: " + idErr.message });
        }

        await supabaseAdmin.from("activity_log").insert({
          actor_id: user.id,
          action: "id_card_review",
          target: `Marked student ID card as ${idCardStatus} for user ${complaint.student_id.slice(0, 8)}`,
        });
      }

      // Update complaint status if provided
      if (status) {
        const { error: updErr } = await supabaseAdmin
          .from("complaints")
          .update({
            status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", complaintId);
        if (updErr) {
          return sendJson(res, 500, { error: "Failed to update complaint: " + updErr.message });
        }

        const { error: histErr } = await supabaseAdmin.from("complaint_status_history").insert({
          complaint_id: complaintId,
          status,
          remark: remark ? remark.trim() : null,
          changed_by: user.id,
        });
        if (histErr) {
          return sendJson(res, 500, { error: "Status changed but history entry failed: " + histErr.message });
        }

        await supabaseAdmin.from("activity_log").insert({
          actor_id: user.id,
          action: "complaint_status_update",
          target: `Updated complaint #${complaintId.slice(0, 8)} to ${status}: ${remark || "No note"}`,
        });

        // Route tracker: a remark counts as this post's reply; resolving completes its checkpoint
        const now = new Date().toISOString();
        if (routesHere.length) {
          const ids = routesHere.map((r) => r.id);
          await supabaseAdmin.from("complaint_routes").update({ seen_at: now }).in("id", ids).is("seen_at", null);
          if (remark && remark.trim()) await supabaseAdmin.from("complaint_routes").update({ replied_at: now }).in("id", ids).is("replied_at", null);
          if (status === "resolved") await supabaseAdmin.from("complaint_routes").update({ resolved_at: now }).in("id", ids).is("resolved_at", null);
        }
        if (status === "resolved" && (await isRoutingInstalled())) {
          // an admin or the visibility-routed unit resolving also completes the primary checkpoint
          await supabaseAdmin.from("complaint_routes").update({ resolved_at: now }).eq("complaint_id", complaintId).eq("kind", "primary").is("resolved_at", null);
          await supabaseAdmin.from("complaints").update({ resolved_at: now }).eq("id", complaintId);
        }
        if (await isRoutingInstalled()) {
          await notify([complaint.student_id, ...(await mergedReporterIds(complaintId))], complaintId, messages.statusChanged(ticketRef(complaintId), status));
        }
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

  // 6b. ID CARD REVIEW STANDALONE ROUTE
  if (pathname === "/api/id-card/review" && req.method === "POST") {
    try {
      const requester = await getRequester(req);
      if (!requester || !requester.profile?.is_active || requester.profile.role === "student") {
        return sendJson(res, 403, { error: "Official redressal role required" });
      }

      const body = await parseBody(req);
      const { userId, status } = body;

      if (!userId || !["verified", "not_valid"].includes(status)) {
        return sendJson(res, 400, { error: "Missing or invalid parameters: userId, status (verified | not_valid)" });
      }

      if (!(await requesterCanSeeStudent(requester, userId))) {
        return sendJson(res, 403, { error: "Unauthorized to review ID card for this user" });
      }

      const { error } = await supabaseAdmin
        .from("id_cards")
        .update({
          status,
          reviewed_by: requester.user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        return sendJson(res, 500, { error: error.message });
      }

      await supabaseAdmin.from("activity_log").insert({
        actor_id: requester.user.id,
        action: "id_card_review",
        target: `Marked student ID card as ${status} for user ${userId.slice(0, 8)}`,
      });

      return sendJson(res, 200, { success: true, userId, status });
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Failed to review ID card" });
    }
  }

  // 7. ADMIN USER PROVISIONING (CREATE DEPARTMENT / SOCIAL SERVICE ACCOUNTS)
  if (pathname === "/api/admin/create-official" && req.method === "POST") {
    try {
      const requester = await getRequester(req);
      if (!requester || requester.profile?.role !== "administration") {
        return sendJson(res, 403, { error: "Administration privileges required" });
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

  // 7b. ADMIN LIST OFFICIALS
  if (pathname === "/api/admin/list-officials" && req.method === "GET") {
    try {
      const requester = await getRequester(req);
      if (!requester || requester.profile?.role !== "administration") {
        return sendJson(res, 403, { error: "Administration privileges required" });
      }

      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id, name, email, role, unit_name, is_active, must_change_password, created_at, updated_at")
        .in("role", ["department", "social_service"])
        .order("name", { ascending: true });

      if (error) {
        return sendJson(res, 500, { error: error.message });
      }

      return sendJson(res, 200, { officials: data || [] });
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Failed to load officials" });
    }
  }

  // 7c. ADMIN EDIT OFFICIAL PROFILE
  if (pathname === "/api/admin/edit-official" && req.method === "POST") {
    try {
      const requester = await getRequester(req);
      if (!requester || requester.profile?.role !== "administration") {
        return sendJson(res, 403, { error: "Administration privileges required" });
      }

      const body = await parseBody(req);
      const { userId, name, unitName } = body;

      if (!userId || !name) {
        return sendJson(res, 400, { error: "Missing required fields: userId, name" });
      }
      if (!(await isManagedOfficial(userId))) {
        return sendJson(res, 400, { error: "Can only edit department or social_service accounts" });
      }

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          name: name.trim(),
          unit_name: unitName ? unitName.trim() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        return sendJson(res, 500, { error: error.message });
      }

      await supabaseAdmin.from("activity_log").insert({
        actor_id: requester.user.id,
        action: "official_profile_edited",
        target: `Updated profile details for official ${userId.slice(0, 8)} (${name})`,
      });

      return sendJson(res, 200, { success: true, userId, name, unitName });
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Failed to edit official" });
    }
  }

  // 7d. ADMIN DELETE OFFICIAL ACCOUNT
  if (pathname === "/api/admin/delete-official" && req.method === "POST") {
    try {
      const requester = await getRequester(req);
      if (!requester || requester.profile?.role !== "administration") {
        return sendJson(res, 403, { error: "Administration privileges required" });
      }

      const body = await parseBody(req);
      const { userId } = body;

      if (!userId) {
        return sendJson(res, 400, { error: "Missing required field: userId" });
      }

      // Check target role
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("role, name, email")
        .eq("id", userId)
        .maybeSingle();

      if (!targetProfile || (targetProfile.role !== "department" && targetProfile.role !== "social_service")) {
        return sendJson(res, 400, { error: "Can only delete department or social_service accounts" });
      }

      return sendJson(res, 409, { error: "Use Deactivate instead. Deleting an official would erase their complaint and audit history." });

    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Failed to delete official account" });
    }
  }

  // 7e. ADMIN RESET OFFICIAL PASSWORD
  if (pathname === "/api/admin/reset-password" && req.method === "POST") {
    try {
      const requester = await getRequester(req);
      if (!requester || requester.profile?.role !== "administration") {
        return sendJson(res, 403, { error: "Administration privileges required" });
      }

      const body = await parseBody(req);
      const { userId, newTemporaryPassword } = body;

      if (!userId || !newTemporaryPassword || newTemporaryPassword.length < 6) {
        return sendJson(res, 400, { error: "Missing or invalid parameters: userId, newTemporaryPassword (minimum 6 characters)" });
      }
      if (!(await isManagedOfficial(userId))) {
        return sendJson(res, 400, { error: "Can only reset passwords of department or social_service accounts" });
      }

      const { error: resetErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newTemporaryPassword,
      });

      if (resetErr) {
        return sendJson(res, 500, { error: resetErr.message });
      }

      await supabaseAdmin
        .from("profiles")
        .update({
          must_change_password: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      await supabaseAdmin.from("activity_log").insert({
        actor_id: requester.user.id,
        action: "official_password_reset",
        target: `Generated new temporary credentials for official ${userId.slice(0, 8)}`,
      });

      return sendJson(res, 200, { success: true, userId });
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Failed to reset official password" });
    }
  }

  // 7f. ADMIN AGGREGATED STATS (BY STATUS AND BY UNIT)
  if (pathname === "/api/admin/stats" && req.method === "GET") {
    try {
      const requester = await getRequester(req);
      if (!requester || requester.profile?.role !== "administration") {
        return sendJson(res, 403, { error: "Administration privileges required" });
      }

      const installed = await isRoutingInstalled();
      const { data: complaints, error } = await supabaseAdmin
        .from("complaints")
        .select("id, status, category, created_at, target_unit_id, target_unit:profiles!target_unit_id(unit_name, name)"
          + (installed ? ", ai_category, priority, location_id, location_text, resolved_at, closed_at, possible_duplicate_of, duplicate_dismissed" : ""));

      if (error) {
        return sendJson(res, 500, { error: error.message });
      }

      // PRD dashboard: counts by status, category and place, and the average resolution time
      const count = (key: (c: any) => string | null | undefined) => {
        const out: Record<string, number> = {};
        for (const c of (complaints || []) as any[]) { const k = key(c) || "Unspecified"; out[k] = (out[k] || 0) + 1; }
        return out;
      };
      const resolvedTimes = ((complaints || []) as any[])
        .map((c) => ({ start: Date.parse(c.created_at), end: Date.parse(c.resolved_at || c.closed_at || "") }))
        .filter((t) => t.end > t.start);
      const prd = {
        byStatusAll: count((c) => c.status),
        byCategory: count((c) => c.ai_category || c.category),
        byLocation: count((c) => c.location_text || c.location_id),
        byPriority: installed ? count((c) => (c.priority ? "P" + c.priority : null)) : {},
        averageResolutionHours: resolvedTimes.length
          ? Math.round((resolvedTimes.reduce((s, t) => s + (t.end - t.start), 0) / resolvedTimes.length / 3600e3) * 10) / 10
          : null,
        resolvedCount: resolvedTimes.length,
        needsReview: ((complaints || []) as any[]).filter((c) => c.status === "needs_review").length,
        possibleDuplicates: ((complaints || []) as any[]).filter((c) => c.possible_duplicate_of && !c.duplicate_dismissed && c.status !== "merged").length,
        prdInstalled: installed,
      };

      const byStatus: Record<string, number> = {
        submitted: 0,
        under_verification: 0,
        accepted: 0,
        in_progress: 0,
        resolved: 0,
        rejected: 0,
      };

      const byUnit: Record<string, number> = {};

      (complaints || []).forEach((c: any) => {
        if (c.status && byStatus[c.status] !== undefined) {
          byStatus[c.status]++;
        }
        const unitName = (c.target_unit?.unit_name || c.target_unit?.name || "General / Unassigned");
        byUnit[unitName] = (byUnit[unitName] || 0) + 1;
      });

      return sendJson(res, 200, {
        total: (complaints || []).length,
        byStatus,
        byUnit,
        ...prd,
      });
    } catch (err: any) {
      return sendJson(res, 500, { error: err.message || "Failed to calculate stats" });
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
      if (!(await isManagedOfficial(userId))) {
        return sendJson(res, 400, { error: "Can only activate or deactivate department or social_service accounts" });
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
      if (!(await isManagedOfficial(targetUnitId))) {
        return sendJson(res, 400, { error: "targetUnitId must be a department or social_service account" });
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
