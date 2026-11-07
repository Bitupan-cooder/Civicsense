// Routing and safety rules from the PRD, shared by the API (backend/api.ts) and the app.
// Pure functions: no network, no DOM. Tested in backend/logic.test.ts.

export const CATEGORIES = [
  'electricity', 'water', 'sanitation', 'hostel', 'library', 'classroom', 'road_transport', 'safety', 'internet',
  'sports', 'cricket', 'music', 'debating', 'fine_arts_literary', 'magazine', 'girls_common_room', 'boys_common_room',
  'social_service', 'general', 'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  electricity: 'Electricity', water: 'Water', sanitation: 'Sanitation', hostel: 'Hostel', library: 'Library',
  classroom: 'Classroom', road_transport: 'Roads & transport', safety: 'Safety', internet: 'Internet',
  sports: 'Sports', cricket: 'Cricket', music: 'Music', debating: 'Debating / symposium',
  fine_arts_literary: 'Fine arts / literary', magazine: 'Magazine', girls_common_room: "Girls' common room",
  boys_common_room: "Boys' common room", social_service: 'Social service', general: 'General', other: 'Other',
};

/** Output of the understanding step (PRD "AI design" 1), before the code rules run. */
export interface Understanding {
  language: 'as' | 'en' | 'mixed';
  is_complaint: boolean;
  category: Category;
  priority: number; // 1 urgent … 4 minor
  is_sensitive: boolean;
  location_text: string | null;
  summary_en: string;
  summary_as: string;
  image_findings: string | null;
  confidence: number; // 0 … 1
}

const has = (text: string, patterns: RegExp[]) => patterns.some((p) => p.test(text));

// Priority floors (PRD "Rules the code applies after the call"). English, Assamese and romanised Assamese.
const PRIORITY_1 = [
  /\b(exposed|hanging|naked|loose|bare|open)\s+(live\s+)?(wire|wires|wiring|cable|cables)\b/i, /\blive\s+wires?\b/i,
  /\bspark(s|ing)?\b/i, /\bfire\b/i, /\bsmoke\b/i, /\bshort[\s-]?circuit\b/i,
  /\b(structural\s+)?cracks?\b.*\b(wall|ceiling|pillar|beam|building|roof)\b/i, /\b(wall|ceiling|pillar|beam|building|roof)\b.*\bcrack/i,
  /\bharass(ed|es|ing|ment)?\b/i, /\bthreat(s|en|ened|ening)?\b/i, /\bragg(ing|ed)\b/i, /\bassault(ed)?\b/i,
  /তাঁৰ.*(ওলমি|খোলা|উদং)/, /জুই/, /ধোঁৱা/, /ফাট/, /হাৰাশাস্তি|হৈৰাণ|ভাবুকি|ৰেগিং/,
];
const SENSITIVE = /harass|threat|ragg(ing|ed)|assault|হাৰাশাস্তি|হৈৰাণ|ভাবুকি|ৰেগিং/i;
const NO_WATER =[/\bno\s+water\b/i, /\bwater\s+(is\s+)?not\s+(coming|available|there)\b/i, /\bpani\s+nai\b/i, /পানী\s*(অহা\s*)?নাই/];
const HOSTEL = [/\bhostel\b/i, /হোষ্টেল/, /ছাত্ৰাবাস/, /ছাত্ৰীনিবাস/, /chatra\s+nivas/i];
const PRIORITY_2 = [
  /\btoilets?\b.*\b(unusable|blocked|overflow(ing)?|broken|clogged)\b/i, /\b(unusable|blocked|clogged)\b.*\btoilets?\b/i,
  /\bfood\b.*\b(ill|sick|poison(ing)?|vomit(ing)?|diarrh(o)?ea)\b/i, /\bfood\s+poisoning\b/i,
  /\b(dark|unlit|no\s+light|lights?\s+(not\s+working|off|out))\b.*\b(night|unsafe|scared|afraid|fear)\b/i,
  /\b(night|unsafe|scared|afraid|fear)\b.*\b(dark|unlit|no\s+light|lights?\s+(not\s+working|off|out))\b/i,
  /(অন্ধকাৰ|লাইট.*জ্বলা নাই|জ্বলা নাই).*(ৰাতি|ভয়)/, /(ৰাতি|ভয়).*(অন্ধকাৰ|জ্বলা নাই)/,
];

/** The most urgent priority the text or photo findings force, or null when no floor applies. */
export function priorityFloor(text: string, imageFindings: string | null): 1 | 2 | null {
  const all = text + '\n' + (imageFindings || '');
  if (has(all, PRIORITY_1)) return 1;
  if (has(all, PRIORITY_2) || (has(all, NO_WATER) && has(all, HOSTEL))) return 2;
  return null;
}

/** Assamese digits ০–৯ to 0–9 (room and hostel numbers). */
export function normaliseDigits(text: string): string {
  return text.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6));
}

