/**
 * TravelMate Matching Engine
 * Implements the 6 strict eligibility rules, explainable compatibility ranking,
 * and diagnostic reason tracking for no-match results.
 */

export function parseDateUtc(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return 0;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return 0;
  const [y, m, d] = parts.map(Number);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(startStr, endStr) {
  const start = parseDateUtc(startStr);
  const end = parseDateUtc(endStr);
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

export function normalizeInterests(interests) {
  if (!Array.isArray(interests)) return [];
  const set = new Set();
  for (const item of interests) {
    if (typeof item === 'string' && item.trim()) {
      set.add(item.trim().toUpperCase());
    }
  }
  return Array.from(set);
}

/**
 * Evaluates the 6 mandatory matching rules between a seeker and a group post (with owner).
 */
export function evaluateMatchRules(seeker, group, owner) {
  // 1. Same Destination
  const seekerDest = (seeker.destination || seeker.city || '').trim().toLowerCase();
  const groupDest = (group.city || '').trim().toLowerCase();
  const sameDestination = Boolean(seekerDest && groupDest && seekerDest === groupDest);

  // 2. Date Overlap (shared nights >= 2)
  const overlapStart = group.check_in > seeker.check_in ? group.check_in : seeker.check_in;
  const overlapEnd = group.check_out < seeker.check_out ? group.check_out : seeker.check_out;
  const overlapDays = daysBetween(overlapStart, overlapEnd);
  const overlapNights = Math.max(0, overlapDays);
  const validDateOverlap = overlapNights >= 2;

  // 3. Budget Compatibility (difference <= 40% of lower budget)
  const seekerBudget = Number(seeker.budget_inr || seeker.budget || 0);
  const groupBudget = Number(group.budget_inr || group.budget || 0);
  const diffBudget = Math.abs(seekerBudget - groupBudget);
  const lowerBudget = Math.min(seekerBudget, groupBudget);
  const budgetCompatible = seekerBudget > 0 && groupBudget > 0 && (diffBudget <= (lowerBudget * 0.40 + 1e-6));

  // 4. Shared Interests (at least 2 shared with group owner)
  const seekerInterests = normalizeInterests(seeker.interests);
  const ownerInterests = normalizeInterests(owner ? owner.interests : []);
  const ownerInterestSet = new Set(ownerInterests);
  const sharedInterests = seekerInterests.filter(i => ownerInterestSet.has(i));
  const interestsCompatible = sharedInterests.length >= 2;

  // 5. Mutual Gender Preference
  const seekerGender = (seeker.gender || '').trim().toUpperCase();
  const seekerPref = (seeker.gender_preference || 'ANY').trim().toUpperCase();
  const ownerGender = (owner ? owner.gender : '').trim().toUpperCase();
  const ownerPref = (owner ? owner.gender_preference : 'ANY').trim().toUpperCase();

  const seekerAllowsOwner = (seekerPref === 'ANY') || (seekerGender === ownerGender);
  const ownerAllowsSeeker = (ownerPref === 'ANY') || (ownerGender === seekerGender);
  const genderCompatible = Boolean(seekerGender && ownerGender && seekerAllowsOwner && ownerAllowsSeeker);

  // 6. Available Group Capacity & Existing Member check
  const memberIds = Array.isArray(group.member_ids) ? group.member_ids : [];
  const currentMembers = memberIds.length;
  const maxSize = Number(group.max_size || 4);
  const hasCapacity = (currentMembers + 1) <= maxSize;
  const isAlreadyMember = Boolean(seeker.traveller_id && memberIds.includes(seeker.traveller_id));

  // Strict rule: all 6 must pass AND not already a member
  const isEligible = sameDestination &&
    validDateOverlap &&
    budgetCompatible &&
    interestsCompatible &&
    genderCompatible &&
    hasCapacity &&
    !isAlreadyMember;

  return {
    isEligible,
    rules: {
      sameDestination,
      validDateOverlap,
      budgetCompatible,
      interestsCompatible,
      genderCompatible,
      hasCapacity,
      notAlreadyMember: !isAlreadyMember
    },
    details: {
      destination: { seeker: seekerDest, group: groupDest },
      dates: {
        seeker: { check_in: seeker.check_in, check_out: seeker.check_out },
        group: { check_in: group.check_in, check_out: group.check_out },
        overlapStart,
        overlapEnd,
        overlapNights
      },
      budget: {
        seekerBudget,
        groupBudget,
        diffBudget,
        lowerBudget,
        maxAllowedDiff: Math.round(lowerBudget * 0.40)
      },
      interests: {
        seeker: seekerInterests,
        owner: ownerInterests,
        shared: sharedInterests,
        sharedCount: sharedInterests.length
      },
      gender: {
        seekerGender,
        seekerPref,
        ownerGender,
        ownerPref,
        seekerAllowsOwner,
        ownerAllowsSeeker
      },
      capacity: {
        currentMembers,
        maxSize,
        availableSeats: Math.max(0, maxSize - currentMembers),
        isAlreadyMember
      }
    }
  };
}

/**
 * Calculates transparent, explainable compatibility score (0 - 100).
 * Only calculated for eligible groups.
 */
export function calculateCompatibilityScore(seeker, group, owner, evalResult) {
  const { details } = evalResult;

  // 1. Interest Similarity (40% weight)
  const combinedUniqueInterests = new Set([...details.interests.seeker, ...details.interests.owner]).size;
  const interestSimilarity = combinedUniqueInterests > 0
    ? (details.interests.sharedCount / combinedUniqueInterests)
    : 0;

  // 2. Date Overlap Similarity (35% weight)
  const groupNights = Math.max(1, daysBetween(group.check_in, group.check_out));
  const seekerNights = Math.max(1, daysBetween(seeker.check_in, seeker.check_out));
  const maxNights = Math.max(groupNights, seekerNights);
  const dateSimilarity = maxNights > 0 ? (details.dates.overlapNights / maxNights) : 0;

  // 3. Budget Similarity (25% weight)
  const maxBudget = Math.max(details.budget.groupBudget, details.budget.seekerBudget);
  const budgetSimilarity = maxBudget > 0
    ? (1 - Math.min(1, details.budget.diffBudget / maxBudget))
    : 0;

  const score = Math.round(
    interestSimilarity * 40 +
    dateSimilarity * 35 +
    budgetSimilarity * 25
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    breakdown: {
      interestSimilarity: Math.round(interestSimilarity * 100),
      dateSimilarity: Math.round(dateSimilarity * 100),
      budgetSimilarity: Math.round(budgetSimilarity * 100)
    }
  };
}

/**
 * Finds all eligible matching groups for a seeker, ranked deterministically,
 * along with failure diagnostics for no-match cases.
 */
export function findMatches(seeker, groups, travellersById) {
  const matches = [];
  const diagnostics = {
    totalGroupsEvaluated: groups.length,
    destinationMismatch: 0,
    insufficientOverlap: 0,
    budgetIncompatible: 0,
    insufficientInterests: 0,
    genderIncompatible: 0,
    groupFull: 0,
    alreadyMember: 0
  };

  for (const group of groups) {
    const owner = travellersById[group.owner_id] || null;
    const evalResult = evaluateMatchRules(seeker, group, owner);

    if (evalResult.isEligible) {
      const comp = calculateCompatibilityScore(seeker, group, owner, evalResult);
      matches.push({
        groupId: group.group_id,
        groupName: group.name,
        city: group.city,
        destination: group.city,
        checkIn: group.check_in,
        checkOut: group.check_out,
        budget: group.budget_inr,
        maxSize: group.max_size,
        currentMembers: (group.member_ids || []).length,
        availableSeats: group.max_size - (group.member_ids || []).length,
        itinerary: group.itinerary,
        owner: owner ? {
          travellerId: owner.traveller_id,
          name: owner.name,
          age: owner.age,
          gender: owner.gender,
          homeCity: owner.home_city,
          interests: owner.interests
        } : null,
        members: (group.member_ids || []).map(id => {
          const m = travellersById[id];
          return m ? { travellerId: m.traveller_id, name: m.name, homeCity: m.home_city } : { travellerId: id };
        }),
        compatibilityScore: comp.score,
        scoreBreakdown: comp.breakdown,
        matchReasons: {
          sharedInterests: evalResult.details.interests.shared,
          sharedInterestsCount: evalResult.details.interests.sharedCount,
          overlapNights: evalResult.details.dates.overlapNights,
          overlapStart: evalResult.details.dates.overlapStart,
          overlapEnd: evalResult.details.dates.overlapEnd,
          budgetDifference: evalResult.details.budget.diffBudget,
          mutualGenderCompatible: true,
          availableSeats: evalResult.details.capacity.availableSeats
        }
      });
    } else {
      // Tally diagnostics for helpful no-match guidance
      if (!evalResult.rules.sameDestination) diagnostics.destinationMismatch++;
      if (!evalResult.rules.validDateOverlap) diagnostics.insufficientOverlap++;
      if (!evalResult.rules.budgetCompatible) diagnostics.budgetIncompatible++;
      if (!evalResult.rules.interestsCompatible) diagnostics.insufficientInterests++;
      if (!evalResult.rules.genderCompatible) diagnostics.genderIncompatible++;
      if (!evalResult.rules.hasCapacity) diagnostics.groupFull++;
      if (!evalResult.rules.notAlreadyMember) diagnostics.alreadyMember++;
    }
  }

  // Deterministic sorting:
  // 1. Higher compatibility score
  // 2. More shared interests
  // 3. More overlapping nights
  // 4. Stable group ID
  matches.sort((a, b) => {
    if (b.compatibilityScore !== a.compatibilityScore) {
      return b.compatibilityScore - a.compatibilityScore;
    }
    if (b.matchReasons.sharedInterestsCount !== a.matchReasons.sharedInterestsCount) {
      return b.matchReasons.sharedInterestsCount - a.matchReasons.sharedInterestsCount;
    }
    if (b.matchReasons.overlapNights !== a.matchReasons.overlapNights) {
      return b.matchReasons.overlapNights - a.matchReasons.overlapNights;
    }
    return String(a.groupId).localeCompare(String(b.groupId));
  });

  return {
    matches,
    totalMatches: matches.length,
    diagnostics
  };
}

export default {
  parseDateUtc,
  daysBetween,
  normalizeInterests,
  evaluateMatchRules,
  calculateCompatibilityScore,
  findMatches
};
