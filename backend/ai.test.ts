// Gemini request/response handling and the fallback, with a fake fetch (no network).
import { test } from "node:test";
import assert from "node:assert/strict";
import { understandComplaint } from "./ai.ts";

const reply = {
  language: "as", is_complaint: true, category: "water", priority: 2, is_sensitive: false, location_text: "Hostel 2",
  summary_en: "No water in Hostel 2 bathroom since Monday.", summary_as: "সোমবাৰৰ পৰা ২ নম্বৰ হোষ্টেলৰ বাথৰুমত পানী নাই।",
  image_findings: null, confidence: 0.92,
};

test("uses Gemini when a key is set, with a JSON schema and the image inline", async () => {
  process.env.GEMINI_API_KEY = "test-key";
  let sent: any;
  const fakeFetch = (async (url: string, init: any) => {
    sent = { url, body: JSON.parse(init.body), key: init.headers["x-goog-api-key"] };
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(reply) }] } }] }), { status: 200 });
  }) as typeof fetch;
  const r = await understandComplaint({ text: "২ নম্বৰ হোষ্টেলৰ বাথৰুমত পানী নাই", image: { mimeType: "image/jpeg", base64: "AAAA" } }, fakeFetch);
  assert.equal(r.source, "gemini");
  assert.equal(r.failed, false);
  assert.deepEqual(r.understanding, reply);
  assert.equal(sent.key, "test-key");
  assert.match(sent.url, /:generateContent$/);
  assert.equal(sent.body.generationConfig.responseMimeType, "application/json");
  assert.equal(sent.body.contents[0].parts[1].inline_data.mime_type, "image/jpeg");
  assert.match(sent.body.contents[0].parts[0].text, /Padmanath Gohain Baruah Chatra Nivas/, "campus list is in the prompt");
  assert.equal(r.attempts.length, 1);
  assert.equal(r.attempts[0].ok, true);
});

test("a failed Gemini call falls back to the keyword rules and is flagged for review", async () => {
  process.env.GEMINI_API_KEY = "test-key";
  const failing = (async () => new Response("quota exceeded", { status: 429 })) as typeof fetch;
  const r = await understandComplaint({ text: "No water in the Boys Hostel 2 bathroom since Monday." }, failing);
  assert.equal(r.source, "rules");
  assert.equal(r.failed, true);
  // the keyword rules say "hostel" here (more hostel words than water words); Gemini is expected to say "water"
  assert.ok(["water", "hostel"].includes(r.understanding.category));
  assert.deepEqual(r.attempts.map((a) => a.ok), [false, true]);
  assert.match(r.attempts[0].error!, /429/);
});

test("without a key, only the keyword rules run", async () => {
  delete process.env.GEMINI_API_KEY;
  const never = (async () => { throw new Error("should not be called"); }) as typeof fetch;
  const r = await understandComplaint({ text: "সংগীত কক্ষৰ হাৰমনিয়ামটো বেয়া হৈ আছে।" }, never);
  assert.equal(r.source, "rules");
  assert.equal(r.failed, false);
  assert.equal(r.understanding.language, "as");
});

test("reply translation: both languages from Gemini, original kept without a key", async () => {
  const { translateReply } = await import("./ai.ts");
  process.env.GEMINI_API_KEY = "test-key";
  const out = { language: "en", en: "Plumber assigned, it will be fixed today.", as: "প্লাম্বাৰ নিযুক্ত কৰা হৈছে, আজিয়েই ঠিক কৰা হ'ব।" };
  const ok = (async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] }), { status: 200 })) as typeof fetch;
  const r = await translateReply("Plumber assigned, it will be fixed today.", ok);
  assert.deepEqual(r.translation, out, "X4");
  assert.equal(r.attempt?.step, "translation");

  delete process.env.GEMINI_API_KEY;
  const as = await translateReply("প্লাম্বাৰ আজিয়েই আহিব।");
  assert.deepEqual(as.translation, { language: "as", en: null, as: "প্লাম্বাৰ আজিয়েই আহিব।" });
  assert.equal(as.attempt, null);
});

test("embeddings: 768 numbers from Gemini, none without a key", async () => {
  const { embedText } = await import("./ai.ts");
  process.env.GEMINI_API_KEY = "test-key";
  let sent: any;
  const ok = (async (_url: string, init: any) => { sent = JSON.parse(init.body); return new Response(JSON.stringify({ embedding: { values: Array(768).fill(0.1) } }), { status: 200 }); }) as typeof fetch;
  const r = await embedText("No water in Hostel 2", ok);
  assert.equal(r.values?.length, 768);
  assert.equal(sent.outputDimensionality, 768);
  const bad = (async () => new Response(JSON.stringify({ embedding: { values: [1, 2] } }), { status: 200 })) as typeof fetch;
  assert.equal((await embedText("x", bad)).values, null, "wrong size is rejected");
  delete process.env.GEMINI_API_KEY;
  assert.deepEqual(await embedText("x"), { values: null, attempt: null });
});
