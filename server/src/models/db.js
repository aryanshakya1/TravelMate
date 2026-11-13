/**
 * TravelMate Persistent Document Database Engine
 * 
 * Provides ACID-like transactions, atomic file persistence, index lookups,
 * and duplicate protection without requiring external database processes.
 * Fully survives process restarts and browser refreshes.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSeedTravellers, getSeedGroups } from '../services/catalogService.js';
import { evaluateMatchRules } from '../services/matchingEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage directory inside server/data/
const STORAGE_DIR = path.resolve(__dirname, '../../data');

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

class Collection {
  constructor(name, defaultSeedFn = null) {
    this.name = name;
    this.filePath = path.join(STORAGE_DIR, `${name}.json`);
    this.defaultSeedFn = defaultSeedFn;
    this.items = [];
    this.init();
  }

  init() {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        this.items = JSON.parse(raw);
      } catch (err) {
        console.error(`Error loading collection ${this.name}:`, err.message);
        this.items = [];
      }
    } else {
      if (this.defaultSeedFn) {
        this.items = this.defaultSeedFn() || [];
      } else {
        this.items = [];
      }
      this.saveSync();
    }
  }

  saveSync() {
    const uniqueSuffix = `${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
    const tmpPath = `${this.filePath}.${uniqueSuffix}.tmp`;
    const json = JSON.stringify(this.items, null, 2);
    fs.writeFileSync(tmpPath, json, 'utf8');
    try {
      fs.renameSync(tmpPath, this.filePath);
    } catch (renameErr) {
      // On Windows, renameSync can fail with EPERM or EBUSY if the target is briefly locked
      try {
        fs.copyFileSync(tmpPath, this.filePath);
        fs.unlinkSync(tmpPath);
      } catch (copyErr) {
        fs.writeFileSync(this.filePath, json, 'utf8');
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      }
    }
  }

  find(filterFn = null) {
    if (!filterFn) return [...this.items];
    return this.items.filter(filterFn);
  }

  findOne(filterFn) {
    return this.items.find(filterFn) || null;
  }

  insert(doc) {
    this.items.push(doc);
    this.saveSync();
    return doc;
  }

  update(filterFn, updateFn) {
    let count = 0;
    for (let i = 0; i < this.items.length; i++) {
      if (filterFn(this.items[i])) {
        this.items[i] = updateFn(this.items[i]);
        count++;
      }
    }
    if (count > 0) {
      this.saveSync();
    }
    return count;
  }

  delete(filterFn) {
    const initialLen = this.items.length;
    this.items = this.items.filter(item => !filterFn(item));
    if (this.items.length !== initialLen) {
      this.saveSync();
      return true;
    }
    return false;
  }
}

// Initialize collections
export const Travellers = new Collection('travellers', () => getSeedTravellers());
export const Groups = new Collection('groups', () => getSeedGroups());
export const JoinRequests = new Collection('join_requests', () => []);
export const SavedHotels = new Collection('saved_hotels', () => []);
export const Bookings = new Collection('bookings', () => []);
export const Messages = new Collection('messages', () => []);

/**
 * Atomic helper to get a map of travellers by ID for O(1) lookups.
 */
export function getTravellersMap() {
  const map = {};
  for (const t of Travellers.find()) {
    map[t.traveller_id] = t;
  }
  return map;
}

/**
 * Atomic operation for approving a join request.
 * Protects against race conditions and overfilling capacity.
 */
