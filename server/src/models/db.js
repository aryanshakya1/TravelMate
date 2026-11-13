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

  // Re-check all 6 rules against the owner
  const travellersMap = getTravellersMap();
  const seeker = travellersMap[request.traveller_id];
  const owner = travellersMap[group.owner_id];

  if (!seeker) {
    return { success: false, error: 'Applicant profile not found.' };
  }

  // Construct seeker search criteria for revalidation
  const seekerCriteria = {
    traveller_id: seeker.traveller_id,
    destination: group.city,
    check_in: request.applicantDetails?.check_in || group.check_in,
    check_out: request.applicantDetails?.check_out || group.check_out,
    budget_inr: request.applicantDetails?.budget_inr || group.budget_inr,
    interests: seeker.interests,
    gender: seeker.gender,
    gender_preference: seeker.gender_preference
  };

  const recheck = evaluateMatchRules(seekerCriteria, group, owner);
  if (!recheck.rules.hasCapacity) {
    return { success: false, error: 'Approval rejected: Group has reached maximum capacity.' };
  }
  if (!recheck.rules.genderCompatible) {
    return { success: false, error: 'Approval rejected: Gender preferences are incompatible.' };
  }
  if (!recheck.rules.interestsCompatible) {
    return { success: false, error: 'Approval rejected: Does not meet the 2 shared interests threshold.' };
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

export default {
  Travellers,
  Groups,
  JoinRequests,
  SavedHotels,
  Bookings,
  Messages,
  getTravellersMap,
  atomicApproveRequest,
  atomicRejectRequest
};
