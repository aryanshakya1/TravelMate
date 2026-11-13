import { Travellers } from '../models/db.js';
import { normalizeInterests } from '../services/matchingEngine.js';

export const registerTraveller = (req, res) => {
  try {
    const { name, age, gender, home_city, homeCity, home_airport, homeAirport, interests, gender_preference, genderPreference } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Traveller name is required.' });
    }

    const finalGender = (gender || '').trim().toUpperCase();
    if (!['FEMALE', 'MALE'].includes(finalGender)) {
      return res.status(400).json({ success: false, error: 'Gender must be either FEMALE or MALE.' });
    }

    const finalPreference = (gender_preference || genderPreference || 'ANY').trim().toUpperCase();
    if (!['ANY', 'SAME_GENDER'].includes(finalPreference)) {
      return res.status(400).json({ success: false, error: 'Gender preference must be ANY or SAME_GENDER.' });
    }

    const finalCity = (home_city || homeCity || '').trim();
    if (!finalCity) {
      return res.status(400).json({ success: false, error: 'Home city is required.' });
    }

    const parsedInterests = normalizeInterests(interests);
    if (parsedInterests.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one interest is required.' });
    }

    // Generate unique ID: T-xxx
    const allTravellers = Travellers.find();
    const maxNum = allTravellers.reduce((max, t) => {
      const match = t.traveller_id && t.traveller_id.match(/^T-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);

    const nextId = `T-${String(maxNum + 1).padStart(3, '0')}`;

    const newTraveller = {
      traveller_id: nextId,
      name: name.trim(),
      age: age ? Number(age) : 28,
      gender: finalGender,
      home_city: finalCity,
      home_airport: (home_airport || homeAirport || 'BLR').trim().toUpperCase(),
      interests: parsedInterests,
      gender_preference: finalPreference,
      created_at: new Date().toISOString()
    };

    Travellers.insert(newTraveller);

    res.status(201).json({
      success: true,
      traveller: newTraveller
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getTravellers = (req, res) => {
  try {
    const list = Travellers.find();
    res.json({
      success: true,
      count: list.length,
      travellers: list
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getTravellerById = (req, res) => {
  try {
    const { id } = req.params;
    const traveller = Travellers.findOne(t => t.traveller_id === id);
    if (!traveller) {
      return res.status(404).json({ success: false, error: 'Traveller not found.' });
    }
    res.json({
      success: true,
      traveller
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
