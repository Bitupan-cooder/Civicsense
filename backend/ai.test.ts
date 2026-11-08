// Gemini request/response handling and the fallback, with a fake fetch (no network).
import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenUsage, understandComplaint } from "./ai.ts";

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

test("when every model is out of quota, the keyword rules answer and the complaint is flagged for review", async () => {
  process.env.GEMINI_API_KEY = "test-key";
  const failing = (async () => new Response("quota exceeded", { status: 429 })) as typeof fetch;
  const r = await understandComplaint({ text: "No water in the Boys Hostel 2 bathroom since Monday." }, failing);
  assert.equal(r.source, "rules");
  assert.equal(r.failed, true);
  // the keyword rules say "hostel" here (more hostel words than water words); Gemini is expected to say "water"
  assert.ok(["water", "hostel"].includes(r.understanding.category));
  assert.deepEqual(r.attempts.map((a) => [a.model, a.ok]), [["gemini-2.5-flash", false], ["gemini-2.5-flash-lite", false], ["keyword-rules", true]]);
  assert.match(r.attempts[0].error!, /429/);
});

test("model chain: a quota or server error moves to the next model; other errors and embeddings don't", async () => {
  process.env.GEMINI_API_KEY = "test-key";
  const urls: string[] = [];
  const firstOutOfQuota = (status: number) => (async (url: string) => {
    urls.push(url);
    return url.includes("/gemini-2.5-flash:") ? new Response("busy", { status })
      : new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(reply) }] } }] }), { status: 200 });
  }) as typeof fetch;

  const r = await understandComplaint({ text: "২ নম্বৰ হোষ্টেলৰ বাথৰুমত পানী নাই" }, firstOutOfQuota(429));
  assert.equal(r.source, "gemini");
  assert.equal(r.failed, false, "answered by the fallback model: no review needed");
  assert.deepEqual(r.attempts.map((a) => [a.model, a.ok]), [["gemini-2.5-flash", false], ["gemini-2.5-flash-lite", true]]);
  assert.equal((await understandComplaint({ text: "x hostel water" }, firstOutOfQuota(503))).source, "gemini");

  urls.length = 0;
  const bad = await understandComplaint({ text: "No water in Hostel 2" }, firstOutOfQuota(400));
  assert.equal(bad.source, "rules", "a bad request would fail on every model");
  assert.equal(urls.length, 1);

  const { translateReply } = await import("./ai.ts");
  const out = { language: "en", en: "Fixed today.", as: "আজিয়েই ঠিক কৰা হ'ব।" };
  const t = await translateReply("Fixed today.", (async (url: string) => url.includes("/gemini-2.5-flash:")
    ? new Response("quota", { status: 429 })
    : new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] }), { status: 200 })) as typeof fetch);
  assert.deepEqual(t.translation, out);
  assert.deepEqual(t.attempts.map((a) => a.model), ["gemini-2.5-flash", "gemini-2.5-flash-lite"]);

  process.env.GEMINI_MODELS = "model-a, model-b";
  urls.length = 0;
  await understandComplaint({ text: "No water in Hostel 2" }, (async (url: string) => { urls.push(url); return new Response("quota", { status: 429 }); }) as typeof fetch);
  assert.deepEqual(urls.map((u) => u.match(/models\/([^:]+):/)![1]), ["model-a", "model-b"]);
  delete process.env.GEMINI_MODELS;
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
  assert.deepEqual(r.attempts.map((a) => [a.step, a.ok]), [["translation", true]]);

  delete process.env.GEMINI_API_KEY;
  const as = await translateReply("প্লাম্বাৰ আজিয়েই আহিব।");
  assert.deepEqual(as.translation, { language: "as", en: null, as: "প্লাম্বাৰ আজিয়েই আহিব।" });
  assert.deepEqual(as.attempts, []);
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

test("token usage: thinking tokens count as output (Gemini bills them so); none reported means null", () => {
  assert.deepEqual(tokenUsage({ usageMetadata: { promptTokenCount: 900, candidatesTokenCount: 120, thoughtsTokenCount: 300 } }), { input_tokens: 900, output_tokens: 420 });
  assert.deepEqual(tokenUsage({ candidates: [] }), { input_tokens: null, output_tokens: null });
});
