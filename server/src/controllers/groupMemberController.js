/**
 * TravelMate — Group Membership Controller
 * Handles Leave Group, Disband Group, and Transfer Ownership.
 */

import {
  atomicLeaveGroup,
  atomicDisbandGroup,
  atomicTransferOwnership
} from '../models/db.js';

/**
 * DELETE /api/groups/:id/members/:travellerId
 * A non-owner member leaves the group.
 */
export async function leaveGroup(req, res) {
  try {
    const { id: groupId, travellerId } = req.params;

    if (!groupId || !travellerId) {
      return res.status(400).json({ error: 'groupId and travellerId are required.' });
    }

    const result = atomicLeaveGroup(groupId, travellerId);

    if (!result.success) {
      // Special code: frontend should show Transfer/Disband dialog
      if (result.error === 'USE_TRANSFER_OR_DISBAND') {
        return res.status(409).json({
          error: 'USE_TRANSFER_OR_DISBAND',
          message: 'As the group owner, you must transfer leadership or disband the group.'
        });
      }
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      success: true,
      message: 'You have successfully left the group.',
      group: result.group
    });
  } catch (err) {
    console.error('leaveGroup error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error.' });
  }
}

/**
 * DELETE /api/groups/:id?owner_id=xxx
 * Owner disbands the group and deletes all associated data.
 */
export async function disbandGroup(req, res) {
  try {
    const { id: groupId } = req.params;
    const ownerId = req.query.owner_id || req.body?.owner_id;

    if (!groupId || !ownerId) {
      return res.status(400).json({ error: 'groupId and owner_id are required.' });
    }

    const result = atomicDisbandGroup(groupId, ownerId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      success: true,
      message: 'Group has been disbanded and all associated data removed.'
    });
  } catch (err) {
    console.error('disbandGroup error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error.' });
  }
}

/**
 * PATCH /api/groups/:id/owner
 * Owner transfers leadership to another approved member, then leaves.
 * Body: { current_owner_id, new_owner_id }
 */
export async function transferOwnership(req, res) {
  try {
    const { id: groupId } = req.params;
    const { current_owner_id, new_owner_id } = req.body || {};

    if (!groupId || !current_owner_id || !new_owner_id) {
      return res.status(400).json({ error: 'groupId, current_owner_id, and new_owner_id are required.' });
    }

    if (current_owner_id === new_owner_id) {
      return res.status(400).json({ error: 'New owner must be a different member.' });
    }

    const result = atomicTransferOwnership(groupId, current_owner_id, new_owner_id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      success: true,
      message: 'Ownership transferred successfully.',
      group: result.group
    });
  } catch (err) {
    console.error('transferOwnership error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error.' });
  }
}
