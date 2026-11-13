import { Groups, Travellers, getTravellersMap } from '../models/db.js';
import { findMatches, normalizeInterests } from '../services/matchingEngine.js';
import { getSupportedCities } from '../services/catalogService.js';

export const findMatchingGroups = (req, res) => {
  try {
    const {
      traveller_id,
      travellerId,
      destination,
      city,
      check_in,
      checkIn,
      check_out,
      checkOut,
      budget,
      budget_inr,
      budgetInr,
      interests,
      gender,
      gender_preference,
      genderPreference
    } = req.body;

    const targetCity = (destination || city || '').trim();
    if (!targetCity) {
      return res.status(400).json({ success: false, error: 'Destination city is required.' });
    }

    const validCities = getSupportedCities().map(c => c.name.toLowerCase());
    if (!validCities.includes(targetCity.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Destination '${targetCity}' is not supported. Supported cities are: Tokyo, Kyoto, Osaka, Dubai, Abu Dhabi.`
      });
    }

    const finalCheckIn = (check_in || checkIn || '').trim();
    const finalCheckOut = (check_out || checkOut || '').trim();

    if (!finalCheckIn || !finalCheckOut) {
      return res.status(400).json({ success: false, error: 'Check-in and check-out dates are required.' });
    }

    if (finalCheckOut <= finalCheckIn) {
      return res.status(400).json({ success: false, error: 'Check-out date must be strictly after check-in date.' });
    }

    // Supported catalog date window check
    const MIN_DATE = '2027-04-01';
    const MAX_DATE = '2027-04-20';

    if (finalCheckIn < MIN_DATE || finalCheckOut > MAX_DATE) {
      return res.status(400).json({
        success: false,
        error: `Travel dates must be within the supported catalog window (April 1 to April 20, 2027).`
      });
    }

    const finalBudget = Number(budget_inr || budgetInr || budget || 0);
    if (isNaN(finalBudget) || finalBudget <= 0) {
      return res.status(400).json({ success: false, error: 'Budget must be a positive number in INR.' });
    }

    const parsedInterests = normalizeInterests(interests);
    if (parsedInterests.length === 0) {
      return res.status(400).json({ success: false, error: 'Please select at least one interest.' });
    }

    const finalGender = (gender || 'FEMALE').trim().toUpperCase();
    const finalPref = (gender_preference || genderPreference || 'ANY').trim().toUpperCase();

    // Construct seeker criteria
    const seeker = {
      traveller_id: (traveller_id || travellerId || '').trim(),
      destination: targetCity,
      check_in: finalCheckIn,
      check_out: finalCheckOut,
      budget_inr: Math.round(finalBudget),
      interests: parsedInterests,
      gender: finalGender,
      gender_preference: finalPref
    };

    const allGroups = Groups.find();
    const travellersMap = getTravellersMap();

    const result = findMatches(seeker, allGroups, travellersMap);

    res.json({
      success: true,
      seeker,
      totalMatches: result.totalMatches,
      matches: result.matches,
      diagnostics: result.diagnostics
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
