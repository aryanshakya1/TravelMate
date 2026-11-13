import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root is 3 levels up from services: server/src/services -> TravelMate
const PROJECT_ROOT = path.resolve(__dirname, '../../../');

const DATA_CATALOG_DIR = path.join(PROJECT_ROOT, 'data', 'catalog');
const DATA_PROBLEM3_DIR = path.join(PROJECT_ROOT, 'data', 'problem-3');

// Cached in-memory reads for fast queries (read-only catalog)
let destinationsCache = null;
let hotelsCache = null;
let roomsCache = null;
let availabilityCache = null;
let interestsCache = null;
let seedTravellersCache = null;
let seedGroupsCache = null;

// Read JSON helper
function readJsonFileSync(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    throw err;
  }
}

export const getDestinations = () => {
  if (!destinationsCache) {
    destinationsCache = readJsonFileSync(path.join(DATA_CATALOG_DIR, 'destinations.json'));
  }
  return destinationsCache;
};

export const getSupportedCities = () => {
  const dest = getDestinations();
  const cities = [];
  if (dest && dest.countries) {
    for (const country of dest.countries) {
      if (country.cities) {
        for (const city of country.cities) {
          cities.push({
            name: city.name,
            country: country.name,
            countryCode: country.code,
            timezone: country.timezone,
            airports: city.airports || []
          });
        }
      }
    }
  }
  return cities;
};

export const getInterests = () => {
  if (!interestsCache) {
    interestsCache = readJsonFileSync(path.join(DATA_PROBLEM3_DIR, 'interests.json'));
  }
  return interestsCache;
};

export const getHotels = () => {
  if (!hotelsCache) {
    hotelsCache = readJsonFileSync(path.join(DATA_CATALOG_DIR, 'hotels.json'));
  }
  return hotelsCache;
};

export const getRooms = () => {
  if (!roomsCache) {
    roomsCache = readJsonFileSync(path.join(DATA_CATALOG_DIR, 'rooms.json'));
  }
  return roomsCache;
};

export const getAvailability = () => {
  if (!availabilityCache) {
    availabilityCache = readJsonFileSync(path.join(DATA_CATALOG_DIR, 'availability.json'));
  }
  return availabilityCache;
};

export const getSeedTravellers = () => {
  if (!seedTravellersCache) {
    seedTravellersCache = readJsonFileSync(path.join(DATA_PROBLEM3_DIR, 'travellers.json'));
  }
  return seedTravellersCache;
};

export const getSeedGroups = () => {
  if (!seedGroupsCache) {
    seedGroupsCache = readJsonFileSync(path.join(DATA_PROBLEM3_DIR, 'groups.json'));
  }
  return seedGroupsCache;
};

export default {
  getDestinations,
  getSupportedCities,
  getInterests,
  getHotels,
  getRooms,
  getAvailability,
  getSeedTravellers,
  getSeedGroups
};
