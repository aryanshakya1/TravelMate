import { Groups, SavedHotels, Travellers, getTravellersMap } from '../models/db.js';
import { searchHotelsForGroup, recalculateDynamicCostSplit } from '../services/hotelPricingService.js';
import { getRooms, getHotels } from '../services/catalogService.js';

export const getHotelsForGroup = (req, res) => {
  try {
    const { id: groupId } = req.params;
    const group = Groups.findOne(g => g.group_id === groupId);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    const travellersMap = getTravellersMap();
    const members = (group.member_ids || []).map(id => travellersMap[id] || { traveller_id: id });

    const searchResult = searchHotelsForGroup(
      group.city,
      group.check_in,
      group.check_out,
      members
    );

    // Annotate with saved status from this group's shortlist
    const savedList = SavedHotels.find(s => s.group_id === groupId);
    const savedRoomMap = new Map();
    for (const s of savedList) {
      savedRoomMap.set(s.room_id, s);
    }

    const annotatedOptions = searchResult.options.map(opt => {
      const saved = savedRoomMap.get(opt.roomId);
      return {
        ...opt,
        isSavedByGroup: Boolean(saved),
        savedId: saved ? saved.saved_id : null,
        savedByTravellers: saved ? saved.saved_by_traveller_ids : []
      };
    });

    res.json({
      ...searchResult,
      options: annotatedOptions
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const saveHotelOption = (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { hotel_id, hotelId, room_id, roomId, traveller_id, travellerId } = req.body;

    const group = Groups.findOne(g => g.group_id === groupId);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    const finalTravellerId = (traveller_id || travellerId || '').trim();
    if (!finalTravellerId) {
      return res.status(400).json({ success: false, error: 'Traveller ID is required.' });
    }

    // Only approved members can save hotels
    if (!(group.member_ids || []).includes(finalTravellerId)) {
      return res.status(403).json({ success: false, error: 'Only approved group members can shortlist hotels.' });
    }

    const finalRoomId = (room_id || roomId || '').trim();
    const finalHotelId = (hotel_id || hotelId || '').trim();

    const rooms = getRooms();
    const hotels = getHotels();
    const room = rooms.find(r => r.room_id === finalRoomId);
    const hotel = hotels.find(h => h.hotel_id === (finalHotelId || (room ? room.hotel_id : '')));

    if (!room || !hotel) {
      return res.status(404).json({ success: false, error: 'Hotel or Room type not found in catalog.' });
    }

    const membersCount = Math.max(1, (group.member_ids || []).length);
    const recalc = recalculateDynamicCostSplit(room.room_id, group.check_in, group.check_out, membersCount);

    // Check if option is already saved for this group
    const existing = SavedHotels.findOne(s => s.group_id === groupId && s.room_id === finalRoomId);
    if (existing) {
      const savedBy = new Set(existing.saved_by_traveller_ids || []);
      savedBy.add(finalTravellerId);

      SavedHotels.update(s => s.saved_id === existing.saved_id, s => ({
        ...s,
        saved_by_traveller_ids: Array.from(savedBy),
        preference_count: savedBy.size,
        total_cost: recalc.totalCost,
        cost_per_person: recalc.costPerPerson,
        rooms_needed: recalc.roomsNeeded,
        updated_at: new Date().toISOString()
      }));

      return res.json({
        success: true,
        message: 'Saved to group shortlist.',
        savedHotel: SavedHotels.findOne(s => s.saved_id === existing.saved_id)
      });
    }

    const nextSavedId = `SH-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    const newSaved = {
      saved_id: nextSavedId,
      group_id: groupId,
      hotel_id: hotel.hotel_id,
      hotel_name: hotel.name,
      hotel_city: hotel.city,
      hotel_area: hotel.area,
      hotel_rating: hotel.rating,
      hotel_image: hotel.image,
      room_id: room.room_id,
      room_name: room.name,
      room_type: room.room_type,
      max_adults: room.max_adults,
      rooms_needed: recalc.roomsNeeded,
      nights_count: recalc.nightsCount,
      total_cost: recalc.totalCost,
      cost_per_person: recalc.costPerPerson,
      saved_by_traveller_ids: [finalTravellerId],
      preference_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    SavedHotels.insert(newSaved);

    res.status(201).json({
      success: true,
      message: 'Hotel option saved to group shortlist.',
      savedHotel: newSaved
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getSavedHotels = (req, res) => {
  try {
    const { id: groupId } = req.params;
    const list = SavedHotels.find(s => s.group_id === groupId);
    const travellersMap = getTravellersMap();

    const group = Groups.findOne(g => g.group_id === groupId);
    const currentMembersCount = group ? Math.max(1, (group.member_ids || []).length) : 1;

    // Recalculate dynamic cost split if group size has changed since save!
    const enriched = list.map(item => {
      let dynamicTotal = item.total_cost;
      let dynamicPerPerson = item.cost_per_person;
      let dynamicRoomsNeeded = item.rooms_needed;

      try {
        if (group) {
          const recalc = recalculateDynamicCostSplit(item.room_id, group.check_in, group.check_out, currentMembersCount);
          dynamicTotal = recalc.totalCost;
          dynamicPerPerson = recalc.costPerPerson;
          dynamicRoomsNeeded = recalc.roomsNeeded;
        }
      } catch (e) {
        // use stored values if recalculation fails
      }

      const savedByNames = (item.saved_by_traveller_ids || []).map(id => {
        const t = travellersMap[id];
        return t ? t.name : id;
      });

      return {
        ...item,
        rooms_needed: dynamicRoomsNeeded,
        total_cost: dynamicTotal,
        cost_per_person: dynamicPerPerson,
        current_members_count: currentMembersCount,
        saved_by_names: savedByNames
      };
    });

    res.json({
      success: true,
      count: enriched.length,
      savedHotels: enriched
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const removeSavedHotel = (req, res) => {
  try {
    const { id: groupId, savedId } = req.params;
    const { traveller_id, travellerId } = req.query;

    const existing = SavedHotels.findOne(s => s.saved_id === savedId && s.group_id === groupId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Saved option not found.' });
    }

    const userToRemove = (traveller_id || travellerId || '').trim();

    if (userToRemove && existing.saved_by_traveller_ids.length > 1) {
      // Remove only this user from preference
      const updated = existing.saved_by_traveller_ids.filter(id => id !== userToRemove);
      SavedHotels.update(s => s.saved_id === savedId, s => ({
        ...s,
        saved_by_traveller_ids: updated,
        preference_count: updated.length,
        updated_at: new Date().toISOString()
      }));
      return res.json({ success: true, message: 'Removed your preference.' });
    }

    // Otherwise delete the option completely from group shortlist
    SavedHotels.delete(s => s.saved_id === savedId);

    res.json({
      success: true,
      message: 'Hotel option removed from shortlist.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
