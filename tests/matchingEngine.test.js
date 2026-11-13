import test from 'node:test';
import assert from 'node:assert/strict';

import {
  daysBetween,
  evaluateMatchRules,
  calculateCompatibilityScore,
  findMatches,
  normalizeInterests
} from '../server/src/services/matchingEngine.js';

import {
  getStayNights,
  calculateEqualCostAllocations,
  searchHotelsForGroup,
  recalculateDynamicCostSplit
} from '../server/src/services/hotelPricingService.js';

import { getSeedTravellers, getSeedGroups } from '../server/src/services/catalogService.js';

test('1. Calendar date overlap calculation', () => {
  assert.equal(daysBetween('2027-04-10', '2027-04-15'), 5);
  assert.equal(daysBetween('2027-04-14', '2027-04-15'), 1);
  assert.equal(daysBetween('2027-04-10', '2027-04-10'), 0);
  assert.equal(daysBetween('2027-04-15', '2027-04-10'), -5);
});

test('2. Rule 1: Same destination rule', () => {
  const group = { city: 'Kyoto', check_in: '2027-04-10', check_out: '2027-04-15', budget_inr: 60000, max_size: 3, member_ids: ['T-001'] };
  const owner = { traveller_id: 'T-001', gender: 'FEMALE', gender_preference: 'SAME_GENDER', interests: ['TEMPLES', 'STREET_FOOD'] };

  const matchingSeeker = { destination: 'Kyoto', check_in: '2027-04-10', check_out: '2027-04-15', budget_inr: 60000, gender: 'FEMALE', gender_preference: 'SAME_GENDER', interests: ['TEMPLES', 'STREET_FOOD'] };
  const nonMatchingSeeker = { ...matchingSeeker, destination: 'Osaka' };

  assert.equal(evaluateMatchRules(matchingSeeker, group, owner).rules.sameDestination, true);
  assert.equal(evaluateMatchRules(nonMatchingSeeker, group, owner).rules.sameDestination, false);
  assert.equal(evaluateMatchRules(nonMatchingSeeker, group, owner).isEligible, false);
});

test('3. Rule 2: Date overlap boundary test (>= 2 shared nights)', () => {
  const group = { city: 'Kyoto', check_in: '2027-04-10', check_out: '2027-04-15', budget_inr: 60000, max_size: 3, member_ids: ['T-001'] };
  const owner = { traveller_id: 'T-001', gender: 'FEMALE', gender_preference: 'SAME_GENDER', interests: ['TEMPLES', 'STREET_FOOD'] };

  // Exactly 2 nights overlap: April 13 to 17 (overlap: 13 to 15 = 2 nights)
  const twoNightsSeeker = { destination: 'Kyoto', check_in: '2027-04-13', check_out: '2027-04-17', budget_inr: 60000, gender: 'FEMALE', gender_preference: 'SAME_GENDER', interests: ['TEMPLES', 'STREET_FOOD'] };
  const eval2 = evaluateMatchRules(twoNightsSeeker, group, owner);
  assert.equal(eval2.rules.validDateOverlap, true);
  assert.equal(eval2.details.dates.overlapNights, 2);
  assert.equal(eval2.isEligible, true);

  // Exactly 1 night overlap: April 14 to 18 (overlap: 14 to 15 = 1 night)
  const oneNightSeeker = { destination: 'Kyoto', check_in: '2027-04-14', check_out: '2027-04-18', budget_inr: 60000, gender: 'FEMALE', gender_preference: 'SAME_GENDER', interests: ['TEMPLES', 'STREET_FOOD'] };
  const eval1 = evaluateMatchRules(oneNightSeeker, group, owner);
  assert.equal(eval1.rules.validDateOverlap, false);
  assert.equal(eval1.details.dates.overlapNights, 1);
  assert.equal(eval1.isEligible, false);
});

