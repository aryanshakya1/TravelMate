/**
 * TravelMate Hotel Pricing & Availability Service
 * Computes exact room requirements, multi-night availability, total stay pricing,
 * and deterministic equal cost splits across group members.
 */

import { getHotels, getRooms, getAvailability } from './catalogService.js';
import { daysBetween, parseDateUtc } from './matchingEngine.js';

/**
 * Generates an array of date strings (YYYY-MM-DD) for every night of the stay.
 * The check-out day is exclusive (not a night stayed).
 */
export function getStayNights(checkInStr, checkOutStr) {
  const nights = [];
  if (!checkInStr || !checkOutStr) return nights;

  let current = new Date(parseDateUtc(checkInStr));
  const end = new Date(parseDateUtc(checkOutStr));

  while (current < end) {
    const y = current.getUTCFullYear();
    const m = String(current.getUTCMonth() + 1).padStart(2, '0');
    const d = String(current.getUTCDate()).padStart(2, '0');
    nights.push(`${y}-${m}-${d}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return nights;
}

/**
 * Deterministically allocates an exact total cost among members to the whole rupee.
 * Any remainder is distributed to the first remainder members.
 */
export function calculateEqualCostAllocations(totalCost, members) {
  const count = Math.max(1, members.length);
  const baseShare = Math.floor(totalCost / count);
  const remainder = totalCost - (baseShare * count);

  return members.map((member, index) => {
    const share = index < remainder ? baseShare + 1 : baseShare;
    return {
      travellerId: typeof member === 'string' ? member : (member.travellerId || member.traveller_id || `M-${index + 1}`),
      name: typeof member === 'object' && member.name ? member.name : undefined,
      shareInr: share
    };
  });
}

/**
 * Checks if a room has at least `roomsNeeded` free rooms on every single night of `stayNights`.
 * Returns { available: boolean, minRoomsLeft: number, dailyInventory: Array }
 */
export function checkRoomAvailability(roomId, stayNights, roomsNeeded, availabilityMap) {
  let minRoomsLeft = Infinity;
  const dailyInventory = [];

  for (const night of stayNights) {
    const key = `${roomId}_${night}`;
    const entry = availabilityMap.get(key);
    const roomsLeft = entry ? entry.rooms_left : 0;

    dailyInventory.push({ date: night, roomsLeft });

    if (roomsLeft < minRoomsLeft) {
      minRoomsLeft = roomsLeft;
    }

    if (roomsLeft < roomsNeeded) {
      return {
        available: false,
        minRoomsLeft: Math.min(minRoomsLeft, roomsLeft),
        dailyInventory
      };
    }
  }

  return {
    available: true,
    minRoomsLeft: minRoomsLeft === Infinity ? 0 : minRoomsLeft,
    dailyInventory
  };
}

/**
 * Searches hotels in the given city for the specified stay dates and group occupancy.
 */
export function searchHotelsForGroup(city, checkIn, checkOut, members = []) {
  const membersCount = Math.max(1, Array.isArray(members) ? members.length : Number(members) || 1);
  const stayNights = getStayNights(checkIn, checkOut);
  const nightsCount = stayNights.length;

  if (nightsCount <= 0) {
    return {
      success: false,
      error: 'Check-out date must be after check-in date.',
      options: []
    };
  }

  const allHotels = getHotels();
  const allRooms = getRooms();
  const allAvailability = getAvailability();

  // Index availability for fast O(1) lookup by `${room_id}_${date}`
  const availabilityMap = new Map();
  for (const item of allAvailability) {
    availabilityMap.set(`${item.room_id}_${item.date}`, item);
  }

  // Filter hotels by destination city (case-insensitive)
  const targetCity = (city || '').trim().toLowerCase();
  const cityHotels = allHotels.filter(h => (h.city || '').trim().toLowerCase() === targetCity);

  // Group rooms by hotel_id
  const roomsByHotel = new Map();
  for (const room of allRooms) {
    if (!roomsByHotel.has(room.hotel_id)) {
      roomsByHotel.set(room.hotel_id, []);
    }
    roomsByHotel.get(room.hotel_id).push(room);
  }

  const hotelOptions = [];

  for (const hotel of cityHotels) {
    const hotelRooms = roomsByHotel.get(hotel.hotel_id) || [];

    for (const room of hotelRooms) {
      const maxAdults = Math.max(1, room.max_adults || 1);
      const roomsNeeded = Math.ceil(membersCount / maxAdults);

      const avail = checkRoomAvailability(room.room_id, stayNights, roomsNeeded, availabilityMap);

      if (avail.available) {
        const nightlyAmount = room.price_per_night ? room.price_per_night.amount : 0;
        const totalCost = nightlyAmount * nightsCount * roomsNeeded;
        const costPerPerson = Math.round(totalCost / membersCount);

        const memberList = Array.isArray(members) && members.length > 0
          ? members
          : Array.from({ length: membersCount }, (_, i) => ({ travellerId: `Member-${i + 1}` }));

        const allocations = calculateEqualCostAllocations(totalCost, memberList);

        hotelOptions.push({
          hotelId: hotel.hotel_id,
          hotelName: hotel.name,
          city: hotel.city,
          area: hotel.area,
          rating: hotel.rating,
          stars: hotel.stars,
          image: hotel.image,
          familyFriendly: hotel.family_friendly,
          checkInFrom: hotel.check_in_from,
          checkOutUntil: hotel.check_out_until,
          roomId: room.room_id,
          roomType: room.room_type,
          roomName: room.name,
          maxAdults: room.max_adults,
          refundable: room.refundable,
          roomsNeeded,
          stayNightsCount: nightsCount,
          stayNights,
          nightlyPrice: nightlyAmount,
          currency: 'INR',
          totalCost,
          membersCount,
          costPerPerson,
          memberAllocations: allocations,
          minRoomsLeft: avail.minRoomsLeft
        });
      }
    }
  }

  // Sort by rating desc, then totalCost asc
  hotelOptions.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return a.totalCost - b.totalCost;
  });

  return {
    success: true,
    city,
    checkIn,
    checkOut,
    nightsCount,
    membersCount,
    totalOptions: hotelOptions.length,
    options: hotelOptions
  };
}

/**
 * Recalculates cost and room configuration dynamically when group membership count changes.
 */
export function recalculateDynamicCostSplit(roomId, checkIn, checkOut, newMembersCount) {
  const allRooms = getRooms();
  const room = allRooms.find(r => r.room_id === roomId);
  if (!room) {
    throw new Error(`Room with ID ${roomId} not found in catalog.`);
  }

  const count = Math.max(1, Number(newMembersCount) || 1);
  const stayNights = getStayNights(checkIn, checkOut);
  const nightsCount = stayNights.length;
  const maxAdults = Math.max(1, room.max_adults || 1);
  const roomsNeeded = Math.ceil(count / maxAdults);

  const allAvailability = getAvailability();
  const availabilityMap = new Map();
  for (const item of allAvailability) {
    availabilityMap.set(`${item.room_id}_${item.date}`, item);
  }

  const avail = checkRoomAvailability(room.room_id, stayNights, roomsNeeded, availabilityMap);

  const nightlyAmount = room.price_per_night ? room.price_per_night.amount : 0;
  const totalCost = nightlyAmount * nightsCount * roomsNeeded;
  const costPerPerson = Math.round(totalCost / count);

  return {
    roomId: room.room_id,
    roomType: room.room_type,
    roomName: room.name,
    membersCount: count,
    roomsNeeded,
    maxAdults,
    available: avail.available,
    nightsCount,
    nightlyPrice: nightlyAmount,
    totalCost,
    costPerPerson
  };
}

export default {
  getStayNights,
  calculateEqualCostAllocations,
  checkRoomAvailability,
  searchHotelsForGroup,
  recalculateDynamicCostSplit
};
