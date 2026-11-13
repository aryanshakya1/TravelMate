/**
 * TravelMate Frontend API Service
 * Communicates with backend REST API endpoints.
 */

const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}: Request failed`);
    }
    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err.message);
    throw err;
  }
}

export const api = {
  // Catalog
  getDestinations: () => request('/destinations'),
  getInterests: () => request('/interests'),

  // Travellers
  getTravellers: () => request('/travellers'),
  getTravellerById: (id) => request(`/travellers/${id}`),
  registerTraveller: (profileData) => request('/travellers', {
    method: 'POST',
    body: JSON.stringify(profileData)
  }),
  getTravellerGroups: (travellerId) => request(`/travellers/${travellerId}/groups`),

  // Groups
  createGroup: (groupData) => request('/groups', {
    method: 'POST',
    body: JSON.stringify(groupData)
  }),
  getGroups: () => request('/groups'),
  getGroupById: (id) => request(`/groups/${id}`),

  // Matching Engine
  findMatches: (searchCriteria) => request('/matches', {
    method: 'POST',
    body: JSON.stringify(searchCriteria)
  }),

  // Join Requests
  expressInterest: (groupId, payload) => request(`/groups/${groupId}/requests`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getGroupRequests: (groupId) => request(`/groups/${groupId}/requests`),
  updateRequestStatus: (requestId, payload) => request(`/requests/${requestId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  }),

  // Hotels & Pricing
  getGroupHotels: (groupId) => request(`/groups/${groupId}/hotels`),
  saveHotelOption: (groupId, payload) => request(`/groups/${groupId}/saved-hotels`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getSavedHotels: (groupId) => request(`/groups/${groupId}/saved-hotels`),
  removeSavedHotel: (groupId, savedId, travellerId) => {
    const q = travellerId ? `?traveller_id=${encodeURIComponent(travellerId)}` : '';
    return request(`/groups/${groupId}/saved-hotels/${savedId}${q}`, { method: 'DELETE' });
  },

  // Mock Booking
  finalizeBooking: (groupId, payload) => request(`/groups/${groupId}/bookings`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getGroupBooking: (groupId) => request(`/groups/${groupId}/bookings`),

  // Messages (Stretch S1)
  getMessages: (groupId) => request(`/groups/${groupId}/messages`),
  sendMessage: (groupId, payload) => request(`/groups/${groupId}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  // Group Membership: Leave, Disband, Transfer Ownership
  leaveGroup: (groupId, travellerId) => request(`/groups/${groupId}/members/${travellerId}`, {
    method: 'DELETE'
  }),
  disbandGroup: (groupId, ownerId) => request(`/groups/${groupId}?owner_id=${encodeURIComponent(ownerId)}`, {
    method: 'DELETE'
  }),
  transferOwnership: (groupId, payload) => request(`/groups/${groupId}/owner`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })
};

export default api;