test('4. Rule 3: Budget boundary test (difference <= 40% of lower budget)', () => {
  const group = { city: 'Kyoto', check_in: '2027-04-10', check_out: '2027-04-15', budget_inr: 60000, max_size: 3, member_ids: ['T-001'] };
  const owner = { traveller_id: 'T-001', gender: 'FEMALE', gender_preference: 'SAME_GENDER', interests: ['TEMPLES', 'STREET_FOOD'] };

  // Exactly 40% difference: lower is 60,000, 40% is 24,000 -> seeker budget 84,000
  const boundaryBudgetSeeker = { destination: 'Kyoto', check_in: '2027-04-10', check_out: '2027-04-15', budget_inr: 84000, gender: 'FEMALE', gender_preference: 'SAME_GENDER', interests: ['TEMPLES', 'STREET_FOOD'] };
  const evalBoundary = evaluateMatchRules(boundaryBudgetSeeker, group, owner);
  assert.equal(evalBoundary.rules.budgetCompatible, true);
  assert.equal(evalBoundary.isEligible, true);

  // Incompatible budget: difference 25,000 > 24,000 -> seeker budget 85,000
  const overBudgetSeeker = { ...boundaryBudgetSeeker, budget_inr: 85000 };
  const evalOver = evaluateMatchRules(overBudgetSeeker, group, owner);
  assert.equal(evalOver.rules.budgetCompatible, false);
  assert.equal(evalOver.isEligible, false);
});

test('5. Rule 4: Shared interests boundary test (at least 2 with owner)', () => {
  const group = { city: 'Kyoto', check_in: '2027-04-10', check_out: '2027-04-15', budget_inr: 60000, max_size: 3, member_ids: ['T-001'] };
  const owner = { traveller_id: 'T-001', gender: 'FEMALE', gender_preference: 'SAME_GENDER', interests: ['TEMPLES', 'STREET_FOOD', 'PHOTOGRAPHY'] };

  // Exactly 2 shared: TEMPLES, STREET_FOOD
  const twoInterestsSeeker = { destination: 'Kyoto', check_in: '2027-04-10', check_out: '2027-04-15', budget_inr: 60000, gender: 'FEMALE', gender_preference: 'SAME_GENDER', interests: ['TEMPLES', 'STREET_FOOD', 'ADVENTURE'] };
  const eval2 = evaluateMatchRules(twoInterestsSeeker, group, owner);
  assert.equal(eval2.rules.interestsCompatible, true);
  assert.equal(eval2.details.interests.sharedCount, 2);
  assert.equal(eval2.isEligible, true);

  // Only 1 shared: TEMPLES
  const oneInterestSeeker = { destination: 'Kyoto', check_in: '2027-04-10', check_out: '2027-04-15', budget_inr: 60000, gender: 'FEMALE', gender_preference: 'SAME_GENDER', interests: ['TEMPLES', 'HIKING', 'NIGHTLIFE'] };
  const eval1 = evaluateMatchRules(oneInterestSeeker, group, owner);
  assert.equal(eval1.rules.interestsCompatible, false);
  assert.equal(eval1.details.interests.sharedCount, 1);
  assert.equal(eval1.isEligible, false);
});

test('6. Rule 5: Mutual gender preference test', () => {
  const group = { city: 'Kyoto', check_in: '2027-04-10', check_out: '2027-04-15', budget_inr: 60000, max_size: 3, member_ids: ['T-001'] };
  const femaleSameGenderOwner = { traveller_id: 'T-001', gender: 'FEMALE', gender_preference: 'SAME_GENDER', interests: ['TEMPLES', 'STREET_FOOD'] };

  // Female + SAME_GENDER seeker -> Match
  const femaleSeeker = { destination: 'Kyoto', check_in: '2027-04-10', check_out: '2027-04-15', budget_inr: 60000, gender: 'FEMALE', gender_preference: 'SAME_GENDER', interests: ['TEMPLES', 'STREET_FOOD'] };
  assert.equal(evaluateMatchRules(femaleSeeker, group, femaleSameGenderOwner).rules.genderCompatible, true);

  // Male seeker -> Incompatible
  const maleSeeker = { ...femaleSeeker, gender: 'MALE', gender_preference: 'ANY' };
  assert.equal(evaluateMatchRules(maleSeeker, group, femaleSameGenderOwner).rules.genderCompatible, false);
  assert.equal(evaluateMatchRules(maleSeeker, group, femaleSameGenderOwner).isEligible, false);
});

