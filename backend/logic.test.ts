// The PRD's code rules, checked against its demo scenarios (A1, A2, E2, X1, X2, X5).
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyRules, normaliseDigits, priorityFloor, routeComplaint, type Understanding } from "../src/logic.ts";

const base: Understanding = {
  language: "en", is_complaint: true, category: "water", priority: 3, is_sensitive: false, location_text: null,
  summary_en: "s", summary_as: "s", image_findings: null, confidence: 0.9,
};

test("priority floors", () => {
  assert.equal(priorityFloor("২ নম্বৰ হোষ্টেলৰ বাথৰুমত সোমবাৰৰ পৰা পানী অহা নাই।", null), 2, "A1: no water in a hostel");
  assert.equal(priorityFloor("লাইব্ৰেৰীৰ সন্মুখৰ ষ্ট্ৰীট লাইটটো দুই সপ্তাহ ধৰি জ্বলা নাই, ৰাতি অন্ধকাৰ আৰু ভয় লাগে।", null), 2, "A2: unlit and unsafe at night");
  assert.equal(priorityFloor("Hostel 2 r bathroom t pani nai, Monday pora", null), 2, "A3: romanised");
  assert.equal(priorityFloor("Exposed wires hanging near the canteen entrance.", null), 1, "E2: exposed wires");
  assert.equal(priorityFloor("Problem near the canteen", "Photo shows sparks from a socket"), 1, "photo findings count");
  assert.equal(priorityFloor("The library fan is a bit noisy", null), null);
});

test("the model cannot lower a floor, and sensitive complaints go to the Head only", () => {
  const e2 = applyRules({ ...base, category: "electricity", priority: 2 }, "Exposed wires hanging near the canteen entrance.");
  assert.equal(e2.priority, 1);
  const x2 = applyRules({ ...base, category: "safety", priority: 3 }, "A senior keeps harassing me near the boys' hostel.");
  assert.equal(x2.priority, 1);
  assert.equal(x2.is_sensitive, true);
  assert.equal(x2.head_only, true);
});

test("review queue: not a complaint, or confidence below 0.6", () => {
  assert.equal(applyRules({ ...base, confidence: 0.4 }, "ইয়াত সমস্যা আছে, সোনকালে চাওক।").needs_review, true, "X5");
  assert.equal(applyRules({ ...base, is_complaint: false }, "hello").needs_review, true);
  assert.equal(applyRules(base, "No water in the Boys Hostel 2 bathroom since Monday.").needs_review, false);
});

test("never invent a place", () => {
  assert.equal(applyRules({ ...base, location_text: "Science Block" }, "Water leaking in the hostel").location_text, null);
  assert.equal(applyRules({ ...base, location_text: "Hostel 2" }, "No water in Hostel 2").location_text, "Hostel 2");
  assert.equal(applyRules({ ...base, location_text: "Central Library" }, "লাইব্ৰেৰীৰ সন্মুখত", ["Central Library"]).location_text, "Central Library");
});

test("Assamese digits", () => {
  assert.equal(normaliseDigits("২ নম্বৰ, কোঠা ২১০"), "2 নম্বৰ, কোঠা 210");
});

test("routing: owning post plus the General Secretary; sensitive goes to the Head only", () => {
  const rules = [
    { category: "music", primary_authority_id: "music", copy_authority_ids: ["gs"] },
    { category: "water", primary_authority_id: "head", copy_authority_ids: ["gs"] },
    { category: "other", primary_authority_id: "gs", copy_authority_ids: ["vp"] },
  ];
  assert.deepEqual(routeComplaint("music", false, rules, "head"), [{ authority_id: "music", kind: "primary" }, { authority_id: "gs", kind: "copy" }], "X1");
  assert.deepEqual(routeComplaint("water", false, rules, "head"), [{ authority_id: "head", kind: "primary" }, { authority_id: "gs", kind: "copy" }], "A1");
  assert.deepEqual(routeComplaint("safety", true, rules, "head"), [{ authority_id: "head", kind: "primary" }], "X2: no copy");
  assert.deepEqual(routeComplaint("unknown", false, rules, "head")[0], { authority_id: "gs", kind: "primary" }, "falls back to 'other'");
});
