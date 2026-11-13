import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

import {
  Travellers,
  Groups,
  JoinRequests,
  SavedHotels,
  Bookings,
  atomicApproveRequest,
  getTravellersMap
} from '../server/src/models/db.js';

import { findMatches } from '../server/src/services/matchingEngine.js';
import { searchHotelsForGroup, recalculateDynamicCostSplit } from '../server/src/services/hotelPricingService.js';

test('End-to-End Complete TravelMate Group Travel Lifecycle Test', () => {
  // Step 1: Register Sarah (Group Creator)
  const sarahId = 'T-DEMO-SARAH';
  Travellers.delete(t => t.traveller_id === sarahId);
  const sarah = Travellers.insert({
    traveller_id: sarahId,
    name: 'Sarah Thomas (Demo)',
    age: 27,
    gender: 'FEMALE',
    home_city: 'Bengaluru',
    home_airport: 'BLR',
    interests: ['TEMPLES', 'STREET_FOOD', 'PHOTOGRAPHY', 'BUDGET_STAYS'],
    gender_preference: 'SAME_GENDER',
    created_at: new Date().toISOString()
  });
  assert.ok(sarah, 'Sarah registered');

  // Step 2: Sarah creates Kyoto group post
  const demoGroupId = 'G-DEMO-KYOTO';
  Groups.delete(g => g.group_id === demoGroupId);
  const sarahGroup = Groups.insert({
    group_id: demoGroupId,
    name: 'Kyoto Spring Cherry & Temples',
    owner_id: sarahId,
    member_ids: [sarahId],
    city: 'Kyoto',
    check_in: '2027-04-10',
    check_out: '2027-04-15',
    max_size: 3,
    budget_inr: 60000,
    itinerary: 'Fushimi Inari, Nishiki Market street food crawl, Gion historic walk.',
    created_at: new Date().toISOString()
  });
  assert.ok(sarahGroup, 'Sarah created Kyoto group');
  assert.equal(sarahGroup.member_ids.length, 1);

  // Step 3: Register Priya (Group Seeker)
  const priyaId = 'T-DEMO-PRIYA';
  Travellers.delete(t => t.traveller_id === priyaId);
  const priya = Travellers.insert({
    traveller_id: priyaId,
    name: 'Priya Shah (Demo)',
    age: 26,
    gender: 'FEMALE',
    home_city: 'Mumbai',
    home_airport: 'BOM',
    interests: ['TEMPLES', 'STREET_FOOD', 'ADVENTURE'],
    gender_preference: 'SAME_GENDER',
    created_at: new Date().toISOString()
  });
  assert.ok(priya, 'Priya registered');

  // Step 4: Priya searches for groups in Kyoto
  const seekerQuery = {
    traveller_id: priyaId,
    destination: 'Kyoto',
    check_in: '2027-04-09',
    check_out: '2027-04-16',
    budget_inr: 62000,
    interests: priya.interests,
    gender: priya.gender,
    gender_preference: priya.gender_preference
  };

  const allGroups = Groups.find();
  const travellersMap = getTravellersMap();
  const searchResults = findMatches(seekerQuery, allGroups, travellersMap);

  assert.ok(searchResults.matches.length > 0, 'Matching groups found');
  const matchedSarahGroup = searchResults.matches.find(m => m.groupId === demoGroupId);
  assert.ok(matchedSarahGroup, "Sarah's group matched all 6 rules");
  assert.equal(matchedSarahGroup.matchReasons.overlapNights, 5);
  assert.equal(matchedSarahGroup.matchReasons.sharedInterestsCount, 2);
  assert.equal(matchedSarahGroup.compatibilityScore, 65);

  // Step 5: Priya expresses interest in Sarah's group
  const reqId = `REQ-DEMO-PRIYA-SARAH`;
  JoinRequests.delete(r => r.request_id === reqId);
  const joinRequest = JoinRequests.insert({
    request_id: reqId,
    group_id: demoGroupId,
    traveller_id: priyaId,
    status: 'pending',
    applicantDetails: seekerQuery,
    created_at: new Date().toISOString()
  });
  assert.equal(joinRequest.status, 'pending');

  // Step 6: Sarah approves Priya's request
  const approvalRes = atomicApproveRequest(reqId, sarahId);
  assert.equal(approvalRes.success, true, 'Sarah approved Priya');

  const refreshedGroup = Groups.findOne(g => g.group_id === demoGroupId);
  assert.equal(refreshedGroup.member_ids.length, 2, 'Group now has 2 members');
  assert.deepEqual(refreshedGroup.member_ids, [sarahId, priyaId]);

  // Step 7: Search catalog hotels for Kyoto stay dates
  const hotelSearchResult = searchHotelsForGroup(
    refreshedGroup.city,
    refreshedGroup.check_in,
    refreshedGroup.check_out,
    refreshedGroup.member_ids
  );
  assert.ok(hotelSearchResult.options.length > 0, 'Hotels available in Kyoto');
  const chosenOption = hotelSearchResult.options[0];
  assert.ok(chosenOption.totalCost > 0);
  assert.equal(chosenOption.membersCount, 2);
  assert.equal(chosenOption.costPerPerson, Math.round(chosenOption.totalCost / 2));

  // Step 8: Save hotel option to group shortlist
  const savedId = `SH-DEMO-01`;
  SavedHotels.delete(s => s.saved_id === savedId);
  const savedOption = SavedHotels.insert({
    saved_id: savedId,
    group_id: demoGroupId,
    hotel_id: chosenOption.hotelId,
    hotel_name: chosenOption.hotelName,
    room_id: chosenOption.roomId,
    room_name: chosenOption.roomName,
    room_type: chosenOption.roomType,
    rooms_needed: chosenOption.roomsNeeded,
    total_cost: chosenOption.totalCost,
    cost_per_person: chosenOption.costPerPerson,
    saved_by_traveller_ids: [priyaId, sarahId],
    created_at: new Date().toISOString()
  });
  assert.ok(savedOption, 'Hotel shortlisted by members');

  // Step 9: Finalize mock booking
  const bookingId = `BK-DEMO-01`;
  Bookings.delete(b => b.group_id === demoGroupId);
  const booking = Bookings.insert({
    booking_id: bookingId,
    booking_reference: 'TM-DEMO99',
    group_id: demoGroupId,
    group_name: refreshedGroup.name,
    hotel_id: chosenOption.hotelId,
    hotel_name: chosenOption.hotelName,
    room_id: chosenOption.roomId,
    room_name: chosenOption.roomName,
    room_type: chosenOption.roomType,
    rooms_needed: chosenOption.roomsNeeded,
    check_in: refreshedGroup.check_in,
    check_out: refreshedGroup.check_out,
    nights_count: 5,
    members_count: 2,
    member_ids: [sarahId, priyaId],
    total_cost: chosenOption.totalCost,
    cost_per_person: chosenOption.costPerPerson,
    status: 'CONFIRMED',
    finalized_by: sarahId,
    finalized_at: new Date().toISOString(),
    disclaimer: 'This is a mock booking. No real hotel reservation or payment occurred.'
  });
  assert.equal(booking.status, 'CONFIRMED');
  assert.equal(booking.booking_reference, 'TM-DEMO99');

  // Step 10: Simulate server restart / persistence reload
  const reloadedBooking = Bookings.findOne(b => b.group_id === demoGroupId);
  assert.ok(reloadedBooking, 'Booking persisted on disk');
  assert.equal(reloadedBooking.booking_reference, 'TM-DEMO99');
  assert.equal(reloadedBooking.members_count, 2);

  // Clean up demo items
  Travellers.delete(t => t.traveller_id === sarahId || t.traveller_id === priyaId);
  Groups.delete(g => g.group_id === demoGroupId);
  JoinRequests.delete(r => r.request_id === reqId);
  SavedHotels.delete(s => s.saved_id === savedId);
  Bookings.delete(b => b.booking_id === bookingId);
});
