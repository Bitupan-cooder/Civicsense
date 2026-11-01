import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeAndRouteComplaint,
  authenticateOfficial,
  filterComplaintsForOfficial,
  createComplaintRecord,
  approveIncomingComplaint,
  toggleTimelineChecklistStep,
  updateComplaintCase,
  mergeDuplicateComplaints,
  computePortalStatistics,
  getActiveMapComplaints,
  isComplaintActiveOnMap,
  INITIAL_COMPLAINTS,
  SAMPLE_OFFICIAL_ACCOUNTS,
  TIMELINE_STAGE_LABELS,
} from './portalStore';

test('analyzeAndRouteComplaint detects category, priority, summary, and owning post from complaint text', () => {
  const res = analyzeAndRouteComplaint(
    'Sparking street light pole near auditorium dropping live sparks after rain.',
    'water'
  );
  assert.equal(res.category, 'power');
  assert.equal(res.priority, 'Immediate Hazard');
  assert.equal(res.owningPost, 'Electrical Maintenance & Power');
  assert.ok(res.matchedKeywords.includes('spark'));
});

test('authenticateOfficial validates sample ID, email, password, and returns correct role mode', () => {
  const authMode1 = authenticateOfficial('DEPT-WATER', 'campus123');
  assert.equal(authMode1.ok, true);
  if (authMode1.ok) {
    assert.equal(authMode1.account.mode, 'dept_head');
    assert.equal(authMode1.account.categoryScope, 'water');
  }

  const authMode2 = authenticateOfficial('president@campus.edu', 'campus123');
  assert.equal(authMode2.ok, true);
  if (authMode2.ok) {
    assert.equal(authMode2.account.mode, 'president_gs');
  }

  const authMode3 = authenticateOfficial('ADMIN-01', 'campus123');
  assert.equal(authMode3.ok, true);
  if (authMode3.ok) {
    assert.equal(authMode3.account.mode, 'admin');
  }

  const badAuth = authenticateOfficial('ADMIN-01', 'wrongpass');
  assert.equal(badAuth.ok, false);
});

test('filterComplaintsForOfficial scopes Mode 1 to own category only and gives Mode 2 & Mode 3 full visibility', () => {
  const waterHead = SAMPLE_OFFICIAL_ACCOUNTS.find((a) => a.id === 'DEPT-WATER')!;
  const president = SAMPLE_OFFICIAL_ACCOUNTS.find((a) => a.id === 'PRES-GS-01')!;
  const admin = SAMPLE_OFFICIAL_ACCOUNTS.find((a) => a.id === 'ADMIN-01')!;

  const waterOnly = filterComplaintsForOfficial(INITIAL_COMPLAINTS, waterHead);
  assert.ok(waterOnly.length > 0);
  assert.ok(waterOnly.every((c) => c.category === 'water'));

  const presAll = filterComplaintsForOfficial(INITIAL_COMPLAINTS, president);
  assert.equal(presAll.length, INITIAL_COMPLAINTS.length);

  const adminAll = filterComplaintsForOfficial(INITIAL_COMPLAINTS, admin);
  assert.equal(adminAll.length, INITIAL_COMPLAINTS.length);
});

