// Complaint understanding (PRD "AI design" 1): one multimodal Gemini call that returns strict JSON.
// Without GEMINI_API_KEY, or when the call fails, the keyword analyzer the site already ships is used instead.
// The caller applies the code rules (src/logic.ts) and writes every attempt to ai_logs.
import { CATEGORIES, normaliseDigits, type Category, type Understanding } from "../src/logic.ts";
// plain-JS modules shared with the site
import { analyzeComplaint } from "../src/site/analyzer.js";
import { CAMPUS_LOCATIONS } from "../src/site/demoData.js";

export const PROMPT_VERSION = "understand-v1";
const MODEL = () => process.env.GEMINI_MODEL || "gemini-2.5-flash";

export interface AiAttempt {
  step: "understanding" | "translation";
  model: string;
  prompt_version: string;
  latency_ms: number;
  ok: boolean;
  raw_output: string | null;
  error: string | null;
}

export interface UnderstandResult {
  understanding: Understanding;
  source: "gemini" | "rules";
  /** true when Gemini was configured but failed: the PRD sends such complaints to review */
  failed: boolean;
  attempts: AiAttempt[];
}

export interface ComplaintInput {
  text: string;
  /** landmark the reporter picked, if any */
  location?: string | null;
  image?: { mimeType: string; base64: string } | null;
}

export const campusPlaceNames = (): string[] =>
  CAMPUS_LOCATIONS.flatMap((l: { name_en: string; name_as: string }) => [l.name_en, l.name_as]);

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    language: { type: "STRING", enum: ["as", "en", "mixed"] },
    is_complaint: { type: "BOOLEAN" },
    category: { type: "STRING", enum: [...CATEGORIES] },
    priority: { type: "INTEGER" },
    is_sensitive: { type: "BOOLEAN" },
    location_text: { type: "STRING", nullable: true },
    summary_en: { type: "STRING" },
    summary_as: { type: "STRING" },
    image_findings: { type: "STRING", nullable: true },
    confidence: { type: "NUMBER" },
  },
  required: ["language", "is_complaint", "category", "priority", "is_sensitive", "location_text", "summary_en", "summary_as", "image_findings", "confidence"],
};

export function buildPrompt(input: ComplaintInput): string {
  const places = CAMPUS_LOCATIONS.map((l: { name_en: string; name_as: string }) => `- ${l.name_en} (${l.name_as})`).join("\n");
  return `You triage campus complaints at Dibrugarh University, Assam. Read the complaint (Assamese, English, or romanised Assamese) and the optional photo, and return JSON only.

Fields:
- language: "as" for Assamese script, "en" for English, "mixed" for romanised Assamese or a mix.
- is_complaint: false for questions, greetings, spam or text with no actionable problem.
- category: one of ${CATEGORIES.join(", ")}.
  electricity, water, sanitation, hostel, library, classroom, road_transport, internet = facilities;
  safety = security or personal safety; sports (grounds, gym, equipment, tournaments), cricket, music, debating (debates, symposiums),
  fine_arts_literary (cultural, art, literary events), magazine, girls_common_room, boys_common_room,
  social_service (cleanliness drives, social welfare); general or other when nothing fits.
- priority: 1 urgent (safety risk), 2 high (facility unusable, many people affected), 3 normal, 4 minor.
- is_sensitive: true for harassment, threats, or a complaint that names a person.
- location_text: the place mentioned, written exactly as in this campus list when it matches one; otherwise the place as written; null if no place is mentioned.
${places}
- summary_en: one or two plain English lines. summary_as: the same in Assamese script (use ৰ and ৱ, not Bengali র and ব).
  Glossary: hostel = হোষ্টেল, library = লাইব্ৰেৰী, classroom = শ্ৰেণীকোঠা, water = পানী, electricity = বিদ্যুৎ, toilet = শৌচালয়.
- image_findings: what the photo shows that matters for the complaint, or null when there is no photo.
- confidence: 0 to 1, how sure you are about category and priority.

Rules: never invent counts, times or places that are not in the text or the photo. Assamese digits ০-৯ are numbers (২ = 2).
${input.location ? `The reporter picked this campus place: ${input.location}\n` : ""}
Complaint:
"""
${input.text}
"""`;
}

/** The keyword analyzer from the site, mapped to the PRD's understanding fields. */
export function understandWithRules(input: ComplaintInput): Understanding {
  const a = analyzeComplaint(input.text, null, input.location || null, "en");
  const tooShort = !input.text || input.text.trim().length < 4;
  return {
    language: a.language === "as" || a.language === "mixed" ? a.language : "en",
    is_complaint: !tooShort,
    category: (CATEGORIES as readonly string[]).includes(a.category) ? (a.category as Category) : "other",
    priority: a.priority,
    is_sensitive: !!a.sensitive,
    location_text: a.location_text || null,
    summary_en: a.summary_en,
    summary_as: a.summary_as,
    image_findings: null, // the keyword analyzer cannot see photos
    confidence: a.confidence,
  };
}

