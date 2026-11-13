import { Router } from 'express';
import { getDestinationsHandler, getInterestsHandler } from '../controllers/catalogController.js';
import { registerTraveller, getTravellers, getTravellerById } from '../controllers/travellerController.js';
import { createGroup, getGroups, getGroupById, getTravellerGroups } from '../controllers/groupController.js';
import { findMatchingGroups } from '../controllers/matchingController.js';
import { createJoinRequest, getGroupRequests, updateRequestStatus } from '../controllers/requestController.js';
import { getHotelsForGroup, saveHotelOption, getSavedHotels, removeSavedHotel } from '../controllers/hotelController.js';
import { finalizeMockBooking, getGroupBooking } from '../controllers/bookingController.js';
import { getGroupMessages, sendGroupMessage } from '../controllers/messageController.js';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TravelMate Backend API',
    timestamp: new Date().toISOString()
  });
});

// Catalog Endpoints
router.get('/destinations', getDestinationsHandler);
router.get('/interests', getInterestsHandler);

// Traveller Endpoints
router.post('/travellers', registerTraveller);
router.get('/travellers', getTravellers);
router.get('/travellers/:id', getTravellerById);
router.get('/travellers/:id/groups', getTravellerGroups);

// Group Endpoints
router.post('/groups', createGroup);
router.get('/groups', getGroups);
router.get('/groups/:id', getGroupById);

// Matching Engine Endpoint (6 strict rules + explainable scoring + diagnostics)
router.post('/matches', findMatchingGroups);

// Group Requests (Seeker interest & Creator approvals)
router.post('/groups/:id/requests', createJoinRequest);
router.get('/groups/:id/requests', getGroupRequests);
router.patch('/requests/:id', updateRequestStatus);

// Group Hotels (Search & Shortlisting)
router.get('/groups/:id/hotels', getHotelsForGroup);
router.post('/groups/:id/saved-hotels', saveHotelOption);
router.get('/groups/:id/saved-hotels', getSavedHotels);
router.delete('/groups/:id/saved-hotels/:savedId', removeSavedHotel);

// Mock Booking Finalization
router.post('/groups/:id/bookings', finalizeMockBooking);
router.get('/groups/:id/bookings', getGroupBooking);

// Group Collaboration Chat (Stretch S1)
router.get('/groups/:id/messages', getGroupMessages);
router.post('/groups/:id/messages', sendGroupMessage);

export default router;