test('7. Rule 6: Group capacity & existing member exclusion', () => {
  const fullGroup = { city: 'Kyoto', check_in: '2027-04-10', check_out: '2027-04-15', budget_inr: 60000, max_size: 3, member_ids: ['T-001', 'T-002', 'T-003'] };
  const owner = { traveller_id: 'T-001', gender: 'FEMALE', gender_preference: 'SAME_GENDER', interests: ['TEMPLES', 'STREET_FOOD'] };
  const seeker = { traveller_id: 'T-004', destination: 'Kyoto', check_in: '2027-04-10', check_out: '2027-04-15', budget_inr: 60000, gender: 'FEMALE', gender_preference: 'SAME_GENDER', interests: ['TEMPLES', 'STREET_FOOD'] };

  // Full group
  assert.equal(evaluateMatchRules(seeker, fullGroup, owner).rules.hasCapacity, false);
  assert.equal(evaluateMatchRules(seeker, fullGroup, owner).isEligible, false);

  // Already a member
  const openGroup = { ...fullGroup, max_size: 4 };
  const existingMemberSeeker = { ...seeker, traveller_id: 'T-002' };
  const evalExisting = evaluateMatchRules(existingMemberSeeker, openGroup, owner);
  assert.equal(evalExisting.rules.notAlreadyMember, false);
  assert.equal(evalExisting.isEligible, false);
});

test('8. End-to-End Hackathon Scenario: Priya searches and finds Sarah (G-01)', () => {
  const seedTravellers = getSeedTravellers();
  const seedGroups = getSeedGroups();
  const travellersById = {};
  for (const t of seedTravellers) travellersById[t.traveller_id] = t;

  // Priya's exact scenario from problem-3-group-travel-matcher.md:
  // Kyoto, 9 to 16 April 2027, budget ₹62,000, interests: TEMPLES, STREET_FOOD, ADVENTURE, FEMALE, SAME_GENDER
  const priya = {
    traveller_id: 'T-002',
    destination: 'Kyoto',
    check_in: '2027-04-09',
    check_out: '2027-04-16',
    budget_inr: 62000,
    interests: ['TEMPLES', 'STREET_FOOD', 'ADVENTURE'],
    gender: 'FEMALE',
    gender_preference: 'SAME_GENDER'
  };

  const results = findMatches(priya, seedGroups, travellersById);
  assert.ok(results.matches.length > 0, 'Priya must have at least one match');

  const g01Match = results.matches.find(m => m.groupId === 'G-01');
  assert.ok(g01Match, 'G-01 (Sarah Thomas) must be in Priya matching groups');
  assert.equal(g01Match.city, 'Kyoto');
  assert.equal(g01Match.matchReasons.overlapNights, 5);
  assert.equal(g01Match.matchReasons.sharedInterestsCount, 2);
  assert.equal(g01Match.matchReasons.budgetDifference, 2000);
  assert.equal(g01Match.compatibilityScore, 65, 'Compatibility score should be exactly 65 per formula');
});

test('9. Hotel stay nights and cost split calculation', () => {
  const stayNights = getStayNights('2027-04-10', '2027-04-15');
  assert.deepEqual(stayNights, [
    '2027-04-10',
    '2027-04-11',
    '2027-04-12',
    '2027-04-13',
    '2027-04-14'
  ]);
  assert.equal(stayNights.length, 5);

  // Worked example from DATA_DICTIONARY.md:
  // Twin Room ₹4,760 per night, 5 nights, 2 members -> total ₹23,800 -> ₹11,900 each
  const totalCost = 4760 * 5 * 1;
  assert.equal(totalCost, 23800);
  const allocations = calculateEqualCostAllocations(totalCost, ['Sarah', 'Priya']);
  assert.equal(allocations.length, 2);
  assert.equal(allocations[0].shareInr, 11900);
  assert.equal(allocations[1].shareInr, 11900);
  assert.equal(allocations[0].shareInr + allocations[1].shareInr, 23800);
});

test('10. Deterministic odd rupee remainder allocation', () => {
  // Total ₹10,000 for 3 members: 10,000 / 3 = 3333.33 -> 3334, 3333, 3333 = 10,000 exactly!
  const allocations = calculateEqualCostAllocations(10000, ['A', 'B', 'C']);
  assert.equal(allocations[0].shareInr, 3334);
  assert.equal(allocations[1].shareInr, 3333);
  assert.equal(allocations[2].shareInr, 3333);
  const sum = allocations.reduce((acc, a) => acc + a.shareInr, 0);
  assert.equal(sum, 10000);
});