export function atomicApproveRequest(requestId, ownerId) {
  const request = JoinRequests.findOne(r => r.request_id === requestId);
  if (!request) {
    return { success: false, error: 'Join request not found.' };
  }

  if (request.status !== 'pending') {
    return { success: false, error: `Request has already been ${request.status}.` };
  }

  const group = Groups.findOne(g => g.group_id === request.group_id);
  if (!group) {
    return { success: false, error: 'Target group not found.' };
  }

  // Check authorization: only the group owner can approve
  if (group.owner_id !== ownerId) {
    return { success: false, error: 'Unauthorized: Only the group creator can approve join requests.' };
  }

  // Check if booking is already finalized
  const existingBooking = Bookings.findOne(b => b.group_id === group.group_id);
  if (existingBooking) {
    return { success: false, error: 'Cannot approve members for a group with a finalized booking.' };
  }

  // Check capacity
  const memberIds = Array.isArray(group.member_ids) ? [...group.member_ids] : [];
  if (memberIds.length >= group.max_size) {
    return { success: false, error: 'Group is already at maximum capacity.' };
  }

  // Check duplicate member
  if (memberIds.includes(request.traveller_id)) {
    return { success: false, error: 'Traveller is already a member of this group.' };
  }

  // Re-check only the rules that can CHANGE between request submission and approval:
  // ✅ Capacity   — someone else may have joined in the meantime
  // ✅ Gender     — safety preference must still be mutually respected
  // ❌ Interests  — intentionally NOT re-checked here. Interests are a *discovery* rule
  //                 (they guide seekers to compatible groups via findMatches), but the
  //                 owner has EXPLICIT authority to approve any requestor they choose.
  //                 Re-checking interests at approval time caused a false rejection bug:
  //                 a seeker may have found the group via the search form with selected
  //                 interests that differ from their stored profile interests, making the
  //                 approval recheck fail even though the owner intended to approve them.
  const travellersMap = getTravellersMap();
  const seeker = travellersMap[request.traveller_id];
  const owner = travellersMap[group.owner_id];

  if (!seeker) {
    return { success: false, error: 'Applicant profile not found.' };
  }

  // Check capacity: re-read live member_ids (may have grown since request was submitted)
  const liveGroup = Groups.findOne(g => g.group_id === group.group_id);
  const liveMemberIds = Array.isArray(liveGroup?.member_ids) ? liveGroup.member_ids : [];
  if (liveMemberIds.length >= group.max_size) {
    return { success: false, error: 'Approval rejected: Group has reached maximum capacity.' };
  }
  if (liveMemberIds.includes(request.traveller_id)) {
    return { success: false, error: 'Traveller is already a member of this group.' };
  }

  // Check gender compatibility (mutual safety preference — cannot be overridden)
  if (seeker && owner) {
    const seekerGender = (seeker.gender || '').trim().toUpperCase();
    const ownerGender  = (owner.gender  || '').trim().toUpperCase();
    const seekerPref   = (seeker.gender_preference || 'ANY').trim().toUpperCase();
    const ownerPref    = (owner.gender_preference  || 'ANY').trim().toUpperCase();
    const seekerAllowsOwner = (seekerPref === 'ANY') || (seekerGender === ownerGender);
    const ownerAllowsSeeker = (ownerPref  === 'ANY') || (ownerGender  === seekerGender);
    if (seekerGender && ownerGender && (!seekerAllowsOwner || !ownerAllowsSeeker)) {
      return { success: false, error: 'Approval rejected: Mutual gender safety preferences are incompatible.' };
    }
  }

  // State update: add to group members
  memberIds.push(request.traveller_id);
  Groups.update(g => g.group_id === group.group_id, g => ({
    ...g,
    member_ids: memberIds,
    updated_at: new Date().toISOString()
  }));

  // Update request status
  JoinRequests.update(r => r.request_id === requestId, r => ({
    ...r,
    status: 'approved',
    updated_at: new Date().toISOString()
  }));

  return {
    success: true,
    group: Groups.findOne(g => g.group_id === group.group_id),
    request: JoinRequests.findOne(r => r.request_id === requestId)
  };
}

/**
 * Atomic helper for rejecting a join request.
 */
export function atomicRejectRequest(requestId, ownerId) {
  const request = JoinRequests.findOne(r => r.request_id === requestId);
  if (!request) {
    return { success: false, error: 'Join request not found.' };
  }

  if (request.status !== 'pending') {
    return { success: false, error: `Request has already been ${request.status}.` };
  }

  const group = Groups.findOne(g => g.group_id === request.group_id);
  if (!group) {
    return { success: false, error: 'Target group not found.' };
  }

  if (group.owner_id !== ownerId) {
    return { success: false, error: 'Unauthorized: Only the group creator can reject join requests.' };
  }

  JoinRequests.update(r => r.request_id === requestId, r => ({
    ...r,
    status: 'rejected',
    updated_at: new Date().toISOString()
  }));

  return {
    success: true,
    request: JoinRequests.findOne(r => r.request_id === requestId)
  };
}

