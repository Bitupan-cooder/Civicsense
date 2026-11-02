import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSubmission } from './submission.ts';
import { deadlinePlan } from './maintenance.ts';
import { campusLocations, locationLabel, resolveLocationId } from '../src/locations.ts';

const input = { title: 'Water in hostel', description: 'There is no water in hostel 2.', category: 'Water', location: 'du_hostel_2', hideName: true };

test('submission persists the privacy choice and stable campus location', () => {
  const result = validateSubmission(input, 'student-a');
  assert.equal(result.hideName, true);
  assert.equal(result.location, 'du_hostel_2');
  assert.deepEqual(result.evidence, []);
});
test('submission rejects attachments outside the authenticated student namespace', () => {
  assert.throws(() => validateSubmission({ ...input, evidencePublicIds: ['civicsense/id_cards/private'] }, 'student-a'));
  assert.throws(() => validateSubmission({ ...input, evidencePublicIds: ['civicsense/complaint_evidence/student-b/photo'] }, 'student-a'));
  assert.throws(() => validateSubmission({ ...input, evidencePublicIds: 'not-an-array' }, 'student-a'));
  assert.deepEqual(validateSubmission({ ...input, evidencePublicIds: ['civicsense/complaint_evidence/student-a/photo'] }, 'student-a').evidence, ['civicsense/complaint_evidence/student-a/photo']);
});
test('submission validates body limits without trusting client fields', () => {
  assert.throws(() => validateSubmission(null, 'student-a'));
  assert.throws(() => validateSubmission({ ...input, description: 'x'.repeat(10001) }, 'student-a'));
  assert.throws(() => validateSubmission({ ...input, location: {} }, 'student-a'));
  assert.equal('status' in validateSubmission({ ...input, status: 'resolved' }, 'student-a'), false);
});
test('location normalization supports stable IDs, old labels and custom places', () => {
  assert.equal(resolveLocationId(campusLocations.du_hostel_2.name), 'du_hostel_2');
  assert.equal(locationLabel('du_hostel_2'), campusLocations.du_hostel_2.name);
  assert.equal(resolveLocationId('Unknown building'), null);
  assert.equal(locationLabel('Unknown building'), 'Unknown building');
  assert.equal(resolveLocationId('__proto__'), null);
});
const now = Date.parse('2026-11-02T12:00:00Z');
const complaint = { status: 'submitted', priority: 3, is_sensitive: false, created_at: '2026-11-01T12:00:00Z' };
test('deadlines respect configured hours and urgent/high priority floors', () => {
  assert.equal(deadlinePlan(complaint, 48, now).overdue, false);
  assert.equal(deadlinePlan({ ...complaint, priority: 2 }, 48, now).overdue, true);
  assert.equal(deadlinePlan({ ...complaint, priority: 1 }, 48, now).headOnly, true);
  assert.equal(deadlinePlan({ ...complaint, is_sensitive: true }, 12, now).headOnly, true);
  assert.equal(deadlinePlan(complaint, 12, now).finalStage, true);
});
test('closed, merged, resolved, rejected and review complaints never escalate', () => {
  for (const status of ['closed', 'merged', 'resolved', 'rejected', 'needs_review']) assert.equal(deadlinePlan({ ...complaint, status }, 1, now).overdue, false);
  assert.equal(deadlinePlan({ ...complaint, created_at: 'invalid' }, 1, now).overdue, false);
});
