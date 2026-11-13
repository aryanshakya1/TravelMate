/**
 * TravelMate — Leave Group Feature Tests
 * Tests: leave, disband, transfer ownership, booking block, seat count.
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

import {
  Travellers,
  Groups,
  JoinRequests,
  SavedHotels,
  Bookings,
  Messages,
  atomicApproveRequest,
  atomicLeaveGroup,
  atomicDisbandGroup,
  atomicTransferOwnership
} from '../server/src/models/db.js';

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeTestTraveller(id, overrides = {}) {
  return {
    traveller_id: id,
    name: `Test User ${id}`,
    age: 28,
    gender: 'FEMALE',
    home_city: 'Bengaluru',
    home_airport: 'BLR',
    interests: ['TEMPLES', 'STREET_FOOD', 'NATURE'],
    gender_preference: 'ANY',
    created_at: new Date().toISOString(),
    ...overrides
  };
}

function makeTestGroup(id, ownerId, memberIds = [], overrides = {}) {
  return {
    group_id: id,
    name: `Test Trip ${id}`,
    owner_id: ownerId,
    city: 'Kyoto',
    check_in: '2027-04-05',
    check_out: '2027-04-10',
    budget_inr: 80000,
    max_size: 4,
    member_ids: [...memberIds],
    gender_preference: 'ANY',
    itinerary: 'Test itinerary',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  };
}

// ─── Setup: register travellers & groups used in tests ────────────────────────

// Use timestamp-based IDs so each test run starts completely fresh
const RUN_ID     = Date.now().toString().slice(-6);
const OWNER_ID   = `TLG-OWNER-${RUN_ID}`;
const MEMBER1_ID = `TLG-M1-${RUN_ID}`;
const MEMBER2_ID = `TLG-M2-${RUN_ID}`;
const GROUP_A    = `TLG-GA-${RUN_ID}`;
const GROUP_B    = `TLG-GB-${RUN_ID}`;
const GROUP_C    = `TLG-GC-${RUN_ID}`;
const GROUP_D    = `TLG-GD-${RUN_ID}`;

before(() => {
  // Register test travellers (avoid duplicates)
  for (const t of [
    makeTestTraveller(OWNER_ID),
    makeTestTraveller(MEMBER1_ID),
    makeTestTraveller(MEMBER2_ID)
  ]) {
    if (!Travellers.findOne(x => x.traveller_id === t.traveller_id)) {
      Travellers.insert(t);
    }
  }

  // Register test groups (owner is in member_ids by convention)
  for (const g of [
    makeTestGroup(GROUP_A, OWNER_ID, [OWNER_ID, MEMBER1_ID, MEMBER2_ID]),
    makeTestGroup(GROUP_B, OWNER_ID, [OWNER_ID, MEMBER1_ID]),
    makeTestGroup(GROUP_C, OWNER_ID, [OWNER_ID, MEMBER1_ID, MEMBER2_ID]),
    makeTestGroup(GROUP_D, OWNER_ID, [OWNER_ID, MEMBER1_ID])
  ]) {
    if (!Groups.findOne(x => x.group_id === g.group_id)) {
      Groups.insert(g);
    }
  }

  // Add a saved hotel to GROUP_B to verify disband cleans it up
  if (!SavedHotels.findOne(s => s.group_id === GROUP_B)) {
    SavedHotels.insert({
      saved_id: 'TLG-SH-01',
      group_id: GROUP_B,
      hotel_id: 'H-KYT-01',
      room_id:  'R-KYT-01-S',
      traveller_id: OWNER_ID,
      saved_at: new Date().toISOString()
    });
  }

  // Add a message to GROUP_B
  if (!Messages.findOne(m => m.group_id === GROUP_B)) {
    Messages.insert({
      message_id: 'TLG-MSG-01',
      group_id: GROUP_B,
      sender_id: OWNER_ID,
      text: 'Hello group!',
      sent_at: new Date().toISOString()
    });
  }

  // Add a join request to GROUP_B
  if (!JoinRequests.findOne(r => r.group_id === GROUP_B)) {
    JoinRequests.insert({
      request_id: 'TLG-REQ-01',
      group_id: GROUP_B,
      traveller_id: MEMBER2_ID,
      status: 'pending',
      created_at: new Date().toISOString()
    });
  }

  // Finalize a booking for GROUP_D (to test the booking lock)
  if (!Bookings.findOne(b => b.group_id === GROUP_D)) {
    Bookings.insert({
      booking_id: 'TLG-BK-01',
      group_id:   GROUP_D,
      booking_reference: 'TM-TESTLK',
      room_id:    'R-KYT-01-S',
      traveller_id: OWNER_ID,
      total_cost: 50000,
      per_person_cost: 25000,
      created_at: new Date().toISOString()
    });
  }
});

// ─── TESTS ────────────────────────────────────────────────────────────────────

it('LG-1: Non-owner member can leave group before booking', () => {
  const before = Groups.findOne(g => g.group_id === GROUP_A);
  const beforeCount = before.member_ids.length;

  const result = atomicLeaveGroup(GROUP_A, MEMBER1_ID);

  assert.equal(result.success, true, 'Leave should succeed');

  const after = Groups.findOne(g => g.group_id === GROUP_A);
  assert.equal(after.member_ids.length, beforeCount - 1, 'member_ids should shrink by 1');
  assert.equal(after.member_ids.includes(MEMBER1_ID), false, 'Leaver should not be in member_ids');
});

it('LG-2: Available seats increase after a member leaves', () => {
  // GROUP_A now has OWNER + MEMBER2 (MEMBER1 already left in LG-1)
  const group = Groups.findOne(g => g.group_id === GROUP_A);
  const occupiedSeats = group.member_ids.length;
  const availableSeats = group.max_size - occupiedSeats;

  assert.ok(availableSeats > 0, 'Available seats should be positive after MEMBER1 left');
});

it('LG-3: Owner cannot leave directly — gets USE_TRANSFER_OR_DISBAND error', () => {
  const result = atomicLeaveGroup(GROUP_A, OWNER_ID);

  assert.equal(result.success, false);
  assert.equal(result.error, 'USE_TRANSFER_OR_DISBAND', 'Should return special error code for owner');
});

it('LG-4: Cannot leave a group with a finalized booking', () => {
  const result = atomicLeaveGroup(GROUP_D, MEMBER1_ID);

  assert.equal(result.success, false);
  assert.match(result.error, /finalized booking/i, 'Should block leaving if booking exists');
});

it('LG-5: Cannot leave a group you are not a member of', () => {
  const result = atomicLeaveGroup(GROUP_A, 'NON-EXISTENT-ID');

  assert.equal(result.success, false);
  assert.match(result.error, /not an approved member/i);
});

it('LG-6: Disband group removes group, requests, saved hotels, and messages', () => {
  const result = atomicDisbandGroup(GROUP_B, OWNER_ID);

  assert.equal(result.success, true, 'Disband should succeed');
  assert.equal(Groups.findOne(g => g.group_id === GROUP_B), null, 'Group should be deleted');
  assert.equal(JoinRequests.find(r => r.group_id === GROUP_B).length, 0, 'JoinRequests should be deleted');
  assert.equal(SavedHotels.find(s => s.group_id === GROUP_B).length, 0, 'SavedHotels should be deleted');
  assert.equal(Messages.find(m => m.group_id === GROUP_B).length, 0, 'Messages should be deleted');
});

it('LG-7: Non-owner cannot disband a group', () => {
  // GROUP_C still exists; MEMBER1 tries to disband it
  const result = atomicDisbandGroup(GROUP_C, MEMBER1_ID);

  assert.equal(result.success, false);
  assert.match(result.error, /unauthorized/i);
});

it('LG-8: Cannot disband a group with a finalized booking', () => {
  const result = atomicDisbandGroup(GROUP_D, OWNER_ID);

  assert.equal(result.success, false);
  assert.match(result.error, /finalized booking/i);
});

it('LG-9: Transfer ownership to an approved member succeeds', () => {
  // GROUP_C: owner=OWNER_ID, members=[OWNER_ID, MEMBER1_ID, MEMBER2_ID]
  const result = atomicTransferOwnership(GROUP_C, OWNER_ID, MEMBER1_ID);

  assert.equal(result.success, true, 'Transfer should succeed');

  const group = Groups.findOne(g => g.group_id === GROUP_C);
  assert.equal(group.owner_id, MEMBER1_ID, 'New owner should be MEMBER1_ID');
  assert.equal(group.member_ids.includes(OWNER_ID), false, 'Old owner should have left member_ids');
  assert.equal(group.member_ids.includes(MEMBER1_ID), false, 'New owner should not be in member_ids (they are the owner now)');
});

it('LG-10: Cannot transfer ownership to a non-member', () => {
  // GROUP_A still exists (MEMBER1 left in LG-1); try transferring to MEMBER1 who is gone
  const result = atomicTransferOwnership(GROUP_A, OWNER_ID, MEMBER1_ID);

  assert.equal(result.success, false);
  assert.match(result.error, /approved member/i);
});

it('LG-11: Group does not exist — atomicLeaveGroup returns clear error', () => {
  const result = atomicLeaveGroup('NONEXISTENT-GROUP', MEMBER1_ID);

  assert.equal(result.success, false);
  assert.match(result.error, /not found/i);
});

it('LG-12: Group does not exist — atomicDisbandGroup returns clear error', () => {
  const result = atomicDisbandGroup('NONEXISTENT-GROUP', OWNER_ID);

  assert.equal(result.success, false);
  assert.match(result.error, /not found/i);
});
