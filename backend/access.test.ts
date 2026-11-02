import test from "node:test";
import assert from "node:assert/strict";
import { canAccessComplaint } from "./access.ts";

const dept = { id: "dept-1", role: "department", unit_name: "Electrical" };
const own = { student_id: "stu-1", visibility: "department", target_unit_id: "dept-1" };

test("departments only see department complaints routed to them or their unit", () => {
  assert.equal(canAccessComplaint(dept, own), true);
  assert.equal(canAccessComplaint(dept, { ...own, target_unit_id: "dept-2" }, "Electrical"), true);
  assert.equal(canAccessComplaint(dept, { ...own, target_unit_id: "dept-2" }, "Water"), false);
  assert.equal(canAccessComplaint(dept, { ...own, target_unit_id: null }), false);
  assert.equal(canAccessComplaint(dept, { ...own, visibility: "social_service" }), false);
  assert.equal(canAccessComplaint({ ...dept, unit_name: null }, { ...own, target_unit_id: "dept-2" }, null), false);
});

test("students, social service and administration", () => {
  assert.equal(canAccessComplaint({ id: "stu-1", role: "student" }, own), true);
  assert.equal(canAccessComplaint({ id: "stu-2", role: "student" }, own), false);
  assert.equal(canAccessComplaint({ id: "ss", role: "social_service" }, own), false);
  assert.equal(canAccessComplaint({ id: "ss", role: "social_service" }, { ...own, visibility: "social_service" }), true);
  assert.equal(canAccessComplaint({ id: "adm", role: "administration" }, own), true);
  assert.equal(canAccessComplaint({ id: "x", role: "unknown" }, own), false);
});

test("officials also see complaints routed to a post they hold; students never through routes", () => {
  assert.equal(canAccessComplaint(dept, { ...own, target_unit_id: "dept-2" }, "Water", true), true);
  assert.equal(canAccessComplaint({ id: "ss", role: "social_service" }, own, null, true), true);
  assert.equal(canAccessComplaint({ id: "stu-2", role: "student" }, own, null, true), false);
});
