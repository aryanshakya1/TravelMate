import { Groups, Travellers, Bookings, getTravellersMap } from '../models/db.js';
import { getSupportedCities } from '../services/catalogService.js';
import { daysBetween } from '../services/matchingEngine.js';

export const createGroup = (req, res) => {
  try {
    const { name, owner_id, ownerId, city, destination, check_in, checkIn, check_out, checkOut, max_size, maxSize, budget_inr, budget, itinerary } = req.body;

    const finalOwnerId = (owner_id || ownerId || '').trim();
    if (!finalOwnerId) {
      return res.status(400).json({ success: false, error: 'Group creator/owner ID is required.' });
    }

    const owner = Travellers.findOne(t => t.traveller_id === finalOwnerId);
    if (!owner) {
      return res.status(404).json({ success: false, error: `Creator with ID ${finalOwnerId} does not exist.` });
    }

    const groupName = (name || '').trim();
    if (!groupName) {
      return res.status(400).json({ success: false, error: 'Group name is required.' });
    }

    const finalCity = (city || destination || '').trim();
    const validCities = getSupportedCities().map(c => c.name.toLowerCase());
    if (!finalCity || !validCities.includes(finalCity.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Unsupported destination '${finalCity}'. Supported cities are: Tokyo, Kyoto, Osaka, Dubai, Abu Dhabi.`
      });
    }

    // Capitalize city name properly from catalog
    const matchedCity = getSupportedCities().find(c => c.name.toLowerCase() === finalCity.toLowerCase()).name;

    const finalCheckIn = (check_in || checkIn || '').trim();
    const finalCheckOut = (check_out || checkOut || '').trim();

    if (!finalCheckIn || !finalCheckOut) {
      return res.status(400).json({ success: false, error: 'Check-in and check-out dates are required.' });
    }

    // Date range validation: 2027-04-01 to 2027-04-20
    const MIN_DATE = '2027-04-01';
    const MAX_DATE = '2027-04-20';

    if (finalCheckIn < MIN_DATE || finalCheckIn >= MAX_DATE) {
      return res.status(400).json({
        success: false,
        error: `Check-in date ${finalCheckIn} is outside the supported catalog window (April 1–20, 2027).`
      });
    }

    if (finalCheckOut <= finalCheckIn || finalCheckOut > MAX_DATE) {
      return res.status(400).json({
        success: false,
        error: `Check-out date ${finalCheckOut} must be after check-in and no later than April 20, 2027.`
      });
    }

    const nights = daysBetween(finalCheckIn, finalCheckOut);
    if (nights < 1) {
      return res.status(400).json({ success: false, error: 'A trip must be at least 1 night.' });
    }

    const finalMaxSize = Number(max_size || maxSize || 3);
    if (isNaN(finalMaxSize) || finalMaxSize < 1 || finalMaxSize > 4) {
      return res.status(400).json({ success: false, error: 'Maximum group size must be between 1 and 4.' });
    }

    const finalBudget = Number(budget_inr || budget || 0);
    if (isNaN(finalBudget) || finalBudget <= 0) {
      return res.status(400).json({ success: false, error: 'Approximate budget must be a positive amount in INR.' });
    }

    // Generate unique group ID
    const allGroups = Groups.find();
    const maxNum = allGroups.reduce((max, g) => {
      const match = g.group_id && g.group_id.match(/^G-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const nextGroupId = `G-${String(maxNum + 1).padStart(2, '0')}`;

    const newGroup = {
      group_id: nextGroupId,
      name: groupName,
      owner_id: finalOwnerId,
      member_ids: [finalOwnerId],
      city: matchedCity,
      check_in: finalCheckIn,
      check_out: finalCheckOut,
      max_size: finalMaxSize,
      budget_inr: Math.round(finalBudget),
      itinerary: (itinerary || '').trim(),
      created_at: new Date().toISOString()
    };

    Groups.insert(newGroup);

    res.status(201).json({
      success: true,
      message: 'Group trip post created successfully.',
      group: newGroup
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getGroups = (req, res) => {
  try {
    const travellersMap = getTravellersMap();
    const allBookings = Bookings.find();
    const bookingsByGroup = {};
    for (const b of allBookings) {
      bookingsByGroup[b.group_id] = b;
    }

    const groups = Groups.find().map(g => {
      const owner = travellersMap[g.owner_id] || null;
      const members = (g.member_ids || []).map(id => travellersMap[id] || { traveller_id: id });
      const booking = bookingsByGroup[g.group_id] || null;
      return {
        ...g,
        owner,
        members,
        currentMembersCount: (g.member_ids || []).length,
        availableSeats: Math.max(0, g.max_size - (g.member_ids || []).length),
        isFull: (g.member_ids || []).length >= g.max_size,
        hasFinalizedBooking: Boolean(booking),
        finalizedBooking: booking
      };
    });

    res.json({
      success: true,
      count: groups.length,
      groups
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getGroupById = (req, res) => {
  try {
    const { id } = req.params;
    const group = Groups.findOne(g => g.group_id === id);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    const travellersMap = getTravellersMap();
    const owner = travellersMap[group.owner_id] || null;
    const members = (group.member_ids || []).map(mid => travellersMap[mid] || { traveller_id: mid });
    const booking = Bookings.findOne(b => b.group_id === group.group_id);

    res.json({
      success: true,
      group: {
        ...group,
        owner,
        members,
        currentMembersCount: (group.member_ids || []).length,
        availableSeats: Math.max(0, group.max_size - (group.member_ids || []).length),
        isFull: (group.member_ids || []).length >= group.max_size,
        hasFinalizedBooking: Boolean(booking),
        finalizedBooking: booking
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getTravellerGroups = (req, res) => {
  try {
    const { id } = req.params;
    const allGroups = Groups.find();
    const myGroups = allGroups.filter(g => (g.member_ids || []).includes(id));
    const travellersMap = getTravellersMap();

    const result = myGroups.map(g => ({
      ...g,
      owner: travellersMap[g.owner_id] || null,
      isOwner: g.owner_id === id,
      currentMembersCount: (g.member_ids || []).length
    }));

    res.json({
      success: true,
      count: result.length,
      groups: result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
