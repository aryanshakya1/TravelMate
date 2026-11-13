import { Bookings, Groups, Travellers, getTravellersMap } from '../models/db.js';
import { getRooms, getHotels, getAvailability } from '../services/catalogService.js';
import { getStayNights, checkRoomAvailability, calculateEqualCostAllocations } from '../services/hotelPricingService.js';

export const finalizeMockBooking = (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { room_id, roomId, traveller_id, travellerId } = req.body;

    const group = Groups.findOne(g => g.group_id === groupId);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    const memberId = (traveller_id || travellerId || '').trim();
    if (!memberId) {
      return res.status(400).json({ success: false, error: 'Member traveller ID is required to finalize booking.' });
    }

    // Only approved group members can finalize booking
    if (!(group.member_ids || []).includes(memberId)) {
      return res.status(403).json({ success: false, error: 'Only approved members can finalize a group booking.' });
    }

    // Prevent duplicate booking
    const existing = Bookings.findOne(b => b.group_id === groupId);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'A booking has already been finalized for this group. Group bookings are locked.',
        booking: existing
      });
    }

    const targetRoomId = (room_id || roomId || '').trim();
    if (!targetRoomId) {
      return res.status(400).json({ success: false, error: 'Room selection is required.' });
    }

    const rooms = getRooms();
    const hotels = getHotels();
    const room = rooms.find(r => r.room_id === targetRoomId);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Selected room not found in catalog.' });
    }

    const hotel = hotels.find(h => h.hotel_id === room.hotel_id);
    if (!hotel) {
      return res.status(404).json({ success: false, error: 'Selected hotel not found in catalog.' });
    }

    // Verify stay nights and availability
    const stayNights = getStayNights(group.check_in, group.check_out);
    const nightsCount = stayNights.length;
    if (nightsCount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid group stay dates.' });
    }

    const travellersMap = getTravellersMap();
    const members = (group.member_ids || []).map(id => travellersMap[id] || { traveller_id: id, name: id });
    const membersCount = members.length;

    const maxAdults = Math.max(1, room.max_adults || 1);
    const roomsNeeded = Math.ceil(membersCount / maxAdults);

    const allAvailability = getAvailability();
    const availabilityMap = new Map();
    for (const item of allAvailability) {
      availabilityMap.set(`${item.room_id}_${item.date}`, item);
    }

    const availCheck = checkRoomAvailability(room.room_id, stayNights, roomsNeeded, availabilityMap);
    if (!availCheck.available) {
      return res.status(400).json({
        success: false,
        error: `Insufficient room inventory during the stay (${group.check_in} to ${group.check_out}). Required: ${roomsNeeded} rooms.`
      });
    }

    const nightlyAmount = room.price_per_night ? room.price_per_night.amount : 0;
    const totalCost = nightlyAmount * nightsCount * roomsNeeded;
    const costPerPerson = Math.round(totalCost / membersCount);
    const allocations = calculateEqualCostAllocations(totalCost, members);

    // Generate unique booking reference: TM-XXXXXX
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const bookingRef = `TM-${code}`;

    const newBooking = {
      booking_id: `BK-${Date.now()}`,
      booking_reference: bookingRef,
      group_id: groupId,
      group_name: group.name,
      hotel_id: hotel.hotel_id,
      hotel_name: hotel.name,
      hotel_city: hotel.city,
      hotel_area: hotel.area,
      hotel_image: hotel.image,
      room_id: room.room_id,
      room_name: room.name,
      room_type: room.room_type,
      rooms_needed: roomsNeeded,
      check_in: group.check_in,
      check_out: group.check_out,
      nights_count: nightsCount,
      members_count: membersCount,
      member_ids: group.member_ids,
      member_allocations: allocations,
      total_cost: totalCost,
      cost_per_person: costPerPerson,
      status: 'CONFIRMED',
      finalized_by: memberId,
      finalized_at: new Date().toISOString(),
      disclaimer: 'This is a mock booking. No real hotel reservation or payment occurred.'
    };

    Bookings.insert(newBooking);

    res.status(201).json({
      success: true,
      message: 'Group mock booking finalized successfully!',
      booking: newBooking
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getGroupBooking = (req, res) => {
  try {
    const { id: groupId } = req.params;
    const booking = Bookings.findOne(b => b.group_id === groupId);

    if (!booking) {
      return res.json({
        success: true,
        hasBooking: false,
        booking: null
      });
    }

    res.json({
      success: true,
      hasBooking: true,
      booking
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