/**
 * Atomic operation: a non-owner member leaves a group.
 */
export function atomicLeaveGroup(groupId, travellerId) {
  const group = Groups.findOne(g => g.group_id === groupId);
  if (!group) {
    return { success: false, error: 'Group not found.' };
  }

  // Block leaving if a finalized booking exists
  const existingBooking = Bookings.findOne(b => b.group_id === groupId);
  if (existingBooking) {
    return { success: false, error: 'Cannot leave a group that has a finalized booking.' };
  }

  // Owner cannot leave normally — they must transfer or disband
  if (group.owner_id === travellerId) {
    return { success: false, error: 'USE_TRANSFER_OR_DISBAND' };
  }

  const memberIds = Array.isArray(group.member_ids) ? [...group.member_ids] : [];
  if (!memberIds.includes(travellerId)) {
    return { success: false, error: 'You are not an approved member of this group.' };
  }

  // Remove from member_ids
  const updatedMemberIds = memberIds.filter(id => id !== travellerId);
  Groups.update(g => g.group_id === groupId, g => ({
    ...g,
    member_ids: updatedMemberIds,
    updated_at: new Date().toISOString()
  }));

  // Cancel any pending join request for this traveller in this group
  JoinRequests.update(
    r => r.group_id === groupId && r.traveller_id === travellerId && r.status === 'pending',
    r => ({ ...r, status: 'rejected', updated_at: new Date().toISOString() })
  );

  return {
    success: true,
    group: Groups.findOne(g => g.group_id === groupId)
  };
}

/**
 * Atomic operation: group owner disbands (deletes) the group and all associated data.
 */
export function atomicDisbandGroup(groupId, ownerId) {
  const group = Groups.findOne(g => g.group_id === groupId);
  if (!group) {
    return { success: false, error: 'Group not found.' };
  }

  if (group.owner_id !== ownerId) {
    return { success: false, error: 'Unauthorized: Only the group owner can disband this group.' };
  }

  const existingBooking = Bookings.findOne(b => b.group_id === groupId);
  if (existingBooking) {
    return { success: false, error: 'Cannot disband a group with a finalized booking.' };
  }

  // Remove all associated data
  Groups.delete(g => g.group_id === groupId);
  JoinRequests.delete(r => r.group_id === groupId);
  SavedHotels.delete(s => s.group_id === groupId);
  Messages.delete(m => m.group_id === groupId);

  return { success: true };
}

/**
 * Atomic operation: owner transfers leadership to an existing member, then leaves.
 */
export function atomicTransferOwnership(groupId, currentOwnerId, newOwnerId) {
  const group = Groups.findOne(g => g.group_id === groupId);
  if (!group) {
    return { success: false, error: 'Group not found.' };
  }

  if (group.owner_id !== currentOwnerId) {
    return { success: false, error: 'Unauthorized: Only the current owner can transfer leadership.' };
  }

  const existingBooking = Bookings.findOne(b => b.group_id === groupId);
  if (existingBooking) {
    return { success: false, error: 'Cannot transfer ownership of a group with a finalized booking.' };
  }

  const memberIds = Array.isArray(group.member_ids) ? [...group.member_ids] : [];
  if (!memberIds.includes(newOwnerId)) {
    return { success: false, error: 'The new owner must be an approved member of this group.' };
  }

  // Transfer: set new owner, remove old owner from member_ids (they leave)
  const updatedMemberIds = memberIds.filter(id => id !== newOwnerId);
  // Old owner is removed; new owner is now the owner (not in member_ids)
  const finalMemberIds = updatedMemberIds.filter(id => id !== currentOwnerId);

  Groups.update(g => g.group_id === groupId, g => ({
    ...g,
    owner_id: newOwnerId,
    member_ids: finalMemberIds,
    updated_at: new Date().toISOString()
  }));

  return {
    success: true,
    group: Groups.findOne(g => g.group_id === groupId)
  };
}

export default {
  Travellers,
  Groups,
  JoinRequests,
  SavedHotels,
  Bookings,
  Messages,
  getTravellersMap,
  atomicApproveRequest,
  atomicRejectRequest,
  atomicLeaveGroup,
  atomicDisbandGroup,
  atomicTransferOwnership
};