export interface RuleResult extends Understanding {
  needs_review: boolean;
  review_reason: string | null;
  /** Sensitive routing: Head / Chairperson only. */
  head_only: boolean;
}

/**
 * Applies the PRD's code rules to a model result. The model cannot override them.
 * knownPlaces: campus place names (both languages) the location may be matched to.
 */
export function applyRules(u: Understanding, text: string, knownPlaces: string[] = []): RuleResult {
  const r: RuleResult = { ...u, needs_review: false, review_reason: null, head_only: false };
  if (!CATEGORIES.includes(r.category)) r.category = 'other';
  r.priority = Math.min(4, Math.max(1, Math.round(Number(r.priority) || 3)));
  r.confidence = Math.min(1, Math.max(0, Number(r.confidence) || 0));

  const floor = priorityFloor(normaliseDigits(text), r.image_findings);
  if (floor !== null && r.priority > floor) r.priority = floor;
  // harassment and threats are always sensitive, whatever the model says
  if (SENSITIVE.test(text)) r.is_sensitive = true;

  // Never invent: a place must appear in the text, the photo findings, or be a known campus place
  if (r.location_text) {
    const hay = (normaliseDigits(text) + ' ' + (r.image_findings || '')).toLowerCase();
    const place = r.location_text.toLowerCase();
    const known = knownPlaces.some((p) => p.toLowerCase() === place);
    if (!known && !hay.includes(place)) r.location_text = null;
  }

  if (!r.is_complaint) { r.needs_review = true; r.review_reason = 'Not recognised as a complaint'; }
  else if (r.confidence < 0.6) { r.needs_review = true; r.review_reason = 'Low AI confidence (' + r.confidence.toFixed(2) + ')'; }

  r.head_only = r.is_sensitive || (r.category === 'safety' && r.priority === 1);
  return r;
}

export interface RoutingRule {
  category: string;
  primary_authority_id: string;
  copy_authority_ids: string[];
}

export interface Route { authority_id: string; kind: 'primary' | 'copy' }

/**
 * Who receives a complaint: the rule's primary post plus its copies (the General Secretary for everything
 * except sensitive complaints, which go to the Head / Chairperson only).
 */
export function routeComplaint(category: string, headOnly: boolean, rules: RoutingRule[], headAuthorityId: string): Route[] {
  if (headOnly) return [{ authority_id: headAuthorityId, kind: 'primary' }];
  const rule = rules.find((x) => x.category === category) || rules.find((x) => x.category === 'other');
  if (!rule) return [{ authority_id: headAuthorityId, kind: 'primary' }];
  const routes: Route[] = [{ authority_id: rule.primary_authority_id, kind: 'primary' }];
  for (const id of rule.copy_authority_ids) if (id !== rule.primary_authority_id) routes.push({ authority_id: id, kind: 'copy' });
  return routes;
}

/** "Route complete" once the primary authority resolved it and the reporter confirmed (or 7 days passed). */
export interface TrackerRoute { kind: string; seen_at: string | null; replied_at: string | null; resolved_at: string | null; post_title: string }
export function waitingOn(routes: TrackerRoute[], status: string): string | null {
  if (status === 'closed' || status === 'merged' || status === 'rejected') return null;
  const primary = routes.find((r) => r.kind === 'primary');
  if (!primary) return null;
  if (!primary.resolved_at) return primary.post_title;
  return status === 'resolved' ? 'Reporter confirmation' : null;
}

// ── Notifications (PRD: on each change, in the reader's language). Assamese wording: please have a native speaker review. ──

export const STATUS_NAMES: Record<string, { en: string; as: string }> = {
  submitted: { en: 'submitted', as: 'দাখিল কৰা হৈছে' },
  under_verification: { en: 'under verification', as: 'পৰীক্ষাধীন' },
  accepted: { en: 'accepted', as: 'গৃহীত' },
  in_progress: { en: 'in progress', as: 'কাম চলি আছে' },
  resolved: { en: 'resolved', as: 'সমাধান হৈছে' },
  rejected: { en: 'rejected', as: 'নাকচ কৰা হৈছে' },
  closed: { en: 'closed', as: 'বন্ধ কৰা হৈছে' },
  needs_review: { en: 'under review', as: 'পুনৰীক্ষণাধীন' },
  merged: { en: 'merged with another complaint', as: 'আন এটা অভিযোগৰ সৈতে একত্ৰিত' },
};

export interface Message { en: string; as: string }