test('createComplaintRecord initializes the 4 timeline stages (Problem Seen, Solving, Delivered, Completed) and official checklist updates them', () => {
  const newRec = createComplaintRecord({
    description: 'RO drinking water filter leaking in Hostel Block A',
    selectedCategory: 'water',
    location: 'Padmanath Gohain Baruah Chatra Nivas (Hostel Block A)',
    existingCount: 0,
  });
  assert.equal(newRec.id, 'CMP-2607');
  assert.equal(newRec.approved, false);
  assert.equal(newRec.status, 'routed');
  assert.deepEqual(
    newRec.routeSteps.map((s) => s.step),
    [...TIMELINE_STAGE_LABELS]
  );
  assert.ok(newRec.routeSteps.every((s) => s.completed === false));

  // Official approves the incoming complaint -> Problem Seen & Solving checked
  const afterApprove = approveIncomingComplaint(
    [newRec],
    'CMP-2607',
    { name: 'Er. P. Gogoi', roleLabel: 'Mode 1: Department Head' },
    'Approved and dispatched plumber.'
  );
  assert.equal(afterApprove[0].approved, true);
  assert.equal(afterApprove[0].status, 'in_progress');
  assert.equal(afterApprove[0].routeSteps[0].completed, true);
  assert.equal(afterApprove[0].routeSteps[1].completed, true);
  assert.equal(afterApprove[0].routeSteps[2].completed, false);

  // Official checks stage 2 ("Delivered") on the checklist
  const afterDelivered = toggleTimelineChecklistStep(
    afterApprove,
    'CMP-2607',
    2,
    { name: 'Er. P. Gogoi', roleLabel: 'Mode 1: Department Head' },
    'New RO valve delivered and installed.'
  );
  assert.equal(afterDelivered[0].routeSteps[2].completed, true);
  assert.equal(afterDelivered[0].status, 'in_progress');

  // Official checks stage 3 ("Completed") on the checklist
  const afterCompleted = toggleTimelineChecklistStep(
    afterDelivered,
    'CMP-2607',
    3,
    { name: 'Er. P. Gogoi', roleLabel: 'Mode 1: Department Head' },
    'Completed and water quality tested.'
  );
  assert.equal(afterCompleted[0].routeSteps[3].completed, true);
  assert.equal(afterCompleted[0].status, 'resolved');

  // Merge duplicates in Mode 3 Admin
  const merged = mergeDuplicateComplaints(INITIAL_COMPLAINTS, 'CMP-2604', 'CMP-2601', 'Dr. K. Rajkhowa');
  const dupItem = merged.find((c) => c.id === 'CMP-2604')!;
  assert.equal(dupItem.status, 'closed');
  assert.equal(dupItem.mergedIntoId, 'CMP-2601');
});

test('getActiveMapComplaints pins unsolved reports with GPS and photoDataUrl as Red Pins and automatically removes solved reports', () => {
  // Initial complaints have 6 total: 5 unsolved + 1 solved (CMP-2603)
  const initialActivePins = getActiveMapComplaints(INITIAL_COMPLAINTS);
  assert.equal(initialActivePins.length, 5);
  assert.ok(!initialActivePins.some((c) => c.id === 'CMP-2603'));

  // Create a new report with GPS coordinates and location photo at Dibrugarh University
  const gpsReport = createComplaintRecord({
    description: 'Broken water pipe flooding pathway outside Central Library',
    selectedCategory: 'water',
    location: 'Lakshminath Bezbaroa Central Library',
    lat: 27.45058,
    lng: 94.89314,
    gpsAccuracyMeters: 4,
    photoDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    photoName: 'library_pipe_leak.png',
    existingCount: INITIAL_COMPLAINTS.length,
  });

  assert.equal(gpsReport.lat, 27.45058);
  assert.equal(gpsReport.lng, 94.89314);
  assert.equal(gpsReport.gpsAccuracyMeters, 4);
  assert.ok(gpsReport.photoDataUrl?.startsWith('data:image/'));
  assert.equal(isComplaintActiveOnMap(gpsReport), true);

  const listWithNew = [gpsReport, ...INITIAL_COMPLAINTS];
  assert.equal(getActiveMapComplaints(listWithNew).length, 6);

  // When official solves the problem (marks Stage 4 Completed), the Red Pin is automatically removed
  const afterSolved = toggleTimelineChecklistStep(
    listWithNew,
    gpsReport.id,
    3,
    { name: 'Er. P. Gogoi', roleLabel: 'Mode 1: Department Head' },
    'Pipe repaired and verified.'
  );
  const solvedRecord = afterSolved.find((c) => c.id === gpsReport.id)!;
  assert.equal(solvedRecord.status, 'resolved');
  assert.equal(isComplaintActiveOnMap(solvedRecord), false);
  assert.equal(getActiveMapComplaints(afterSolved).length, 5);
});

test('computePortalStatistics accurately tallies totals, pending, escalated, and resolved counts', () => {
  const stats = computePortalStatistics(INITIAL_COMPLAINTS);
  assert.equal(stats.total, INITIAL_COMPLAINTS.length);
  assert.equal(stats.escalated, 1);
  assert.equal(stats.resolved, 1);
  assert.equal(stats.byCategory.length, 7);
});
