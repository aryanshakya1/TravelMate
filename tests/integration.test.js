import test from 'node:test';
import assert from 'node:assert/strict';

import {
  Travellers,
  Groups,
  JoinRequests,
  Bookings,
  atomicApproveRequest,
  atomicRejectRequest,
  getTravellersMap
} from '../server/src/models/db.js';

import { searchHotelsForGroup, recalculateDynamicCostSplit } from '../server/src/services/hotelPricingService.js';

test('Integration 1: Register Sarah & Priya profiles in persistent store', () => {
  const sarah = Travellers.findOne(t => t.traveller_id === 'T-001');
  assert.ok(sarah, 'Sarah (T-001) must exist');
  assert.equal(sarah.name, 'Sarah Thomas');
  assert.equal(sarah.gender, 'FEMALE');
  assert.equal(sarah.gender_preference, 'SAME_GENDER');

  const priya = Travellers.findOne(t => t.traveller_id === 'T-002');
  assert.ok(priya, 'Priya (T-002) must exist');
  assert.equal(priya.name, 'Priya Shah');
});

test('Integration 2: Group G-01 initial state and owner association', () => {
  Groups.update(g => g.group_id === 'G-01', g => ({ ...g, member_ids: ['T-001'] }));
  const g01 = Groups.findOne(g => g.group_id === 'G-01');
  assert.ok(g01, 'Group G-01 must exist');
  assert.equal(g01.owner_id, 'T-001');
  assert.equal(g01.city, 'Kyoto');
  assert.deepEqual(g01.member_ids, ['T-001']);
  assert.equal(g01.max_size, 3);
});

test('Integration 3: Express interest and approval flow for Priya into G-01', () => {
  const testReqId = `REQ-TEST-PRIYA-01`;
  // Clean up any test artifact and ensure G-01 is in initial state
  JoinRequests.delete(r => r.request_id === testReqId);
  Groups.update(g => g.group_id === 'G-01', g => ({
    ...g,
    member_ids: ['T-001']
  }));

  const reqDoc = {
    request_id: testReqId,
    group_id: 'G-01',
    traveller_id: 'T-002',
    status: 'pending',
    applicantDetails: {
      traveller_id: 'T-002',
      destination: 'Kyoto',
      check_in: '2027-04-09',
      check_out: '2027-04-16',
      budget_inr: 62000,
      interests: ['TEMPLES', 'STREET_FOOD', 'ADVENTURE'],
      gender: 'FEMALE',
      gender_preference: 'SAME_GENDER'
    },
    created_at: new Date().toISOString()
  };
  JoinRequests.insert(reqDoc);

  // Unauthorized approval attempt by non-owner should fail
  const unauthorized = atomicApproveRequest(testReqId, 'T-003');
  assert.equal(unauthorized.success, false);
  assert.match(unauthorized.error, /Unauthorized/i);

  // Legitimate approval by Sarah (T-001)
  const approved = atomicApproveRequest(testReqId, 'T-001');
  assert.equal(approved.success, true);
  assert.equal(approved.request.status, 'approved');

  // Verify group members now includes Priya (T-002)
  const updatedGroup = Groups.findOne(g => g.group_id === 'G-01');
  assert.ok(updatedGroup.member_ids.includes('T-002'));
  assert.equal(updatedGroup.member_ids.length, 2);

  // Duplicate approval attempt should fail
  const duplicateApproval = atomicApproveRequest(testReqId, 'T-001');
  assert.equal(duplicateApproval.success, false);
});

test('Integration 4: Dynamic Cost Split for Kyoto Hotel after Priya joined', () => {
  const updatedGroup = Groups.findOne(g => g.group_id === 'G-01');
  assert.equal(updatedGroup.member_ids.length, 2);

  // Twin Room RM-KYO-001-A for 2 members:
  const recalc2 = recalculateDynamicCostSplit('RM-KYO-001-A', '2027-04-10', '2027-04-15', 2);
  assert.equal(recalc2.membersCount, 2);
  assert.equal(recalc2.roomsNeeded, 1);
  assert.equal(recalc2.totalCost, 23800);
  assert.equal(recalc2.costPerPerson, 11900);

  // If a 3rd member joins (max capacity 3), 2 rooms are needed:
  const recalc3 = recalculateDynamicCostSplit('RM-KYO-001-A', '2027-04-10', '2027-04-15', 3);
  assert.equal(recalc3.membersCount, 3);
  assert.equal(recalc3.roomsNeeded, 2); // 3 people / 2 maxAdults = 2 rooms
  assert.equal(recalc3.totalCost, 47600);
  assert.equal(recalc3.costPerPerson, 15867); // 47600 / 3
});

test('Integration 5: Persistence survives simulated collection reload', () => {
  // Re-read collection from disk directly
  const reloadedGroups = Groups.find();
  const g01 = reloadedGroups.find(g => g.group_id === 'G-01');
  assert.ok(g01.member_ids.includes('T-002'), 'Priya membership must persist on disk');

  // Teardown: restore G-01 to initial state and delete test request
  Groups.update(g => g.group_id === 'G-01', g => ({
    ...g,
    member_ids: ['T-001']
  }));
  JoinRequests.delete(r => r.request_id === 'REQ-TEST-PRIYA-01');
});
