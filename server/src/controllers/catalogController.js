import { getDestinations, getSupportedCities, getInterests } from '../services/catalogService.js';

export const getDestinationsHandler = (req, res) => {
  try {
    const destinations = getDestinations();
    const cities = getSupportedCities();
    res.json({
      success: true,
      destinations,
      supportedCities: cities
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getInterestsHandler = (req, res) => {
  try {
    const interests = getInterests();
    res.json({
      success: true,
      interests
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
