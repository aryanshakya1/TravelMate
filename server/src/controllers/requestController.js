import { JoinRequests, Groups, Travellers, getTravellersMap, atomicApproveRequest, atomicRejectRequest } from '../models/db.js';
import { evaluateMatchRules, calculateCompatibilityScore } from '../services/matchingEngine.js';

export const createJoinRequest = (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { traveller_id, travellerId, message, check_in, checkIn, check_out, checkOut, budget_inr, budget } = req.body;

    const applicantId = (traveller_id || travellerId || '').trim();
    if (!applicantId) {
      return res.status(400).json({ success: false, error: 'Applicant traveller ID is required.' });
    }

    const group = Groups.findOne(g => g.group_id === groupId);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    const applicant = Travellers.findOne(t => t.traveller_id === applicantId);
    if (!applicant) {
      return res.status(404).json({ success: false, error: 'Applicant traveller profile not found.' });
    }

    // Edge case: Owner attempting to join own group
    if (group.owner_id === applicantId) {
      return res.status(400).json({ success: false, error: 'You are the creator and owner of this group.' });
    }

    // Edge case: Already member
    if ((group.member_ids || []).includes(applicantId)) {
      return res.status(400).json({ success: false, error: 'You are already an approved member of this group.' });
    }

    // Edge case: Group is full
    if ((group.member_ids || []).length >= group.max_size) {
      return res.status(400).json({ success: false, error: 'This group is already at full capacity.' });
    }

    // Edge case: Duplicate pending request
    const existingPending = JoinRequests.findOne(r => r.group_id === groupId && r.traveller_id === applicantId && r.status === 'pending');
    if (existingPending) {
      return res.status(400).json({
        success: false,
        error: 'You already have a pending join request for this group. Please wait for the creator to review it.',
        request: existingPending
      });
    }

    // Evaluate rules
    const owner = Travellers.findOne(t => t.traveller_id === group.owner_id);
    const applicantCriteria = {
      traveller_id: applicant.traveller_id,
      destination: group.city,
      check_in: (check_in || checkIn || group.check_in),
      check_out: (check_out || checkOut || group.check_out),
      budget_inr: Number(budget_inr || budget || group.budget_inr),
      interests: applicant.interests,
      gender: applicant.gender,
      gender_preference: applicant.gender_preference
    };

    const evalResult = evaluateMatchRules(applicantCriteria, group, owner);
    const compScore = calculateCompatibilityScore(applicantCriteria, group, owner, evalResult);

    // Generate request ID
    const allRequests = JoinRequests.find();
    const nextReqId = `REQ-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

    const newRequest = {
      request_id: nextReqId,
      group_id: groupId,
      traveller_id: applicantId,
      status: 'pending',
      message: (message || '').trim(),
      applicantDetails: applicantCriteria,
      compatibility: {
        score: compScore.score,
        breakdown: compScore.breakdown,
        matchReasons: {
          sharedInterests: evalResult.details.interests.shared,
          overlapNights: evalResult.details.dates.overlapNights,
          budgetDifference: evalResult.details.budget.diffBudget
        }
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    JoinRequests.insert(newRequest);

    res.status(201).json({
      success: true,
      message: 'Join request submitted successfully. Awaiting group owner approval.',
      request: newRequest
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getGroupRequests = (req, res) => {
  try {
    const { id: groupId } = req.params;
    const requests = JoinRequests.find(r => r.group_id === groupId);
    const travellersMap = getTravellersMap();

    const enriched = requests.map(r => ({
      ...r,
      applicant: travellersMap[r.traveller_id] || null
    }));

    res.json({
      success: true,
      count: enriched.length,
      requests: enriched
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateRequestStatus = (req, res) => {
  try {
    const { id: requestId } = req.params;
    const { action, owner_id, ownerId } = req.body;

    const finalOwnerId = (owner_id || ownerId || '').trim();
    if (!finalOwnerId) {
      return res.status(400).json({ success: false, error: 'Group owner ID is required for verification.' });
    }

    const normalizedAction = (action || '').toLowerCase();

    if (normalizedAction === 'approve') {
      const result = atomicApproveRequest(requestId, finalOwnerId);
      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.json({
        success: true,
        message: 'Request approved. Traveller is now a member of the group!',
        ...result
      });
    } else if (normalizedAction === 'reject') {
      const result = atomicRejectRequest(requestId, finalOwnerId);
      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.json({
        success: true,
        message: 'Request declined.',
        ...result
      });
    } else {
      return res.status(400).json({ success: false, error: "Action must be either 'approve' or 'reject'." });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