export const messages = {
  routedToReporter: (ref: string, posts: string[]): Message => ({
    en: `Your complaint ${ref} was sent to ${posts.join(', ')}.`,
    as: `আপোনাৰ অভিযোগ ${ref} ${posts.join(', ')}লৈ পঠিওৱা হৈছে।`,
  }),
  inReview: (ref: string): Message => ({
    en: `Your complaint ${ref} is being checked by the administration before it is routed.`,
    as: `আপোনাৰ অভিযোগ ${ref} পঠিওৱাৰ আগতে প্ৰশাসনে পৰীক্ষা কৰি আছে।`,
  }),
  routedToPost: (ref: string, post: string): Message => ({
    en: `New complaint ${ref} routed to your post (${post}).`,
    as: `আপোনাৰ পদলৈ (${post}) নতুন অভিযোগ ${ref} আহিছে।`,
  }),
  statusChanged: (ref: string, status: string): Message => ({
    en: `Your complaint ${ref} is now ${STATUS_NAMES[status]?.en ?? status}.`,
    as: `আপোনাৰ অভিযোগ ${ref}ৰ স্থিতি এতিয়া: ${STATUS_NAMES[status]?.as ?? status}।`,
  }),
  newReply: (ref: string, from: string): Message => ({
    en: `New reply on your complaint ${ref} from ${from}.`,
    as: `আপোনাৰ অভিযোগ ${ref}ত ${from}ৰ পৰা নতুন উত্তৰ আহিছে।`,
  }),
  reopened: (ref: string): Message => ({
    en: `Complaint ${ref} was reopened by the reporter.`,
    as: `অভিযোগকাৰীয়ে অভিযোগ ${ref} পুনৰ খুলিছে।`,
  }),
  confirmed: (ref: string): Message => ({
    en: `The reporter confirmed complaint ${ref} is fixed.`,
    as: `অভিযোগকাৰীয়ে অভিযোগ ${ref} সমাধান হোৱা বুলি নিশ্চিত কৰিছে।`,
  }),
  signalRaised: (chat: string, summary: string, students: number): Message => ({
    en: `Raised in the group "${chat}" (${students} student${students === 1 ? '' : 's'}): ${summary}`,
    as: `"${chat}" গোটত ${students} জন ছাত্ৰ-ছাত্ৰীয়ে উত্থাপন কৰিছে: ${summary}`,
  }),
  signalAcknowledged: (post: string): Message => ({
    en: `The issue you raised in a group was seen by ${post}.`,
    as: `আপুনি গোটত উত্থাপন কৰা সমস্যাটো ${post}এ দেখিছে।`,
  }),
  signalConverted: (ref: string): Message => ({
    en: `The issue you raised in a group is now official complaint ${ref}.`,
    as: `আপুনি গোটত উত্থাপন কৰা সমস্যাটো এতিয়া আনুষ্ঠানিক অভিযোগ ${ref}।`,
  }),
  autoClosed: (ref: string): Message => ({
    en: `Complaint ${ref} was closed automatically 7 days after it was resolved.`,
    as: `সমাধানৰ ৭ দিনৰ পিছত অভিযোগ ${ref} স্বয়ংক্ৰিয়ভাৱে বন্ধ কৰা হ'ল।`,
  }),
};

/** "CS-E703D748" from a complaint id. */
export const ticketRef = (id: string) => 'CS-' + id.slice(0, 8).toUpperCase();

/** PRD: with no answer 7 days after resolution, a complaint closes automatically. */
export const AUTO_CLOSE_DAYS = 7;

// ── Duplicate detection (PRD "AI design" 4) ──

/** Similarity above this flags a possible duplicate: embeddings (PRD: about 0.80), word overlap without Gemini. */
export const DUPLICATE_THRESHOLD = { embedding: 0.8, words: 0.5 } as const;

const STOP = new Set(['the', 'a', 'an', 'in', 'on', 'at', 'of', 'to', 'and', 'is', 'are', 'was', 'for', 'from', 'since', 'with', 'no', 'not', 'r', 't', 'ৰ', 'ত', 'আৰু', 'নাই']);
const words = (text: string) => new Set(
  normaliseDigits(text).toLowerCase().normalize('NFC').split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1 && !STOP.has(w)),
);

/** Word-overlap (Jaccard) similarity, 0…1. Works within one language only; cross-language needs embeddings. */
export function textSimilarity(a: string, b: string): number {
  const x = words(a);
  const y = words(b);
  if (!x.size || !y.size) return 0;
  let both = 0;
  for (const w of x) if (y.has(w)) both++;
  return both / (x.size + y.size - both);
}

// ── Large result sets ──

/** Every row of a Supabase query. Supabase returns at most "Max rows" per request (1000 by default), silently, so
 *  ask page by page, each from where the last one ended, until a page comes back empty. `page` must order by a unique key. */
export async function allRows<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<{ data: T[]; error: unknown }> {
  const data: T[] = [];
  for (;;) {
    const res = await page(data.length, data.length + 999);
    if (res.error) return { data, error: res.error };
    if (!res.data?.length) return { data, error: null };
    data.push(...res.data);
  }
}

/** Splits ids into groups of 100: an `.in()` filter travels in the URL, which must stay short. */
export const chunks = <T>(items: T[], size = 100): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));