export async function understandWithGemini(input: ComplaintInput, apiKey: string, fetchImpl: typeof fetch = fetch): Promise<{ understanding: Understanding; raw: string }> {
  const parts: object[] = [{ text: buildPrompt({ ...input, text: input.text.normalize("NFC") }) }];
  if (input.image) parts.push({ inline_data: { mime_type: input.image.mimeType, data: input.image.base64 } });
  const res = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL()}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA, temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(30000),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${body.slice(0, 300)}`);
  const text = JSON.parse(body)?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
  if (!text) throw new Error("Gemini returned no content: " + body.slice(0, 300));
  const u = JSON.parse(text) as Understanding;
  for (const key of RESPONSE_SCHEMA.required) if (!(key in u)) throw new Error("Gemini output is missing " + key);
  return { understanding: u, raw: text };
}

export async function understandComplaint(input: ComplaintInput, fetchImpl: typeof fetch = fetch): Promise<UnderstandResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const attempts: AiAttempt[] = [];
  const text = normaliseDigits(input.text);
  if (apiKey) {
    const started = Date.now();
    try {
      const { understanding, raw } = await understandWithGemini({ ...input, text: input.text }, apiKey, fetchImpl);
      attempts.push({ step: "understanding", model: MODEL(), prompt_version: PROMPT_VERSION, latency_ms: Date.now() - started, ok: true, raw_output: raw, error: null });
      return { understanding, source: "gemini", failed: false, attempts };
    } catch (err) {
      attempts.push({ step: "understanding", model: MODEL(), prompt_version: PROMPT_VERSION, latency_ms: Date.now() - started, ok: false, raw_output: null, error: String((err as Error).message || err) });
    }
  }
  const started = Date.now();
  const understanding = understandWithRules({ ...input, text });
  attempts.push({ step: "understanding", model: "keyword-rules", prompt_version: "rules-v1", latency_ms: Date.now() - started, ok: true, raw_output: JSON.stringify(understanding), error: null });
  return { understanding, source: "rules", failed: !!apiKey, attempts };
}

// ── Reply translation (PRD "Replies in two languages"): one call stores a reply in English and Assamese ──

export interface Translation {
  language: "as" | "en" | "mixed";
  en: string | null;
  as: string | null;
}

export const TRANSLATE_PROMPT_VERSION = "translate-v1";

/** Without Gemini: detect the language and keep the original in that slot (no translation). */
export function translateWithoutAi(text: string): Translation {
  const language = understandWithRules({ text }).language;
  return { language, en: language === "as" ? null : text, as: language === "as" ? text : null };
}

export async function translateReply(text: string, fetchImpl: typeof fetch = fetch): Promise<{ translation: Translation; attempt: AiAttempt | null }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { translation: translateWithoutAi(text), attempt: null };
  const started = Date.now();
  try {
    const res = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL()}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text:
`Translate this reply from a university official to a student. Return JSON with:
- language: "as" (Assamese script), "en" (English) or "mixed" (romanised Assamese or a mix)
- en: the reply in plain English
- as: the reply in Assamese script (use ৰ and ৱ)
Keep names, numbers, room and hostel numbers exactly. Do not add anything.

Reply:
"""
${text.normalize("NFC")}
"""` }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: { type: "OBJECT", properties: { language: { type: "STRING", enum: ["as", "en", "mixed"] }, en: { type: "STRING" }, as: { type: "STRING" } }, required: ["language", "en", "as"] },
          temperature: 0.1,
        },
      }),
      signal: AbortSignal.timeout(30000),
    });
    const body = await res.text();
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${body.slice(0, 300)}`);
    const raw = JSON.parse(body)?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
    const t = JSON.parse(raw) as Translation;
    if (!t.en || !t.as) throw new Error("Gemini translation is incomplete: " + raw.slice(0, 200));
    return { translation: t, attempt: { step: "translation", model: MODEL(), prompt_version: TRANSLATE_PROMPT_VERSION, latency_ms: Date.now() - started, ok: true, raw_output: raw, error: null } };
  } catch (err) {
    return {
      translation: translateWithoutAi(text),
      attempt: { step: "translation", model: MODEL(), prompt_version: TRANSLATE_PROMPT_VERSION, latency_ms: Date.now() - started, ok: false, raw_output: null, error: String((err as Error).message || err) },
    };
  }
}
